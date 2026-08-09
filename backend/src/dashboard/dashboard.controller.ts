import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { DashboardService, type DashboardSummary } from './dashboard.service';
import { parseMonth } from './month';

/**
 * The dashboard's data, in one request.
 *
 * One route rather than one per section, following the tech spec's single
 * `getDashboardSummary` operation. Frame 04 renders every section at once, so
 * splitting this would only buy the frontend four round trips it has no use for.
 * The Picker teaser adds a key to the response rather than a route beside it.
 *
 * Guarded, and the user comes from the verified token: there is no user id in the
 * path or the query, so there is nothing here for a caller to tamper with.
 */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /**
   * `month` is `YYYY-MM` and optional, defaulting to the current month.
   *
   * A8: the header dropdown is only ever drawn showing "October", so the month is
   * a parameter rather than a constant. It is parsed rather than validated by a
   * pipe because the project has no class-validator, and a hand-rolled parse with
   * a message naming the expected shape beats a bare 400.
   *
   * Note it scopes the stats only. The up-next rail and the continue-watching hero
   * are not month-scoped, per A11 and A9.
   */
  @Get()
  @UseGuards(NeonAuthGuard)
  async getDashboard(
    @CurrentUser() user: NeonAuthUser,
    @Query('month') month?: string,
  ): Promise<DashboardSummary> {
    return this.dashboard.getSummary(user.id, parseMonth(month));
  }
}
