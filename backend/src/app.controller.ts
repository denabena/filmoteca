import { Controller, Get } from '@nestjs/common';
import { AppService, type HelloResponse } from './app.service';
import { PrismaService, type DatabasePing } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  // With the global 'api' prefix (see main.ts), this is GET /api/hello.
  @Get('hello')
  getHello(): HelloResponse {
    return this.appService.getHello();
  }

  // GET /api/health/db. Deliberately unauthenticated: it reports whether Neon is
  // reachable, which you need to check before auth can work at all.
  @Get('health/db')
  getDatabaseHealth(): Promise<DatabasePing> {
    return this.prisma.ping();
  }
}
