import { defineConfig } from '@prisma/config';
import 'dotenv/config';

/**
 * Prisma CLI configuration.
 *
 * Prisma 7 moved connection URLs out of schema.prisma. The CLI reads its URL from
 * here, and the application gets a driver adapter instead (see src/prisma).
 *
 * `dotenv/config` is imported explicitly because Prisma 7 no longer loads .env
 * on its own. Without it every migrate command sees an undefined URL.
 *
 * The URL is deliberately the DIRECT endpoint, not the pooled one. Prisma Migrate
 * relies on prepared statements, and PgBouncer in transaction mode discards them
 * between transactions, so migrating over the pooled URL fails in ways that look
 * like random SQL errors.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED,
  },
});
