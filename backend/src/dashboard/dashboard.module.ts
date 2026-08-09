import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TitlesModule } from '../titles/titles.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * Frame 04's data. Imports TitlesModule for TitlesRepository rather than reaching
 * for PrismaService, so every read here is owner-scoped by construction. See the
 * repository's own doc comment for why that is a rule.
 */
@Module({
  imports: [AuthModule, TitlesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
