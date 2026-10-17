import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { auditExtension } from './prisma-audit.extension';
import { AuditContextService } from './services/audit-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(auditContext: AuditContextService) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      connectionTimeoutMillis: 10000,
      query_timeout: 10000,
      statement_timeout: 10000,
    });
    super({ adapter });
    // Todas as operações passam pela extensão de auditoria, que informa ao
    // PostgreSQL quem está operando. Os services continuam usando
    // this.prisma normalmente.
    return this.$extends(
      auditExtension(auditContext),
    ) as unknown as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    const existingAdmin = await this.user.findFirst({
      where: { role: 'ADMIN_RH' },
    });
    if (!existingAdmin) {
      const email =
        process.env.DEFAULT_ADMIN_RH_EMAIL ?? 'admin.rh@empresa.com';
      const password = process.env.DEFAULT_ADMIN_RH_PASSWORD ?? 'Admin@123456';
      const passwordHash = await bcrypt.hash(password, 10);
      await this.user.upsert({
        where: { email },
        update: {
          name: 'Administrador RH',
          age: 30,
          password: passwordHash,
          role: 'ADMIN_RH',
        },
        create: {
          name: 'Administrador RH',
          age: 30,
          email,
          password: passwordHash,
          role: 'ADMIN_RH',
        },
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
