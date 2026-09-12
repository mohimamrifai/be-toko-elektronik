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
  type SeededProductData,
} from './helpers/product-seed.helper.js';

describe('FlashSale (e2e)', () => {
  let app: INestApplication<App>;
  const seededProducts: SeededProductData[] = [];
  const createdFlashSaleIds: string[] = [];

  const publicActiveUrl = '/api/v1/flash-sales/active';
  const adminUrl = '/api/v1/admin/flash-sales';

  function trackProduct(fixture: SeededProductData) {
    seededProducts.push(fixture);
  }

  function trackFlashSale(id: string) {
    createdFlashSaleIds.push(id);
  }

  const getActiveWindow = () => {
    const now = Date.now();

    return {
      startsAt: new Date(now - 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 60 * 60 * 1000).toISOString(),
    };
  };

  const deactivateAllFlashSales = async () => {
    const listResponse = await request(app.getHttpServer())
      .get(adminUrl)
      .expect(200);

    for (const flashSale of listResponse.body.data) {
      if (flashSale.isActive) {
        await request(app.getHttpServer())
          .patch(`${adminUrl}/${flashSale.id}`)
          .send({ isActive: false })
          .expect(200);
      }
    }
  };

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
    for (const id of createdFlashSaleIds.splice(0)) {
      await request(app.getHttpServer())
        .delete(`${adminUrl}/${id}`)
        .catch(() => undefined);
    }

    for (const seeded of seededProducts.splice(0)) {
      await cleanupProductFixture(seeded);
    }

    await app.close();
  });

  afterAll(async () => {
    await closeProductSeedPool();
  });

  describe(`GET ${publicActiveUrl}`, () => {
    it('should return active flash sale with products', async () => {
      await deactivateAllFlashSales();

      const fixture = await seedProductFixture(`flash-active-${Date.now()}`);
      trackProduct(fixture);
      const window = getActiveWindow();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale Active',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          products: [
            {
              productId: fixture.productId,
              flashPrice: '149000',
              stockLimit: 50,
              soldCount: 10,
            },
          ],
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      const response = await request(app.getHttpServer())
        .get(publicActiveUrl)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: createResponse.body.data.id,
        name: 'Flash Sale Active',
      });
      expect(response.body.data.products).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: fixture.productId,
            slug: fixture.slug,
            price: 149000,
            originalPrice: 3499000,
            stockLimit: 50,
            soldCount: 10,
            soldPercentage: 20,
            remainingStock: 40,
          }),
        ]),
      );
      expect(response.body.data.isActive).toBeUndefined();
    });

    it('should return 404 when no active flash sale exists', async () => {
      await deactivateAllFlashSales();

      const now = Date.now();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Future flash sale',
          startsAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
          endsAt: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
          isActive: true,
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      await request(app.getHttpServer()).get(publicActiveUrl).expect(404);
    });
  });

  describe(`POST ${adminUrl}`, () => {
    it('should create a flash sale with products', async () => {
      const fixture = await seedProductFixture(`flash-create-${Date.now()}`);
      trackProduct(fixture);
      const window = getActiveWindow();

      const response = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale Create',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          products: [
            {
              productId: fixture.productId,
              flashPrice: '199000',
              stockLimit: 25,
            },
          ],
        })
        .expect(201);
      trackFlashSale(response.body.data.id);

      expect(response.body.data).toMatchObject({
        name: 'Flash Sale Create',
        isActive: true,
      });
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0]).toMatchObject({
        productId: fixture.productId,
        flashPrice: 199000,
        stockLimit: 25,
        soldCount: 0,
      });
    });
  });

  describe(`GET ${adminUrl}`, () => {
    it('should return all flash sales', async () => {
      const window = getActiveWindow();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale Admin List',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      const response = await request(app.getHttpServer())
        .get(adminUrl)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.data.id,
            name: 'Flash Sale Admin List',
          }),
        ]),
      );
    });
  });

  describe(`GET ${adminUrl}/:id`, () => {
    it('should return flash sale detail with products', async () => {
      const fixture = await seedProductFixture(`flash-get-${Date.now()}`);
      trackProduct(fixture);
      const window = getActiveWindow();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale Detail',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          products: [
            {
              productId: fixture.productId,
              flashPrice: '250000',
              stockLimit: 10,
            },
          ],
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      const flashSaleId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${adminUrl}/${flashSaleId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: flashSaleId,
        name: 'Flash Sale Detail',
      });
      expect(response.body.data.products[0].product.slug).toBe(fixture.slug);
    });
  });

  describe(`PATCH ${adminUrl}/:id`, () => {
    it('should update flash sale metadata', async () => {
      const window = getActiveWindow();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale To Update',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      const flashSaleId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`${adminUrl}/${flashSaleId}`)
        .send({
          name: 'Flash Sale Updated',
          isActive: false,
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: flashSaleId,
        name: 'Flash Sale Updated',
        isActive: false,
      });
    });
  });

  describe(`PUT ${adminUrl}/:id/products`, () => {
    it('should replace flash sale products', async () => {
      const fixture = await seedProductFixture(`flash-sync-${Date.now()}`);
      trackProduct(fixture);
      const window = getActiveWindow();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale Sync Products',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      const flashSaleId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .put(`${adminUrl}/${flashSaleId}/products`)
        .send({
          products: [
            {
              productId: fixture.productId,
              flashPrice: '175000',
              stockLimit: 30,
              soldCount: 5,
            },
          ],
        })
        .expect(200);

      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0]).toMatchObject({
        productId: fixture.productId,
        flashPrice: 175000,
        stockLimit: 30,
        soldCount: 5,
      });
    });
  });

  describe(`PATCH ${adminUrl}/:id/products/:itemId`, () => {
    it('should update a flash sale product item', async () => {
      const fixture = await seedProductFixture(`flash-item-${Date.now()}`);
      trackProduct(fixture);
      const window = getActiveWindow();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale Item Update',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          products: [
            {
              productId: fixture.productId,
              flashPrice: '120000',
              stockLimit: 20,
            },
          ],
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      const flashSaleId = createResponse.body.data.id;
      const itemId = createResponse.body.data.products[0].id;

      const response = await request(app.getHttpServer())
        .patch(`${adminUrl}/${flashSaleId}/products/${itemId}`)
        .send({
          soldCount: 8,
        })
        .expect(200);

      expect(response.body.data.products[0]).toMatchObject({
        id: itemId,
        soldCount: 8,
      });
    });
  });

  describe(`DELETE ${adminUrl}/:id/products/:itemId`, () => {
    it('should remove a product from flash sale', async () => {
      const fixture = await seedProductFixture(`flash-remove-item-${Date.now()}`);
      trackProduct(fixture);
      const window = getActiveWindow();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale Remove Item',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          products: [
            {
              productId: fixture.productId,
              flashPrice: '120000',
              stockLimit: 20,
            },
          ],
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      const flashSaleId = createResponse.body.data.id;
      const itemId = createResponse.body.data.products[0].id;

      const response = await request(app.getHttpServer())
        .delete(`${adminUrl}/${flashSaleId}/products/${itemId}`)
        .expect(200);

      expect(response.body.data.products).toHaveLength(0);
    });
  });

  describe(`DELETE ${adminUrl}/:id`, () => {
    it('should remove a flash sale by id', async () => {
      const window = getActiveWindow();

      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Flash Sale To Delete',
          startsAt: window.startsAt,
          endsAt: window.endsAt,
        })
        .expect(201);
      trackFlashSale(createResponse.body.data.id);

      const flashSaleId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`${adminUrl}/${flashSaleId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${adminUrl}/${flashSaleId}`)
        .expect(404);
    });
  });
});
