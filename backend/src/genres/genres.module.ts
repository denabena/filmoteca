import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TitlesModule } from '../titles/titles.module';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';

/**
 * The genre reference list and the per-user counts derived from it.
 *
 * TitlesModule is imported for TitlesRepository, which is the only code allowed
 * to query `titles`: the counts have to come through it rather than through a
 * join written here. PrismaService comes from the global PrismaModule.
 */
@Module({
  imports: [AuthModule, TitlesModule],
  controllers: [GenresController],
  providers: [GenresService],
  exports: [GenresService],
})
export class GenresModule {}
