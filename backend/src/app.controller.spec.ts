import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  DatabaseService,
  type DatabasePing,
} from './database/database.service';

describe('AppController', () => {
  let appController: AppController;

  const ping: DatabasePing = {
    ok: true,
    database: 'neondb',
    version: 'PostgreSQL 18.4',
    latencyMs: 12,
  };

  // Stubbed rather than real: a unit test must not need Neon credentials or a
  // network round trip to assert what the controller returns.
  const databaseStub = { ping: jest.fn().mockResolvedValue(ping) };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: DatabaseService, useValue: databaseStub },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('hello', () => {
    it('should return a hello message', () => {
      expect(appController.getHello()).toEqual({
        message: 'Welcome friend, hello from the NestJS API 👋',
      });
    });
  });

  describe('health/db', () => {
    it('reports what the database ping returned', async () => {
      await expect(appController.getDatabaseHealth()).resolves.toEqual(ping);
    });
  });
});
