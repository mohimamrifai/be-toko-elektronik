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
import { cleanupProductFixture } from './helpers/e2e-artifact-cleanup.helper.js';
import {
  loginAsAdmin,
  registerAndLoginAsCustomer,
} from './helpers/admin-auth.helper.js';
import {
  closeProductSeedPool,
  seedProductFixture,
} from './helpers/product-seed.helper.js';

describe('AdminOrder (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  const addressesUrl = '/api/v1/addresses';
  const cartUrl = '/api/v1/cart';
  const ordersUrl = '/api/v1/orders';
  const adminOrdersUrl = '/api/v1/admin/orders';

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
  });
  const db = drizzle(pool, { casing: 'snake_case' });

  const createdOrders: string[] = [];
  const createdAddresses: Array<{ id: string; token: string }> = [];

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
    await db
      .delete(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId));
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }

  async function createPaidOrder(customerToken: string) {
    const addressId = await createAddress(customerToken);
    const fixture = await seedProductFixture(`admin-order-${Date.now()}`);

    try {
      await request(app.getHttpServer())
        .post(`${cartUrl}/items`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          productId: fixture.productId,
          quantity: 1,
        })
        .expect(201);

      const checkoutResponse = await request(app.getHttpServer())
        .post(`${ordersUrl}/checkout`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          shippingAddressId: addressId,
          courier: 'JNE Reguler',
        })
        .expect(201);

      const orderId = checkoutResponse.body.data.id as string;
      const orderNumber = checkoutResponse.body.data.orderNumber as string;
      createdOrders.push(orderId);

      await db
        .update(orders)
        .set({ status: 'paid' })
        .where(eq(orders.id, orderId));

      await db.insert(orderStatusHistory).values({
        orderId,
        status: 'paid',
        note: 'Pembayaran diterima',
      });

      return { orderId, orderNumber };
    } finally {
      await cleanupProductFixture(fixture);
    }
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
    adminToken = await loginAsAdmin(app);
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

  it('should return 401 for unauthenticated admin order requests', async () => {
    await request(app.getHttpServer()).get(adminOrdersUrl).expect(401);
  });

  it('should return 403 for customer access to admin orders', async () => {
    const { accessToken } = await registerAndLoginAsCustomer(app);

    await request(app.getHttpServer())
      .get(adminOrdersUrl)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('should list, detail, update status/shipping, and reflect history for customer', async () => {
    const { accessToken: customerToken } =
      await registerAndLoginAsCustomer(app);
    const { orderId, orderNumber } = await createPaidOrder(customerToken);

    const listResponse = await request(app.getHttpServer())
      .get(`${adminOrdersUrl}?search=${orderNumber}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: orderId,
          orderNumber,
          status: 'paid',
          customer: expect.objectContaining({
            email: expect.any(String),
          }),
        }),
      ]),
    );

    const detailResponse = await request(app.getHttpServer())
      .get(`${adminOrdersUrl}/${orderId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(detailResponse.body.data).toMatchObject({
      id: orderId,
      orderNumber,
      status: 'paid',
    });
    expect(detailResponse.body.data.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'pending' }),
        expect.objectContaining({ status: 'paid' }),
      ]),
    );

    const statusResponse = await request(app.getHttpServer())
      .patch(`${adminOrdersUrl}/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'processing',
        note: 'Pesanan sedang dikemas',
      })
      .expect(200);

    expect(statusResponse.body.data.status).toBe('processing');

    const shippingResponse = await request(app.getHttpServer())
      .patch(`${adminOrdersUrl}/${orderId}/shipping`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courier: 'JNE Reguler',
        trackingNumber: 'JNE987654321',
      })
      .expect(200);

    expect(shippingResponse.body.data).toMatchObject({
      courier: 'JNE Reguler',
      trackingNumber: 'JNE987654321',
    });

    const customerDetailResponse = await request(app.getHttpServer())
      .get(`${ordersUrl}/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    expect(customerDetailResponse.body.data.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: 'processing',
          note: 'Pesanan sedang dikemas',
        }),
      ]),
    );
  });

  it('should filter admin orders by status', async () => {
    const { accessToken: customerToken } =
      await registerAndLoginAsCustomer(app);
    await createPaidOrder(customerToken);

    const response = await request(app.getHttpServer())
      .get(`${adminOrdersUrl}?status=paid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      response.body.data.every(
        (order: { status: string }) => order.status === 'paid',
      ),
    ).toBe(true);
  });
});
