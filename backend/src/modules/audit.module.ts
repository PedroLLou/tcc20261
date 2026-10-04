import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { AuditLogController } from '../controllers/audit-log.controller';
import { RolesGuard } from '../guards/roles.guard';
import { AuditContextInterceptor } from '../interceptors/audit-context.interceptor';
import { AuditLogService } from '../services/audit-log.service';

@Module({
  imports: [AuthModule],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    RolesGuard,
    // Registrado globalmente: toda requisição HTTP abre um contexto de auditoria.
    { provide: APP_INTERCEPTOR, useClass: AuditContextInterceptor },
  ],
})
export class AuditModule {}
