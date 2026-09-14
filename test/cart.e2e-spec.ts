import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { eq } from 'drizzle-orm';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { productVariants } from '../src/database/schema/product-variants.schema.js';
import { cleanupProductFixture } from './helpers/e2e-artifact-cleanup.helper.js';
import {
  closeProductSeedPool,
  seedProductFixture,
} from './helpers/product-seed.helper.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

describe('Cart (e2e)', () => {
  let app: INestApplication<App>;

  const authUrl = '/api/v1/auth';
  const cartUrl = '/api/v1/cart';

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
  });
  const db = drizzle(pool, { casing: 'snake_case' });

  async function registerAndLogin() {
    const email = `cart-${Date.now()}-${Math.random()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post(`${authUrl}/register`)
      .send({
        name: 'Cart User',
        email,
        password: 'Password123!',
      })
      .expect(201);

    return {
      token: registerResponse.body.data.accessToken as string,
    };
  }

  async function getVariantId(productId: string) {
    const [variant] = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .limit(1);

    return variant?.id;
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
    await pool.end();
  });

  describe(`GET ${cartUrl}`, () => {
    it('should return empty cart for authenticated user', async () => {
      const { token } = await registerAndLogin();

      const response = await request(app.getHttpServer())
        .get(cartUrl)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual({
        items: [],
        subtotal: 0,
        itemCount: 0,
      });
    });

    it('should return 401 without bearer token', async () => {
      await request(app.getHttpServer()).get(cartUrl).expect(401);
    });
  });

  describe(`POST ${cartUrl}/items`, () => {
    it('should add item and merge quantity for same product', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`cart-${Date.now()}`);

      try {
        await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            quantity: 1,
          })
          .expect(201);

        const mergedResponse = await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            quantity: 2,
          })
          .expect(201);

        expect(mergedResponse.body.data.items).toHaveLength(1);
        expect(mergedResponse.body.data.items[0]).toMatchObject({
          productId: fixture.productId,
          slug: fixture.slug,
          quantity: 3,
        });
        expect(mergedResponse.body.data.itemCount).toBe(3);
      } finally {
        await request(app.getHttpServer())
          .delete(cartUrl)
          .set('Authorization', `Bearer ${token}`)
          .catch(() => undefined);
        await cleanupProductFixture(fixture);
      }
    });
  });

  describe(`PATCH ${cartUrl}/items/:id`, () => {
    it('should update cart item quantity', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`cart-patch-${Date.now()}`);

      try {
        const createResponse = await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            quantity: 1,
          })
          .expect(201);

        const itemId = createResponse.body.data.items[0].id as string;

        const response = await request(app.getHttpServer())
          .patch(`${cartUrl}/items/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ quantity: 2 })
          .expect(200);

        expect(response.body.data.items[0].quantity).toBe(2);
      } finally {
        await request(app.getHttpServer())
          .delete(cartUrl)
          .set('Authorization', `Bearer ${token}`)
          .catch(() => undefined);
        await cleanupProductFixture(fixture);
      }
    });
  });

  describe(`DELETE ${cartUrl}/items/:id`, () => {
    it('should remove cart item', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`cart-delete-${Date.now()}`);

      try {
        const createResponse = await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            quantity: 1,
          })
          .expect(201);

        const itemId = createResponse.body.data.items[0].id as string;

        const response = await request(app.getHttpServer())
          .delete(`${cartUrl}/items/${itemId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.data.items).toEqual([]);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });

  describe(`DELETE ${cartUrl}`, () => {
    it('should clear all cart items', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`cart-clear-${Date.now()}`);
      const variantId = await getVariantId(fixture.productId);

      try {
        await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            variantId,
            quantity: 1,
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .delete(cartUrl)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.data).toEqual({
          items: [],
          subtotal: 0,
          itemCount: 0,
        });
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });
});
