import type { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';

export async function closeApplication(app: INestApplication): Promise<void> {
  const server: unknown = app.getHttpServer();
  if (!(server instanceof Server)) throw new Error('INVALID_HTTP_SERVER');
  if (server.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  // Nest destroys Prisma providers before its adapter closes HTTP. Drain first.
  await app.close();
}

export async function shutdownWithinDeadline(
  close: () => Promise<unknown>,
  flush: () => Promise<unknown>,
  timeoutMs: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let applicationClosed = false;
  const work = async () => {
    try {
      await close();
      applicationClosed = true;
    } catch {
      // A failed application/database close remains a failed shutdown.
    }
    try {
      await flush();
    } catch {
      // Telemetry is best effort; exporter wrappers emit fixed failure diagnostics.
    }
    return applicationClosed;
  };
  try {
    return await Promise.race([
      work(),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(applicationClosed), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
