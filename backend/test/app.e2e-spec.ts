import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { NeonAuthGuard } from './../src/auth/neon-auth.guard';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // AppModule wires a real Prisma client whose constructor throws without
      // DATABASE_URL. CI has no backend/.env, so overriding it is what keeps
      // this suite runnable without credentials. Overrides replace the provider
      // before Nest ever instantiates the real one.
      .overrideProvider(PrismaService)
      .useValue({
        ping: jest.fn(),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideProvider(NeonAuthGuard)
      .useValue({ canActivate: () => false } satisfies CanActivate)
      .compile();

    app = moduleFixture.createNestApplication();
    // Mirror the global 'api' prefix configured in main.ts so e2e routes
    // match production (GET /api/hello).
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/hello (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/hello')
      .expect(200)
      .expect({ message: 'Welcome friend, hello from the NestJS API 👋' });
  });

  it('/api/me (GET) is refused without a bearer token', () => {
    return request(app.getHttpServer()).get('/api/me').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
