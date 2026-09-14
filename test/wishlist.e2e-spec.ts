import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { cleanupProductFixture } from './helpers/e2e-artifact-cleanup.helper.js';
import {
  closeProductSeedPool,
  seedProductFixture,
} from './helpers/product-seed.helper.js';

describe('Wishlist (e2e)', () => {
  let app: INestApplication<App>;

  const authUrl = '/api/v1/auth';
  const wishlistUrl = '/api/v1/wishlist';

  async function registerAndLogin() {
    const email = `wishlist-${Date.now()}-${Math.random()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post(`${authUrl}/register`)
      .send({
        name: 'Wishlist User',
        email,
        password: 'Password123!',
      })
      .expect(201);

    return {
      token: registerResponse.body.data.accessToken as string,
    };
  }

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
    await closeProductSeedPool();
  });

  describe(`GET ${wishlistUrl}`, () => {
    it('should return empty wishlist for authenticated user', async () => {
      const { token } = await registerAndLogin();

      const response = await request(app.getHttpServer())
        .get(wishlistUrl)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should return 401 without bearer token', async () => {
      await request(app.getHttpServer()).get(wishlistUrl).expect(401);
    });
  });

  describe(`POST ${wishlistUrl}/:productId`, () => {
    it('should add product to wishlist and be idempotent', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`wishlist-${Date.now()}`);

      try {
        const firstResponse = await request(app.getHttpServer())
          .post(`${wishlistUrl}/${fixture.productId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(firstResponse.body.data).toMatchObject({
          id: fixture.productId,
          slug: fixture.slug,
        });

        const secondResponse = await request(app.getHttpServer())
          .post(`${wishlistUrl}/${fixture.productId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(secondResponse.body.data.id).toBe(fixture.productId);

        const listResponse = await request(app.getHttpServer())
          .get(wishlistUrl)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(listResponse.body.data).toHaveLength(1);
        expect(listResponse.body.data[0].id).toBe(fixture.productId);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });

    it('should return 404 for unknown product', async () => {
      const { token } = await registerAndLogin();

      await request(app.getHttpServer())
        .post(`${wishlistUrl}/00000000-0000-0000-0000-000000000099`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe(`DELETE ${wishlistUrl}/:productId`, () => {
    it('should remove product from wishlist', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`wishlist-del-${Date.now()}`);

      try {
        await request(app.getHttpServer())
          .post(`${wishlistUrl}/${fixture.productId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        const deleteResponse = await request(app.getHttpServer())
          .delete(`${wishlistUrl}/${fixture.productId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(deleteResponse.body.data).toEqual({
          productId: fixture.productId,
          removed: true,
        });

        const listResponse = await request(app.getHttpServer())
          .get(wishlistUrl)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(listResponse.body.data).toEqual([]);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });

    it('should return 404 when product is not in wishlist', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`wishlist-miss-${Date.now()}`);

      try {
        await request(app.getHttpServer())
          .delete(`${wishlistUrl}/${fixture.productId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });
});
