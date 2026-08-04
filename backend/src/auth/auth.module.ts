import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { NeonAuthGuard } from './neon-auth.guard';

/**
 * Token verification for Neon Auth. Exports the guard so any feature module can
 * put a route behind it; DatabaseService comes from the global DatabaseModule.
 */
@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [NeonAuthGuard],
  exports: [NeonAuthGuard],
})
export class AuthModule {}
