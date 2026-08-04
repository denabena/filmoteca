import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

export const PG_POOL = 'PG_POOL';

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

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, values);
  }

  async ping(): Promise<DatabasePing> {
    const startedAt = Date.now();
    const result = await this.pool.query<{ database: string; version: string }>(
      'select current_database() as database, version() as version',
    );
    const row = result.rows[0];

    return {
      ok: true,
      database: row.database,
      // The full version string carries the build hash; the first segment is
      // the part anyone reading a health check actually wants.
      version: row.version.split(' on ')[0],
      latencyMs: Date.now() - startedAt,
    };
  }

  // Nest calls this on shutdown. Without it the process hangs on open sockets.
  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
