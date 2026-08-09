import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { PickerGateService, type PickerGateState } from './picker-gate.service';

/**
 * The Picker page's own data.
 *
 * Only the gate so far. Pick generation (FIL-65) and the added/dismissed
 * transitions (FIL-66) land here too.
 */
@Controller('picker')
export class PickerController {
  constructor(private readonly gate: PickerGateService) {}

  /**
   * Whether this user has unlocked the Picker (PIC-9).
   *
   * The dashboard does not call this: it gets the same state, from the same
   * service, inside its own single summary response. Two routes, one source, which
   * is what stops the teaser and the Picker page disagreeing.
   */
  @Get('gate')
  @UseGuards(NeonAuthGuard)
  async getGate(@CurrentUser() user: NeonAuthUser): Promise<PickerGateState> {
    return this.gate.getState(user.id);
  }
}
