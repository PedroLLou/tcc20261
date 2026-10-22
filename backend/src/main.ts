// Carrega o .env antes dos módulos para disponibilizar a configuração
// durante a inicialização da aplicação (ver #104).
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger, PinoLogger } from 'nestjs-pino';
import { deploymentConfig } from './observability/config';
import {
  requestTelemetry,
  startProcessMetrics,
} from './observability/http-metrics';
import {
  closeApplication,
  shutdownWithinDeadline,
} from './observability/shutdown';
import { shutdownTelemetry } from './observability/instrumentation';

async function bootstrap() {
  const { port, origins } = deploymentConfig();
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    abortOnError: false,
  });
  app.useLogger(app.get(Logger));
  app.use(requestTelemetry(await app.resolve(PinoLogger)));
  app.enableCors({
    origin: origins.length ? origins : false,
    exposedHeaders: ['X-Request-Id'],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('TCC Feedback Management API')
    .setDescription('API REST da camada de aplicação do sistema de feedbacks')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const stopMetrics = startProcessMetrics();
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    stopMetrics();
    void shutdownWithinDeadline(
      () => closeApplication(app),
      shutdownTelemetry,
      5000,
    ).then((success) => process.exit(success ? 0 : 1));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  await app.listen(port, '0.0.0.0');
}
void bootstrap().catch(() => {
  process.stderr.write('{"level":50,"code":"STARTUP_FAILED"}\n');
  void shutdownWithinDeadline(
    () => Promise.resolve(),
    shutdownTelemetry,
    5000,
  ).then(() => process.exit(1));
});
