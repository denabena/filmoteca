import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TitlesModule } from '../titles/titles.module';
import { CandidatesRepository } from './candidates.repository';
import { PickerGateService } from './picker-gate.service';
import { PickerController } from './picker.controller';
import { PicksService } from './picks.service';

/**
 * The Scene Picker.
 *
 * Exports PickerGateService because the dashboard teaser needs the same unlock
 * state the Picker page shows, and reading it from one service is the whole point
 * of FIL-67.
 *
 * CandidatesRepository is the seam A26 asks for: it is the only thing that knows
 * candidates come from a bundled table, so replacing that with a live provider
 * leaves generation untouched.
 */
@Module({
  imports: [AuthModule, TitlesModule],
  controllers: [PickerController],
  providers: [PickerGateService, CandidatesRepository, PicksService],
  exports: [PickerGateService, PicksService],
})
export class PickerModule {}
