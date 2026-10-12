import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseReadiness } from './database-readiness';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseReadiness) {}
  @Get('live')
  live() {
    return { status: 'ok' };
  }
  @Get('ready')
  async ready() {
    if (!(await this.database.check())) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return { status: 'ok' };
  }
}
