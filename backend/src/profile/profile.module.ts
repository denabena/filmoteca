import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

/**
 * The app-level Profile: creation on first login and reads for the signed-in
 * user. Imports AuthModule for NeonAuthGuard; PrismaService comes from the global
 * PrismaModule. Exports ProfileService so later feature modules (Settings,
 * FIL-74 onward) can reuse it.
 */
@Module({
  imports: [AuthModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
