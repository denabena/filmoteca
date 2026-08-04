import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global so PrismaService injects anywhere without every feature module
 * re-importing it. There is one client per process by design: Prisma manages its
 * own connection pool, so creating more would multiply connections against Neon.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
