import { Module } from '@nestjs/common';
import { TitlesRepository } from './titles.repository';

/**
 * Owns access to the `titles` table.
 *
 * No controller: FIL-14 has no screen of its own, it exists because accounts
 * force ownership into the data layer. The endpoints that use this arrive with
 * their own tickets (FIL-41, 42, 54 to 57 for CRUD; FIL-30 to 33 for the
 * dashboard), and each of those imports this module rather than reaching for
 * PrismaService directly.
 *
 * PrismaService comes from the global PrismaModule, so nothing is imported here.
 */
@Module({
  providers: [TitlesRepository],
  exports: [TitlesRepository],
})
export class TitlesModule {}
