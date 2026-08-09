import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { DashboardService, type DashboardSummary } from './dashboard.service';

/**
 * The dashboard's data, in one request.
 *
 * One route rather than one per section, following the tech spec's single
 * `getDashboardSummary` operation. Frame 04 renders every section at once, so
 * splitting this would only buy the frontend four round trips it has no use for.
 * The monthly stats (FIL-30, FIL-31), the weekly activity buckets (FIL-32) and
 * the Picker teaser add keys to the response rather than routes beside it.
 *
 * Guarded, and the user comes from the verified token: there is no user id in the
 * path or the query, so there is nothing here for a caller to tamper with.
 */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @UseGuards(NeonAuthGuard)
  async getDashboard(
    @CurrentUser() user: NeonAuthUser,
  ): Promise<DashboardSummary> {
    return this.dashboard.getSummary(user.id);
  }
}
