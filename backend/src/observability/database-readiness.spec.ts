import { createServer, type Socket } from 'node:net';
import { DatabaseReadiness } from './database-readiness';

it('bounds concurrent readiness probes when a database accepts TCP but never replies', async () => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.resume();
    socket.once('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('TEST_ADDRESS');
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `postgresql://synthetic:synthetic@127.0.0.1:${address.port}/synthetic`;
  const readiness = new DatabaseReadiness();
  if (previous === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previous;
  const start = Date.now();
  try {
    expect(
      await Promise.all([
        readiness.check(),
        readiness.check(),
        readiness.check(),
      ]),
    ).toEqual([false, false, false]);
    expect(Date.now() - start).toBeLessThan(3000);
    await readiness.onModuleDestroy();
    const closedBy = Date.now() + 500;
    while (sockets.size && Date.now() < closedBy) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(sockets.size).toBe(0);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it('survives losing an established idle database connection and reconnects', async () => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    let startup = true;
    socket.on('data', () => {
      socket.write(
        Buffer.from(
          startup
            ? '5200000008000000005a0000000549'
            : '430000000d53454c4543542031005a0000000549',
          'hex',
        ),
      );
      startup = false;
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('TEST_ADDRESS');
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `postgresql://synthetic:synthetic@127.0.0.1:${address.port}/synthetic`;
  const readiness = new DatabaseReadiness();
  if (previous === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previous;
  try {
    expect(await readiness.check()).toBe(true);
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await readiness.check()).toBe(true);
  } finally {
    await readiness.onModuleDestroy();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
