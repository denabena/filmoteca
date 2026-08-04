import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService, type DatabasePing } from '../prisma/prisma.service';
import { CurrentUser } from './current-user.decorator';
import { NeonAuthGuard, type NeonAuthUser } from './neon-auth.guard';

/**
 * Shape of `GET /api/me`. Reaching it at all proves the whole chain: the browser
 * holds a Neon Auth session, the frontend minted a JWT from it, and this backend
 * verified that JWT against Neon's JWKS without ever seeing the session cookie.
 */
export interface MeResponse {
  user: {
    id: string;
    email?: string;
    name?: string;
  };
  tokenClaims: string[];
  database: DatabasePing;
}

@Controller()
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(NeonAuthGuard)
  async getMe(@CurrentUser() user: NeonAuthUser): Promise<MeResponse> {
    return {
      user: { id: user.id, email: user.email, name: user.name },
      // Claim names only, never values: this response goes to the browser and
      // the raw token payload can carry more than we intend to expose.
      tokenClaims: Object.keys(user.claims).sort(),
      database: await this.prisma.ping(),
    };
  }
}
