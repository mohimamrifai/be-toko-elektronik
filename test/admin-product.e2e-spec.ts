import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { cleanupProductFixture } from './helpers/e2e-artifact-cleanup.helper.js';
import { loginAsAdmin, registerAndLoginAsCustomer } from './helpers/admin-auth.helper.js';
import {
  closeProductSeedPool,
  seedProductFixture,
  type SeededProductData,
} from './helpers/product-seed.helper.js';

describe('AdminProduct (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  const adminProductsUrl = '/api/v1/admin/products';
  const createdProducts: SeededProductData[] = [];

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
    for (const fixture of createdProducts.splice(0)) {
      await cleanupProductFixture(fixture).catch(() => undefined);
    }

    await app.close();
  });

  afterAll(async () => {
    await closeProductSeedPool();
  });

  it('should return 401 for unauthenticated admin product requests', async () => {
    await request(app.getHttpServer()).get(adminProductsUrl).expect(401);
  });

  it('should return 403 for customer access to admin products', async () => {
    const { accessToken } = await registerAndLoginAsCustomer(app);

    await request(app.getHttpServer())
      .get(adminProductsUrl)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('should create, list, update, and delete admin products', async () => {
    const fixture = await seedProductFixture(`admin-product-${Date.now()}`);
    createdProducts.push(fixture);

    const listResponse = await request(app.getHttpServer())
      .get(`${adminProductsUrl}?search=${fixture.slug}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(listResponse.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fixture.productId,
          slug: fixture.slug,
        }),
      ]),
    );

    const detailResponse = await request(app.getHttpServer())
      .get(`${adminProductsUrl}/${fixture.productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(detailResponse.body.data).toMatchObject({
      id: fixture.productId,
      slug: fixture.slug,
      images: expect.any(Array),
      specifications: expect.any(Array),
      variants: expect.any(Array),
    });

    const updateResponse = await request(app.getHttpServer())
      .patch(`${adminProductsUrl}/${fixture.productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false, stock: 30 })
      .expect(200);

    expect(updateResponse.body.data).toMatchObject({
      isActive: false,
      stock: 30,
    });

    const createResponse = await request(app.getHttpServer())
      .post(adminProductsUrl)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: fixture.categoryId,
        brandId: fixture.brandId,
        name: `Admin Created ${Date.now()}`,
        slug: `admin-created-${Date.now()}`,
        description: 'Produk dibuat dari admin API',
        price: 1999000,
        stock: 5,
        sku: `SKU-ADMIN-${Date.now()}`,
        images: [
          {
            imageUrl: 'https://placehold.co/600x600/png?text=Admin+Product',
            isPrimary: true,
            sortOrder: 1,
          },
        ],
        specifications: [{ specKey: 'Warna', specValue: 'Hitam', sortOrder: 1 }],
        variants: [
          {
            variantName: '128GB',
            priceAdjustment: 0,
            stock: 3,
            sku: `SKU-VAR-ADMIN-${Date.now()}`,
          },
        ],
      })
      .expect(201);

    const createdProductId = createResponse.body.data.id as string;
    createdProducts.push({
      categoryId: fixture.categoryId,
      brandId: fixture.brandId,
      productId: createdProductId,
      slug: createResponse.body.data.slug as string,
    });

    expect(createResponse.body.data).toMatchObject({
      name: expect.stringContaining('Admin Created'),
      stock: 5,
      specifications: expect.arrayContaining([
        expect.objectContaining({ specKey: 'Warna' }),
      ]),
    });

    await request(app.getHttpServer())
      .delete(`${adminProductsUrl}/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    createdProducts.pop();
  });

  it('should return 409 for duplicate slug', async () => {
    const fixture = await seedProductFixture(`duplicate-${Date.now()}`);
    createdProducts.push(fixture);

    await request(app.getHttpServer())
      .post(adminProductsUrl)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId: fixture.categoryId,
        brandId: fixture.brandId,
        name: 'Duplicate Product',
        slug: fixture.slug,
        price: 1000000,
        stock: 1,
        sku: `SKU-DUP-${Date.now()}`,
        images: [
          {
            imageUrl: 'https://placehold.co/600x600/png?text=Duplicate',
            isPrimary: true,
          },
        ],
      })
      .expect(409);
  });
});
