import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { type Mood, MOODS, isMood } from './moods';
import { PickerGateService, type PickerGateState } from './picker-gate.service';
import { type PickCard, PicksService } from './picks.service';

/**
 * The Scene Picker's routes.
 *
 * Guarded throughout, and every one takes the user from the verified token, so no
 * caller can act on somebody else's picks by changing a parameter.
 */
@Controller('picker')
export class PickerController {
  constructor(
    private readonly gate: PickerGateService,
    private readonly picks: PicksService,
  ) {}

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

  /** The picks currently on the page, which survive a reload (PIC-6). */
  @Get('picks')
  @UseGuards(NeonAuthGuard)
  async getPicks(@CurrentUser() user: NeonAuthUser): Promise<PickCard[]> {
    return this.picks.getCurrent(user.id);
  }

  /**
   * "Surprise me" (PIC-5), the only asynchronous operation in the design.
   *
   * POST rather than GET because it writes: regenerating replaces what the page
   * shows and is not safe to retry blindly or to cache.
   */
  @Post('picks')
  @UseGuards(NeonAuthGuard)
  async generate(
    @CurrentUser() user: NeonAuthUser,
    @Body() body: { moods?: unknown },
  ): Promise<PickCard[]> {
    return this.picks.generate(user.id, parseMoods(body?.moods));
  }

  /** "Add to watchlist" (PIC-7). */
  @Post('picks/:id/add')
  @UseGuards(NeonAuthGuard)
  async add(
    @CurrentUser() user: NeonAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PickCard> {
    return this.picks.addToWatchlist(user.id, id);
  }

  /** "Not for me" (PIC-7). 204, because the card just goes. */
  @Post('picks/:id/dismiss')
  @HttpCode(204)
  @UseGuards(NeonAuthGuard)
  async dismiss(
    @CurrentUser() user: NeonAuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.picks.dismiss(user.id, id);
  }
}

/**
 * Validates the mood chips by hand, since the project has no class-validator.
 *
 * An unknown chip is rejected rather than ignored: silently dropping it would
 * return picks that do not match what the user selected, and they would have no
 * way to tell.
 */
function parseMoods(value: unknown): Mood[] {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new BadRequestException('moods must be an array of strings');
  }

  const unknown = (value as string[]).filter((item) => !isMood(item));

  if (unknown.length > 0) {
    throw new BadRequestException(
      `unknown mood(s): ${unknown.join(', ')}. Expected any of: ${MOODS.join(', ')}`,
    );
  }

  return [...new Set(value as Mood[])];
}
