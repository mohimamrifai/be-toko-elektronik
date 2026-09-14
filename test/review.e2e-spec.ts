import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import {
  orderItems,
  orders,
  orderStatusHistory,
} from '../src/database/schema/orders.schema.js';
import { payments } from '../src/database/schema/payments.schema.js';
import { reviews } from '../src/database/schema/reviews.schema.js';
import { cleanupProductFixture } from './helpers/e2e-artifact-cleanup.helper.js';
import {
  closeProductSeedPool,
  seedProductFixture,
} from './helpers/product-seed.helper.js';

describe('Review (e2e)', () => {
  let app: INestApplication<App>;

  const authUrl = '/api/v1/auth';
  const addressesUrl = '/api/v1/addresses';
  const cartUrl = '/api/v1/cart';
  const ordersUrl = '/api/v1/orders';
  const productsUrl = '/api/v1/products';

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
  });
  const db = drizzle(pool, { casing: 'snake_case' });

  const createdOrders: string[] = [];
  const createdAddresses: Array<{ id: string; token: string }> = [];

  async function registerAndLogin() {
    const email = `review-${Date.now()}-${Math.random()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post(`${authUrl}/register`)
      .send({
        name: 'Review User',
        email,
        password: 'Password123!',
      })
      .expect(201);

    return {
      token: registerResponse.body.data.accessToken as string,
    };
  }

  async function createAddress(token: string) {
    const response = await request(app.getHttpServer())
      .post(addressesUrl)
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'Rumah',
        recipientName: 'Budi Santoso',
        phone: '+6281234567890',
        fullAddress: 'Jl. Merdeka No. 10',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12345',
        isDefault: true,
      })
      .expect(201);

    const id = response.body.data.id as string;
    createdAddresses.push({ id, token });
    return id;
  }

  async function cleanupOrder(orderId: string) {
    const items = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const itemIds = items.map((item) => item.id);

    if (itemIds.length > 0) {
      await db
        .delete(reviews)
        .where(inArray(reviews.orderItemId, itemIds));
    }

    await db.delete(payments).where(eq(payments.orderId, orderId));
    await db
      .delete(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId));
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }

  async function createPaidOrder(token: string, productId: string) {
    const addressId = await createAddress(token);

    await request(app.getHttpServer())
      .post(`${cartUrl}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId,
        quantity: 1,
      })
      .expect(201);

    const checkoutResponse = await request(app.getHttpServer())
      .post(`${ordersUrl}/checkout`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddressId: addressId,
        courier: 'JNE Reguler',
      })
      .expect(201);

    const orderId = checkoutResponse.body.data.id as string;
    createdOrders.push(orderId);

    await db
      .update(orders)
      .set({ status: 'paid' })
      .where(eq(orders.id, orderId));

    const [orderItem] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .limit(1);

    return {
      orderId,
      orderItemId: orderItem?.id as string,
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
    for (const orderId of createdOrders.splice(0)) {
      await cleanupOrder(orderId).catch(() => undefined);
    }

    for (const entry of createdAddresses.splice(0)) {
      await request(app.getHttpServer())
        .delete(`${addressesUrl}/${entry.id}`)
        .set('Authorization', `Bearer ${entry.token}`)
        .catch(() => undefined);
    }

    await app.close();
  });

  afterAll(async () => {
    await closeProductSeedPool();
    await pool.end();
  });

  describe(`GET ${productsUrl}/:slug/reviews`, () => {
    it('should return empty reviews for product without reviews', async () => {
      const fixture = await seedProductFixture(`review-list-${Date.now()}`);

      try {
        const response = await request(app.getHttpServer())
          .get(`${productsUrl}/${fixture.slug}/reviews`)
          .expect(200);

        expect(response.body.data.items).toEqual([]);
        expect(response.body.data.summary).toEqual({
          avgRating: 0,
          reviewCount: 0,
        });
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });

  describe(`POST ${productsUrl}/:productId/reviews`, () => {
    it('should create review for verified buyer and expose rating on product', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`review-create-${Date.now()}`);

      try {
        const { orderItemId } = await createPaidOrder(token, fixture.productId);

        const createResponse = await request(app.getHttpServer())
          .post(`${productsUrl}/${fixture.productId}/reviews`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            orderItemId,
            rating: 5,
            comment: 'Produk sangat bagus dan original.',
          })
          .expect(201);

        expect(createResponse.body.data).toMatchObject({
          rating: 5,
          comment: 'Produk sangat bagus dan original.',
          isVerifiedBuyer: true,
          userName: 'Review User',
        });

        const listResponse = await request(app.getHttpServer())
          .get(`${productsUrl}/${fixture.slug}/reviews`)
          .expect(200);

        expect(listResponse.body.data.items).toHaveLength(1);
        expect(listResponse.body.data.summary).toEqual({
          avgRating: 5,
          reviewCount: 1,
        });

        const productResponse = await request(app.getHttpServer())
          .get(`${productsUrl}/${fixture.slug}`)
          .expect(200);

        expect(productResponse.body.data).toMatchObject({
          rating: 5,
          reviewCount: 1,
        });

        await request(app.getHttpServer())
          .post(`${productsUrl}/${fixture.productId}/reviews`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            orderItemId,
            rating: 4,
          })
          .expect(409);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });

    it('should return 401 without bearer token', async () => {
      const fixture = await seedProductFixture(`review-auth-${Date.now()}`);

      try {
        await request(app.getHttpServer())
          .post(`${productsUrl}/${fixture.productId}/reviews`)
          .send({
            orderItemId: '00000000-0000-0000-0000-000000000099',
            rating: 5,
          })
          .expect(401);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });
});
