import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TitlesController } from './titles.controller';
import { TitlesRepository } from './titles.repository';

/**
 * Owns access to the `titles` table.
 *
 * Carries the list, read and create endpoints (FIL-41, FIL-42, FIL-54). Update,
 * delete and the two quick actions arrive with FIL-55, 56 and 57. Everything
 * routes through TitlesRepository rather than PrismaService, so ownership is
 * enforced once.
 *
 * PrismaService comes from the global PrismaModule, so nothing is imported here.
 */
@Module({
  imports: [AuthModule],
  controllers: [TitlesController],
  providers: [TitlesRepository],
  exports: [TitlesRepository],
})
export class TitlesModule {}
