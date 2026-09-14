import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { claims } from '../src/database/schema/claims.schema.js';
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

describe('Claim (e2e)', () => {
  let app: INestApplication<App>;

  const authUrl = '/api/v1/auth';
  const addressesUrl = '/api/v1/addresses';
  const cartUrl = '/api/v1/cart';
  const ordersUrl = '/api/v1/orders';
  const claimsUrl = '/api/v1/claims';

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
  });
  const db = drizzle(pool, { casing: 'snake_case' });

  const createdOrders: string[] = [];
  const createdAddresses: Array<{ id: string; token: string }> = [];
  const createdClaimIds: string[] = [];

  async function registerAndLogin() {
    const email = `claim-${Date.now()}-${Math.random()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post(`${authUrl}/register`)
      .send({
        name: 'Claim User',
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
      await db.delete(claims).where(inArray(claims.orderItemId, itemIds));
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
      .set({ status: 'completed' })
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
    for (const claimId of createdClaimIds.splice(0)) {
      await db.delete(claims).where(eq(claims.id, claimId)).catch(() => undefined);
    }

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

  describe(`GET ${claimsUrl}`, () => {
    it('should return empty list for user without claims', async () => {
      const { token } = await registerAndLogin();

      const response = await request(app.getHttpServer())
        .get(claimsUrl)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should return 401 without bearer token', async () => {
      await request(app.getHttpServer()).get(claimsUrl).expect(401);
    });
  });

  describe(`POST ${claimsUrl}`, () => {
    it('should create claim and prevent duplicate active claim', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`claim-create-${Date.now()}`);

      try {
        const { orderId, orderItemId } = await createPaidOrder(
          token,
          fixture.productId,
        );

        const createResponse = await request(app.getHttpServer())
          .post(claimsUrl)
          .set('Authorization', `Bearer ${token}`)
          .send({
            orderItemId,
            type: 'warranty',
            reason: 'Layar tidak responsif setelah 2 minggu pemakaian.',
            proofImageUrl:
              'https://res.cloudinary.com/demo/image/upload/sample.jpg',
          })
          .expect(201);

        const claimId = createResponse.body.data.id as string;
        createdClaimIds.push(claimId);

        expect(createResponse.body.data).toMatchObject({
          orderItemId,
          orderId,
          type: 'warranty',
          status: 'submitted',
          productName: expect.any(String),
        });

        const listResponse = await request(app.getHttpServer())
          .get(`${claimsUrl}?orderId=${orderId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(listResponse.body.data).toHaveLength(1);

        const detailResponse = await request(app.getHttpServer())
          .get(`${claimsUrl}/${claimId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(detailResponse.body.data.id).toBe(claimId);

        await request(app.getHttpServer())
          .post(claimsUrl)
          .set('Authorization', `Bearer ${token}`)
          .send({
            orderItemId,
            type: 'return',
            reason: 'Duplikat klaim',
          })
          .expect(409);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });
});
