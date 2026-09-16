import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { passwordResetTokens } from '../src/database/schema/password-reset-tokens.schema.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const authUrl = '/api/v1/auth';

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
  });
  const db = drizzle(pool, { casing: 'snake_case' });

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

  afterAll(async () => {
    await pool.end();
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

  describe(`POST ${authUrl}/forgot-password`, () => {
    it('should create reset token and allow password reset', async () => {
      const email = `reset-${Date.now()}@example.com`;
      const oldPassword = 'Password123!';
      const newPassword = 'NewPassword456!';

      const registerResponse = await request(app.getHttpServer())
        .post(`${authUrl}/register`)
        .send({
          name: 'Reset User',
          email,
          password: oldPassword,
        })
        .expect(201);

      const userId = registerResponse.body.data.user.id as string;

      const forgotResponse = await request(app.getHttpServer())
        .post(`${authUrl}/forgot-password`)
        .send({ email })
        .expect(201);

      expect(forgotResponse.body.data.message).toContain('Jika email terdaftar');

      const [resetToken] = await db
        .select({ token: passwordResetTokens.token })
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, userId))
        .orderBy(desc(passwordResetTokens.createdAt))
        .limit(1);

      expect(resetToken?.token).toBeTruthy();

      const resetResponse = await request(app.getHttpServer())
        .post(`${authUrl}/reset-password`)
        .send({
          token: resetToken?.token,
          password: newPassword,
        })
        .expect(201);

      expect(resetResponse.body.data.message).toContain('Password berhasil diubah');

      await request(app.getHttpServer())
        .post(`${authUrl}/login`)
        .send({
          email,
          password: oldPassword,
        })
        .expect(401);

      const loginResponse = await request(app.getHttpServer())
        .post(`${authUrl}/login`)
        .send({
          email,
          password: newPassword,
        })
        .expect(201);

      expect(loginResponse.body.data.user.email).toBe(email);
    });

    it('should return generic message for unknown email', async () => {
      const response = await request(app.getHttpServer())
        .post(`${authUrl}/forgot-password`)
        .send({ email: `unknown-${Date.now()}@example.com` })
        .expect(201);

      expect(response.body.data.message).toContain('Jika email terdaftar');
    });
  });

  describe(`PATCH ${authUrl}/me`, () => {
    it('should update current user profile with bearer token', async () => {
      const email = `patch-me-${Date.now()}@example.com`;

      const registerResponse = await request(app.getHttpServer())
        .post(`${authUrl}/register`)
        .send({
          name: 'Profile User',
          email,
          password: 'Password123!',
        })
        .expect(201);

      const token = registerResponse.body.data.accessToken;

      const phone = `+62812${Date.now()}`;

      const response = await request(app.getHttpServer())
        .patch(`${authUrl}/me`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Profile User',
          phone,
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        name: 'Updated Profile User',
        email,
        phone,
        role: 'customer',
      });

      const meResponse = await request(app.getHttpServer())
        .get(`${authUrl}/me`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meResponse.body.data.name).toBe('Updated Profile User');
      expect(meResponse.body.data.phone).toBe(phone);
    });

    it('should return 401 without bearer token', async () => {
      await request(app.getHttpServer())
        .patch(`${authUrl}/me`)
        .send({ name: 'Unauthorized Update' })
        .expect(401);
    });
  });
});
