import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('PromoBanner (e2e)', () => {
  let app: INestApplication<App>;

  const publicUrl = '/api/v1/promo-banners';
  const adminUrl = '/api/v1/admin/promo-banners';

  const samplePayload = {
    title: 'Promo Banner E2E',
    subtitle: 'Nikmati diskon spesial untuk produk pilihan.',
    buttonText: 'Belanja Sekarang',
    href: '/categories',
    imageUrl: 'https://placehold.co/1200x400/png?text=Promo+Banner',
    badge: 'Promo Terbatas',
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
    await app.close();
  });

  describe(`GET ${publicUrl}`, () => {
    it('should return list of active promo banners', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          ...samplePayload,
          title: `Promo list ${Date.now()}`,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(publicUrl)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.data.id,
            title: createResponse.body.data.title,
          }),
        ]),
      );
      expect(response.body.data[0].isActive).toBeUndefined();
    });
  });

  describe(`GET ${publicUrl}/:id`, () => {
    it('should return an active promo banner by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          ...samplePayload,
          title: 'Promo for public get',
        })
        .expect(201);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${publicUrl}/${bannerId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        title: 'Promo for public get',
        href: '/categories',
      });
    });

    it('should return 404 for inactive promo banner on public endpoint', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          ...samplePayload,
          title: 'Inactive promo banner',
          isActive: false,
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`${publicUrl}/${createResponse.body.data.id}`)
        .expect(404);
    });
  });

  describe(`POST ${adminUrl}`, () => {
    it('should create a promo banner', async () => {
      const response = await request(app.getHttpServer())
        .post(adminUrl)
        .send(samplePayload)
        .expect(201);

      expect(response.body.data).toMatchObject({
        ...samplePayload,
        isActive: true,
        sortOrder: 0,
      });
    });
  });

  describe(`GET ${adminUrl}`, () => {
    it('should return all promo banners including inactive', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          ...samplePayload,
          title: 'Inactive admin list',
          isActive: false,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(adminUrl)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.data.id,
            isActive: false,
          }),
        ]),
      );
    });
  });

  describe(`GET ${adminUrl}/:id`, () => {
    it('should return a promo banner by id with admin fields', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          ...samplePayload,
          title: 'Promo for admin get',
        })
        .expect(201);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${adminUrl}/${bannerId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        title: 'Promo for admin get',
        isActive: true,
      });
    });

    it('should return 404 when promo banner not found', () => {
      return request(app.getHttpServer())
        .get(`${adminUrl}/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });
  });

  describe(`PATCH ${adminUrl}/:id`, () => {
    it('should update a promo banner by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          ...samplePayload,
          title: 'Promo to update',
        })
        .expect(201);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`${adminUrl}/${bannerId}`)
        .send({
          title: 'Promo updated',
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        title: 'Promo updated',
      });
    });

    it('should toggle promo banner active status', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          ...samplePayload,
          title: 'Promo to toggle',
        })
        .expect(201);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`${adminUrl}/${bannerId}`)
        .send({
          isActive: false,
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        isActive: false,
      });

      await request(app.getHttpServer())
        .get(`${publicUrl}/${bannerId}`)
        .expect(404);
    });
  });

  describe(`DELETE ${adminUrl}/:id`, () => {
    it('should remove a promo banner by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          ...samplePayload,
          title: 'Promo to delete',
        })
        .expect(201);

      const bannerId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`${adminUrl}/${bannerId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${adminUrl}/${bannerId}`)
        .expect(404);
    });
  });
});
