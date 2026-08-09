import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ProfileModule } from './profile/profile.module';
import { TitlesModule } from './titles/titles.module';

@Module({
  imports: [
    // Reads backend/.env at startup and makes ConfigService available everywhere
    // without re-importing this module. Copy .env.example to .env to set values.
    ConfigModule.forRoot({ isGlobal: true }),
    // Global, so PrismaService injects anywhere without re-importing.
    PrismaModule,
    AuthModule,
    ProfileModule,
    TitlesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
