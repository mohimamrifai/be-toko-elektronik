import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const authUrl = '/api/v1/auth';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe(`POST ${authUrl}/register`, () => {
    it('should register a new user and return access token', async () => {
      const email = `user-${Date.now()}@example.com`;

      const response = await request(app.getHttpServer())
        .post(`${authUrl}/register`)
        .send({
          name: 'New User',
          email,
          password: 'Password123!',
        })
        .expect(201);

      expect(response.body.data.user).toMatchObject({
        name: 'New User',
        email,
        role: 'customer',
      });
      expect(response.body.data.accessToken).toEqual(expect.any(String));
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 409 when email already registered', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      await request(app.getHttpServer())
        .post(`${authUrl}/register`)
        .send({
          name: 'First User',
          email,
          password: 'Password123!',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`${authUrl}/register`)
        .send({
          name: 'Second User',
          email,
          password: 'Password123!',
        })
        .expect(409);
    });
  });

  describe(`POST ${authUrl}/login`, () => {
    it('should login with valid credentials', async () => {
      const email = `login-${Date.now()}@example.com`;
      const password = 'Password123!';

      await request(app.getHttpServer())
        .post(`${authUrl}/register`)
        .send({
          name: 'Login User',
          email,
          password,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`${authUrl}/login`)
        .send({
          email,
          password,
        })
        .expect(201);

      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.accessToken).toEqual(expect.any(String));
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app.getHttpServer())
        .post(`${authUrl}/login`)
        .send({
          email: 'missing@example.com',
          password: 'wrong-password',
        })
        .expect(401);
    });
  });

  describe(`GET ${authUrl}/me`, () => {
    it('should return current user profile with bearer token', async () => {
      const email = `me-${Date.now()}@example.com`;

      const registerResponse = await request(app.getHttpServer())
        .post(`${authUrl}/register`)
        .send({
          name: 'Profile User',
          email,
          password: 'Password123!',
        })
        .expect(201);

      const token = registerResponse.body.data.accessToken;

      const response = await request(app.getHttpServer())
        .get(`${authUrl}/me`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        name: 'Profile User',
        email,
        role: 'customer',
      });
    });

    it('should return 401 without bearer token', async () => {
      await request(app.getHttpServer()).get(`${authUrl}/me`).expect(401);
    });
  });
});
