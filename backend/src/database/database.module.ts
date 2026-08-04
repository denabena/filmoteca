import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DatabaseService, PG_POOL } from './database.service';

/**
 * Neon Postgres connection.
 *
 * Neon exposes two endpoints and the difference matters. `DATABASE_URL` is the
 * pooled one (its host carries `-pooler`) and routes through PgBouncer, which is
 * what the running application should use. `DATABASE_URL_UNPOOLED` is direct and
 * is what migrations and the catalogue import script must use, because PgBouncer
 * in transaction mode discards prepared statements between transactions.
 *
 * Only the pooled endpoint is wired up here. Anything needing the direct one is
 * a script rather than a request path, so it reads the variable itself.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL');

        if (!connectionString) {
          throw new Error(
            'DATABASE_URL is not set. Copy backend/.env.example to backend/.env ' +
              'and fill in both Neon connection strings.',
          );
        }

        return new Pool({
          connectionString,
          // Neon suspends an idle branch, so the first connection can take well
          // over a second. The pg default of 0 (no timeout) would hang instead
          // of failing, and a short timeout would reject a healthy cold start.
          connectionTimeoutMillis: 10_000,
          max: 10,
        });
      },
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
