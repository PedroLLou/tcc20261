import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../guards/roles.guard';
import { AuditLogPageDto, AuditLogQueryDto } from '../dto/audit-log.dto';
import { AuditLogService } from '../services/audit-log.service';

@ApiTags('Audit logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  // Somente o RH consulta a auditoria (menor privilégio).
  @Get()
  @Roles('ADMIN_RH')
  @UseGuards(RolesGuard)
  list(@Query() query: AuditLogQueryDto): Promise<AuditLogPageDto> {
    return this.auditLogService.list(query);
  }
}
