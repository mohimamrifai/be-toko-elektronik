import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { payments } from '../src/database/schema/payments.schema.js';
import {
  orderItems,
  orders,
  orderStatusHistory,
} from '../src/database/schema/orders.schema.js';
import { products } from '../src/database/schema/products.schema.js';
import { cleanupProductFixture } from './helpers/e2e-artifact-cleanup.helper.js';
import {
  closeProductSeedPool,
  seedProductFixture,
} from './helpers/product-seed.helper.js';

describe('Order (e2e)', () => {
  let app: INestApplication<App>;

  const authUrl = '/api/v1/auth';
  const addressesUrl = '/api/v1/addresses';
  const cartUrl = '/api/v1/cart';
  const ordersUrl = '/api/v1/orders';

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
  });
  const db = drizzle(pool, { casing: 'snake_case' });

  const createdOrders: string[] = [];
  const createdAddresses: Array<{ id: string; token: string }> = [];

  async function registerAndLogin() {
    const email = `order-${Date.now()}-${Math.random()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post(`${authUrl}/register`)
      .send({
        name: 'Order User',
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
    await db.delete(payments).where(eq(payments.orderId, orderId));
    await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId));
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
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

  describe(`POST ${ordersUrl}/checkout`, () => {
    it('should create order, reduce stock, and clear cart', async () => {
      const { token } = await registerAndLogin();
      const addressId = await createAddress(token);
      const fixture = await seedProductFixture(`order-${Date.now()}`);

      try {
        const [productBefore] = await db
          .select({ stock: products.stock })
          .from(products)
          .where(eq(products.id, fixture.productId))
          .limit(1);

        await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            quantity: 2,
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .post(`${ordersUrl}/checkout`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            shippingAddressId: addressId,
            courier: 'JNE Reguler',
          })
          .expect(201);

        const orderId = response.body.data.id as string;
        createdOrders.push(orderId);

        expect(response.body.data).toMatchObject({
          status: 'pending',
          courier: 'JNE Reguler',
          shippingCost: 15000,
          itemCount: 2,
        });
        expect(response.body.data.orderNumber).toMatch(/^ORD-/);
        expect(response.body.data.items).toHaveLength(1);
        expect(response.body.data.statusHistory).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 'pending',
              note: 'Pesanan dibuat',
            }),
          ]),
        );

        const cartResponse = await request(app.getHttpServer())
          .get(cartUrl)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(cartResponse.body.data.items).toEqual([]);

        const [productAfter] = await db
          .select({ stock: products.stock })
          .from(products)
          .where(eq(products.id, fixture.productId))
          .limit(1);

        expect(productAfter.stock).toBe(productBefore.stock - 2);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });

    it('should return 400 when cart is empty', async () => {
      const { token } = await registerAndLogin();
      const addressId = await createAddress(token);

      await request(app.getHttpServer())
        .post(`${ordersUrl}/checkout`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddressId: addressId,
          courier: 'J&T Reguler',
        })
        .expect(400);
    });

    it('should return 401 without bearer token', async () => {
      await request(app.getHttpServer())
        .post(`${ordersUrl}/checkout`)
        .send({
          shippingAddressId: '11111111-1111-1111-1111-111111111111',
          courier: 'JNE Reguler',
        })
        .expect(401);
    });
  });

  describe(`GET ${ordersUrl}`, () => {
    it('should return order list for authenticated user', async () => {
      const { token } = await registerAndLogin();
      const addressId = await createAddress(token);
      const fixture = await seedProductFixture(`order-list-${Date.now()}`);

      try {
        await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            quantity: 1,
          })
          .expect(201);

        const checkoutResponse = await request(app.getHttpServer())
          .post(`${ordersUrl}/checkout`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            shippingAddressId: addressId,
            courier: 'J&T Reguler',
          })
          .expect(201);

        createdOrders.push(checkoutResponse.body.data.id as string);

        const response = await request(app.getHttpServer())
          .get(ordersUrl)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toMatchObject({
          status: 'pending',
          courier: 'J&T Reguler',
          itemCount: 1,
        });
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });

  describe(`GET ${ordersUrl}/:id`, () => {
    it('should return order detail with status history', async () => {
      const { token } = await registerAndLogin();
      const addressId = await createAddress(token);
      const fixture = await seedProductFixture(`order-detail-${Date.now()}`);

      try {
        await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
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

        const response = await request(app.getHttpServer())
          .get(`${ordersUrl}/${orderId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.data).toMatchObject({
          id: orderId,
          status: 'pending',
        });
        expect(response.body.data.shippingAddress).toMatchObject({
          id: addressId,
          recipientName: 'Budi Santoso',
        });
        expect(response.body.data.statusHistory).toHaveLength(1);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });
});
