import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Result of a connectivity check. `latencyMs` is worth surfacing because Neon
 * scales to zero: the first query after an idle period pays a cold start of
 * roughly 1.5s, which is normal rather than a fault.
 */
export interface DatabasePing {
  ok: boolean;
  database: string;
  version: string;
  latencyMs: number;
}

/**
 * Prisma client for the Filmoteca backend.
 *
 * Prisma 7 takes a driver adapter rather than a connection URL, so the URL is
 * read here and handed to PrismaPg. This uses the POOLED Neon endpoint, which is
 * correct for a request path. Migrations use the direct endpoint instead and get
 * it from prisma.config.ts, never from this class.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // ConfigService is not injected here: PrismaClient's constructor needs the
    // adapter before Nest could hand us anything, and process.env is the only
    // value available that early. Everything else in this app reads config
    // through ConfigService.
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Copy backend/.env.example to backend/.env and ' +
          'fill in both Neon connection strings.',
      );
    }

    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // Without this the process hangs on open sockets after Nest shuts down.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async ping(): Promise<DatabasePing> {
    const startedAt = Date.now();
    const rows = await this.$queryRaw<
      { database: string; version: string }[]
    >`select current_database() as database, version() as version`;

    return {
      ok: true,
      database: rows[0].database,
      // The full version string carries the build hash; the first segment is
      // the part anyone reading a health check actually wants.
      version: rows[0].version.split(' on ')[0],
      latencyMs: Date.now() - startedAt,
    };
  }
}
