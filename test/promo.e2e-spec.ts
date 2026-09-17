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
import { promoProducts, promos } from '../src/database/schema/promos.schema.js';
import { loginAsAdmin } from './helpers/admin-auth.helper.js';
import { cleanupProductFixture } from './helpers/e2e-artifact-cleanup.helper.js';
import {
  closeProductSeedPool,
  seedProductFixture,
} from './helpers/product-seed.helper.js';

describe('Promo (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  const authUrl = '/api/v1/auth';
  const addressesUrl = '/api/v1/addresses';
  const cartUrl = '/api/v1/cart';
  const ordersUrl = '/api/v1/orders';
  const promosUrl = '/api/v1/promos';
  const adminPromosUrl = '/api/v1/admin/promos';

  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
  });
  const db = drizzle(pool, { casing: 'snake_case' });

  const createdPromoIds: string[] = [];
  const createdOrders: string[] = [];
  const createdAddresses: Array<{ id: string; token: string }> = [];

  async function registerAndLogin() {
    const email = `promo-${Date.now()}-${Math.random()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post(`${authUrl}/register`)
      .send({
        name: 'Promo User',
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

  async function cleanupPromo(promoId: string) {
    await db.delete(promoProducts).where(eq(promoProducts.promoId, promoId));
    await db.delete(promos).where(eq(promos.id, promoId));
  }

  function buildPromoPayload(code: string, productIds?: string[]) {
    return {
      code,
      name: `Promo ${code}`,
      discountType: 'percentage',
      discountValue: 10,
      minPurchase: 100000,
      startsAt: '2020-01-01T00:00:00.000Z',
      endsAt: '2099-12-31T23:59:59.000Z',
      productIds,
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
    adminToken = await loginAsAdmin(app);
  });

  afterEach(async () => {
    for (const orderId of createdOrders.splice(0)) {
      await cleanupOrder(orderId).catch(() => undefined);
    }

    for (const promoId of createdPromoIds.splice(0)) {
      await cleanupPromo(promoId).catch(() => undefined);
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

  describe(`POST ${promosUrl}/validate`, () => {
    it('should validate active promo code for cart', async () => {
      const { token } = await registerAndLogin();
      const fixture = await seedProductFixture(`promo-validate-${Date.now()}`);
      const code = `VALID${Date.now()}`;

      try {
        const createResponse = await request(app.getHttpServer())
          .post(adminPromosUrl)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(buildPromoPayload(code))
          .expect(201);

        createdPromoIds.push(createResponse.body.data.id);

        await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            quantity: 1,
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .post(`${promosUrl}/validate`)
          .set('Authorization', `Bearer ${token}`)
          .send({ code })
          .expect(201);

        expect(response.body.data).toMatchObject({
          code: code.toUpperCase(),
          discountType: 'percentage',
          discountAmount: expect.any(Number),
        });
        expect(response.body.data.discountAmount).toBeGreaterThan(0);
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });

  describe(`POST ${ordersUrl}/checkout`, () => {
    it('should apply promo code discount during checkout', async () => {
      const { token } = await registerAndLogin();
      const addressId = await createAddress(token);
      const fixture = await seedProductFixture(`promo-checkout-${Date.now()}`);
      const code = `CHECKOUT${Date.now()}`;

      try {
        const createResponse = await request(app.getHttpServer())
          .post(adminPromosUrl)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(buildPromoPayload(code))
          .expect(201);

        createdPromoIds.push(createResponse.body.data.id);

        await request(app.getHttpServer())
          .post(`${cartUrl}/items`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: fixture.productId,
            quantity: 1,
          })
          .expect(201);

        const response = await request(app.getHttpServer())
          .post(`${ordersUrl}/checkout`)
          .set('Authorization', `Bearer ${token}`)
          .send({
            shippingAddressId: addressId,
            courier: 'JNE Reguler',
            promoCode: code,
          })
          .expect(201);

        const orderId = response.body.data.id as string;
        createdOrders.push(orderId);

        expect(response.body.data.discountAmount).toBeGreaterThan(0);
        expect(response.body.data.total).toBeLessThan(
          response.body.data.subtotal + response.body.data.shippingCost,
        );
      } finally {
        await cleanupProductFixture(fixture);
      }
    });
  });

  describe(`GET ${adminPromosUrl}`, () => {
    it('should list promos for admin', async () => {
      const code = `ADMIN${Date.now()}`;
      const createResponse = await request(app.getHttpServer())
        .post(adminPromosUrl)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(buildPromoPayload(code))
        .expect(201);

      createdPromoIds.push(createResponse.body.data.id);

      const response = await request(app.getHttpServer())
        .get(adminPromosUrl)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.data.id,
            code: code.toUpperCase(),
          }),
        ]),
      );
    });
  });
});
