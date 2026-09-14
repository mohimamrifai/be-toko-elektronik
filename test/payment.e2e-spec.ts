import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createHash } from 'node:crypto';
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
  closeProductSeedPool,
  seedProductFixture,
} from './helpers/product-seed.helper.js';

describe('Payment (e2e)', () => {
  let app: INestApplication<App>;

  const authUrl = '/api/v1/auth';
  const addressesUrl = '/api/v1/addresses';
  const cartUrl = '/api/v1/cart';
  const ordersUrl = '/api/v1/orders';
  const notificationUrl = '/api/v1/payments/midtrans/notification';

  const serverKey =
    process.env.MIDTRANS_SERVER_KEY ?? 'SB-Mid-server-test-key';

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
  });
  const db = drizzle(pool, { casing: 'snake_case' });

  const createdOrders: string[] = [];
  const createdAddresses: Array<{ id: string; token: string }> = [];

  async function registerAndLogin() {
    const email = `payment-${Date.now()}-${Math.random()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post(`${authUrl}/register`)
      .send({
        name: 'Payment User',
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

  function buildSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
  ) {
    return createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest('hex');
  }

  async function cleanupOrder(orderId: string) {
    await db.delete(payments).where(eq(payments.orderId, orderId));
    await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId));
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }

  beforeEach(async () => {
    process.env.MIDTRANS_SERVER_KEY =
      process.env.MIDTRANS_SERVER_KEY ?? 'SB-Mid-server-test-key';
    process.env.MIDTRANS_CLIENT_KEY =
      process.env.MIDTRANS_CLIENT_KEY ?? 'SB-Mid-client-test-key';
    process.env.MIDTRANS_IS_PRODUCTION = 'false';

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

  describe(`POST ${notificationUrl}`, () => {
    it('should update payment and order status from valid notification', async () => {
      const { token } = await registerAndLogin();
      const addressId = await createAddress(token);
      const fixture = await seedProductFixture(`payment-${Date.now()}`);

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            token: 'mock-snap-token',
            redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/mock',
          }),
          { status: 200 },
        ),
      );

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

        const payResponse = await request(app.getHttpServer())
          .post(`${ordersUrl}/${orderId}/pay`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        const midtransOrderId = payResponse.body.data.midtransOrderId as string;
        const grossAmount = `${checkoutResponse.body.data.total}.00`;

        const notificationPayload = {
          order_id: midtransOrderId,
          status_code: '200',
          gross_amount: grossAmount,
          signature_key: buildSignature(midtransOrderId, '200', grossAmount),
          transaction_status: 'settlement',
          payment_type: 'credit_card',
          transaction_id: 'midtrans-tx-123',
        };

        await request(app.getHttpServer())
          .post(notificationUrl)
          .send(notificationPayload)
          .expect(201);

        const orderResponse = await request(app.getHttpServer())
          .get(`${ordersUrl}/${orderId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(orderResponse.body.data.status).toBe('paid');
      } finally {
        fetchMock.mockRestore();
        await cleanupProductFixture(fixture);
      }
    });

    it('should return 401 for invalid signature', async () => {
      await request(app.getHttpServer())
        .post(notificationUrl)
        .send({
          order_id: 'ORD-invalid',
          status_code: '200',
          gross_amount: '10000.00',
          signature_key: 'invalid-signature',
          transaction_status: 'settlement',
        })
        .expect(401);
    });
  });
});
