import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TitlesController } from './titles.controller';
import { TitlesRepository } from './titles.repository';
import { TitlesService } from './titles.service';

/**
 * Owns access to the `titles` table.
 *
 * Carries the full CRUD (FIL-41, 42, 54, 55, 56) plus the two quick actions
 * fired from a list row (FIL-57). Everything routes through TitlesRepository
 * rather than PrismaService, so ownership is enforced once.
 *
 * PrismaService comes from the global PrismaModule, so nothing is imported here.
 */
@Module({
  imports: [AuthModule],
  controllers: [TitlesController],
  providers: [TitlesRepository, TitlesService],
  exports: [TitlesRepository],
})
export class TitlesModule {}
