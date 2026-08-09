import { Injectable } from '@nestjs/common';
import { TitlesRepository } from '../titles/titles.repository';

/**
 * Whether the Picker is unlocked, and how far off it is.
 *
 * `ratedCount` and `threshold` are returned alongside the boolean rather than
 * kept private, so a "2 of 3" progress line can be added to the locked card
 * without a second endpoint or a second copy of the rule. Nothing renders them
 * yet.
 */
export interface PickerGateState {
  unlocked: boolean;
  ratedCount: number;
  threshold: number;
}

/**
 * How many rated titles unlock the Picker.
 *
 * **A27: this number is a working decision, not a reading of the design.** Frame
 * 16 says "The Picker needs a few titles first" and frame 05 says "once you've
 * added and rated a few titles". Neither says how many. Three is the proposal and
 * it needs confirming, because it decides how long a new user stares at a locked
 * card before the feature exists for them.
 */
export const PICKER_UNLOCK_THRESHOLD = 3;

/**
 * The one place that decides whether the Picker is unlocked.
 *
 * Two screens promise it unlocks after "a few" titles: the Picker page itself
 * (PIC-9) and the dashboard teaser. Both read this, so they cannot drift apart
 * and show a user a locked card on one screen and an unlocked one on the other.
 * That is the point of the ticket, more than the arithmetic.
 *
 * **The two copy strings disagree and the stricter one wins.** Frame 16 says
 * "titles"; frame 05 says "added and rated". Counting only rated titles is the
 * stricter reading, so a user who has added ten titles and rated none stays
 * locked. Worth flagging to the designer, because it materially changes the gate:
 * rating is a deliberate act and adding is not.
 */
@Injectable()
export class PickerGateService {
  constructor(private readonly titles: TitlesRepository) {}

  /**
   * Counts the user's rated titles and compares against the threshold.
   *
   * Derived on every read rather than stored, so it needs no invalidation: a
   * deleted or un-rated title drops the count and re-locks the Picker on the next
   * request, which is one of the acceptance criteria and would otherwise need a
   * hook on every mutation path.
   *
   * Not month-scoped. The gate is about whether the app knows your taste at all,
   * which does not reset in January.
   */
  async getState(userId: string): Promise<PickerGateState> {
    const ratedCount = await this.titles.count(userId, {
      // Any rating at all counts, including a deliberate zero stars: the user
      // still told us something. Only the absence of a rating fails to count.
      rating: { not: null },
    });

    return {
      unlocked: ratedCount >= PICKER_UNLOCK_THRESHOLD,
      ratedCount,
      threshold: PICKER_UNLOCK_THRESHOLD,
    };
  }
}
