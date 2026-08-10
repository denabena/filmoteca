import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { Profile } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import {
  ProfileService,
  type ProfilePreferencesInput,
} from './profile.service';

/**
 * The signed-in user's app profile. Reaching it requires a verified Neon Auth
 * token; the first authenticated request also creates the Profile row, so the
 * frontend never has to call a separate "register" step that Neon Auth already
 * owns.
 */
@Controller('profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  /** Reads the profile, including the stored goal and genres together (FIL-23). */
  @Get()
  @UseGuards(NeonAuthGuard)
  async getProfile(@CurrentUser() user: NeonAuthUser): Promise<Profile> {
    return this.profiles.ensure(user);
  }

  /**
   * Updates onboarding / Settings preferences (FIL-23). Partial: send the monthly
   * goal, the favorite genres, or both. Ensures the row exists first, so the two
   * onboarding steps can write straight after sign-up.
   */
  @Patch()
  @UseGuards(NeonAuthGuard)
  async updateProfile(
    @CurrentUser() user: NeonAuthUser,
    @Body() body: ProfilePreferencesInput,
  ): Promise<Profile> {
    await this.profiles.ensure(user);
    return this.profiles.updatePreferences(user.id, body);
  }
}
