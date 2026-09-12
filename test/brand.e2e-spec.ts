import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { cleanupBrandById } from './helpers/e2e-artifact-cleanup.helper.js';
import {
  closeBrandSeedPool,
  seedBrandFixture,
} from './helpers/brand-seed.helper.js';
import { closeProductSeedPool } from './helpers/product-seed.helper.js';

describe('Brand (e2e)', () => {
  let app: INestApplication<App>;
  const seededBrandIds: string[] = [];

  const publicUrl = '/api/v1/brands';

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
    for (const id of seededBrandIds.splice(0)) {
      await cleanupBrandById(id);
    }

    await app.close();
  });

  afterAll(async () => {
    await closeBrandSeedPool();
    await closeProductSeedPool();
  });

  describe(`GET ${publicUrl}`, () => {
    it('should return list of active brands', async () => {
      const brand = await seedBrandFixture(`list-${Date.now()}`);
      seededBrandIds.push(brand.id);

      const response = await request(app.getHttpServer())
        .get(publicUrl)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
          }),
        ]),
      );
      expect(response.body.data[0].isActive).toBeUndefined();
    });
  });

  describe(`GET ${publicUrl}/:slug`, () => {
    it('should return an active brand by slug with product count', async () => {
      const response = await request(app.getHttpServer())
        .get(`${publicUrl}/samsung`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        slug: 'samsung',
        name: expect.any(String),
        productCount: expect.any(Number),
      });
      expect(response.body.data.productCount).toBeGreaterThanOrEqual(1);
    });

    it('should return 404 for inactive brand on public endpoint', async () => {
      const brand = await seedBrandFixture(`inactive-${Date.now()}`, false);
      seededBrandIds.push(brand.id);

      await request(app.getHttpServer())
        .get(`${publicUrl}/${brand.slug}`)
        .expect(404);
    });

    it('should return 404 when brand slug not found', () => {
      return request(app.getHttpServer())
        .get(`${publicUrl}/unknown-brand-${Date.now()}`)
        .expect(404);
    });
  });
});
