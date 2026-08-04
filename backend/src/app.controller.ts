import { Controller, Get } from '@nestjs/common';
import { AppService, type HelloResponse } from './app.service';
import {
  DatabaseService,
  type DatabasePing,
} from './database/database.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly database: DatabaseService,
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
    return this.database.ping();
  }
}
