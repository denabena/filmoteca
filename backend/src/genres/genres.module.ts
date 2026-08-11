import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GenresController } from './genres.controller';

/** The genre reference list. PrismaService comes from the global PrismaModule. */
@Module({
  imports: [AuthModule],
  controllers: [GenresController],
})
export class GenresModule {}
