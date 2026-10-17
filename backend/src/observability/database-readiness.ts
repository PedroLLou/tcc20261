import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DatabaseReadiness implements OnModuleDestroy {
  // A separate single connection bounds probes without occupying the business pool.
  // Connection acquisition + handshake <= 1 s; SELECT <= 1.5 s, including server cancellation.
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 1000,
    query_timeout: 1500,
    statement_timeout: 1500,
    idleTimeoutMillis: 10000,
  });
  private nextFailureLog = 0;

  constructor() {
    // pg-pool removes a lost idle connection before emitting this event.
    // An unhandled event would crash Node and print an unsanitized exception.
    this.pool.on('error', () => {
      if (Date.now() < this.nextFailureLog) return;
      this.nextFailureLog = Date.now() + 60000;
      process.stdout.write(
        '{"level":40,"event":"database.connection.closed","code":"DATABASE_UNAVAILABLE"}\n',
      );
    });
  }

  async check(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
