import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { AuditLogController } from '../controllers/audit-log.controller';
import { RolesGuard } from '../guards/roles.guard';
import { AuditContextInterceptor } from '../interceptors/audit-context.interceptor';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditLogRepository,
    RolesGuard,
    // Registrado globalmente: toda requisição HTTP abre um contexto de auditoria.
    { provide: APP_INTERCEPTOR, useClass: AuditContextInterceptor },
  ],
})
export class AuditModule {}
