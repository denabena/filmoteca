import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TitlesModule } from '../titles/titles.module';
import { PickerGateService } from './picker-gate.service';
import { PickerController } from './picker.controller';

/**
 * The Scene Picker.
 *
 * Exports PickerGateService because the dashboard teaser needs the same unlock
 * state the Picker page shows, and reading it from one service is the whole point
 * of FIL-67.
 */
@Module({
  imports: [AuthModule, TitlesModule],
  controllers: [PickerController],
  providers: [PickerGateService],
  exports: [PickerGateService],
})
export class PickerModule {}
