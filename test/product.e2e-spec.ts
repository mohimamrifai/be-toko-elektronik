import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import {
  closeProductSeedPool,
  seedProductFixture,
} from './helpers/product-seed.helper.js';

describe('Product (e2e)', () => {
  let app: INestApplication<App>;

  const publicUrl = '/api/v1/products';

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

  describe(`GET ${publicUrl}`, () => {
    it('should return paginated active products', async () => {
      const seeded = await seedProductFixture(`list-${Date.now()}`);

      const response = await request(app.getHttpServer())
        .get(publicUrl)
        .expect(200);

      expect(response.body.data.items).toBeInstanceOf(Array);
      expect(response.body.data.meta).toMatchObject({
        page: 1,
        limit: 12,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
      expect(response.body.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: seeded.productId,
            slug: seeded.slug,
            price: 3499000,
            originalPrice: 4299000,
            rating: 0,
            soldCount: 0,
            image: 'https://placehold.co/600x600/png?text=Primary',
          }),
        ]),
      );
    });

    it('should filter products by category and brand slug', async () => {
      const suffix = `filter-${Date.now()}`;
      const seeded = await seedProductFixture(suffix);

      const response = await request(app.getHttpServer())
        .get(publicUrl)
        .query({
          category: `handphone-${suffix}`,
          brand: `samsung-${suffix}`,
        })
        .expect(200);

      expect(response.body.data.items).toEqual([
        expect.objectContaining({
          id: seeded.productId,
          slug: seeded.slug,
        }),
      ]);
    });

    it('should sort products by cheapest price', async () => {
      const suffix = `sort-${Date.now()}`;
      await seedProductFixture(suffix);

      const response = await request(app.getHttpServer())
        .get(publicUrl)
        .query({ sort: 'termurah', limit: 1 })
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].price).toEqual(expect.any(Number));
    });
  });

  describe(`GET ${publicUrl}/:slug`, () => {
    it('should return product detail by slug', async () => {
      const seeded = await seedProductFixture(`detail-${Date.now()}`);

      const response = await request(app.getHttpServer())
        .get(`${publicUrl}/${seeded.slug}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: seeded.productId,
        slug: seeded.slug,
        price: 3499000,
        originalPrice: 4299000,
        rating: 0,
        soldCount: 0,
        stock: 25,
        sku: expect.stringContaining('SKU-'),
        warrantyMonths: 12,
        category: {
          slug: expect.stringContaining('handphone-'),
        },
        brand: {
          slug: expect.stringContaining('samsung-'),
        },
      });
      expect(response.body.data.images).toHaveLength(2);
      expect(response.body.data.specifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ specKey: 'RAM', specValue: '8GB' }),
          expect.objectContaining({ specKey: 'Storage', specValue: '256GB' }),
        ]),
      );
      expect(response.body.data.variants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            variantName: 'Hitam - 256GB',
            finalPrice: 3499000,
          }),
        ]),
      );
    });

    it('should return 404 when product slug not found', async () => {
      await request(app.getHttpServer())
        .get(`${publicUrl}/produk-tidak-ada-${Date.now()}`)
        .expect(404);
    });
  });
});
