import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService, type DatabasePing } from './prisma/prisma.service';

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
  const prismaStub = { ping: jest.fn().mockResolvedValue(ping) };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prismaStub }],
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
