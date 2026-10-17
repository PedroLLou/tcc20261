import { Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { closeApplication } from './shutdown';

it('drains an accepted request before Nest destroys database providers', async () => {
  let closed = false;
  let entered: () => void = () => {};
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  @Injectable()
  class DatabaseLifecycle implements OnModuleDestroy {
    onModuleDestroy() {
      closed = true;
    }
  }
  @Module({ providers: [DatabaseLifecycle] })
  class TestModule {}
  const app = await NestFactory.create(TestModule, { logger: false });
  app.use((_request: Request, response: Response) => {
    entered();
    setTimeout(() => response.status(closed ? 503 : 200).end(), 75);
  });
  await app.listen(0, '127.0.0.1');
  try {
    const response = fetch(await app.getUrl());
    await started;
    const closing = closeApplication(app);
    expect((await response).status).toBe(200);
    await closing;
    expect(closed).toBe(true);
  } finally {
    await app.close();
  }
});
