import { Controller, Get, UseGuards } from '@nestjs/common';
import type { Profile } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from '../auth/neon-auth.guard';
import { ProfileService } from './profile.service';

/**
 * The signed-in user's app profile. Reaching it requires a verified Neon Auth
 * token; the first authenticated request also creates the Profile row, so the
 * frontend never has to call a separate "register" step that Neon Auth already
 * owns.
 */
@Controller('profile')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  @UseGuards(NeonAuthGuard)
  async getProfile(@CurrentUser() user: NeonAuthUser): Promise<Profile> {
    return this.profiles.ensure(user);
  }
}
