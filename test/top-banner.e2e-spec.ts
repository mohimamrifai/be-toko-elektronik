import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('TopBanner (e2e)', () => {
  let app: INestApplication<App>;
  const createdBannerIds: string[] = [];

  const publicUrl = '/api/v1/top-banner';
  const adminUrl = '/api/v1/admin/top-banner';

  function trackBanner(id: string) {
    createdBannerIds.push(id);
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
    for (const id of createdBannerIds.splice(0)) {
      await request(app.getHttpServer())
        .delete(`${adminUrl}/${id}`)
        .catch(() => undefined);
    }

    await app.close();
  });

  describe(`GET ${publicUrl}`, () => {
    it('should return list of active top banners', async () => {
      const response = await request(app.getHttpServer())
        .get(publicUrl)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0]).toMatchObject({
        message: expect.any(String),
        href: expect.any(String),
      });
      expect(response.body.data[0].isActive).toBeUndefined();
    });
  });

  describe(`GET ${publicUrl}/:id`, () => {
    it('should return an active top banner by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          message: 'Public banner',
          href: '/promo/public',
        })
        .expect(201);
      trackBanner(createResponse.body.data.id);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${publicUrl}/${bannerId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        message: 'Public banner',
        href: '/promo/public',
      });
    });

    it('should return 404 for inactive top banner on public endpoint', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          message: 'Inactive banner',
          href: '/promo/inactive',
          isActive: false,
        })
        .expect(201);
      trackBanner(createResponse.body.data.id);

      await request(app.getHttpServer())
        .get(`${publicUrl}/${createResponse.body.data.id}`)
        .expect(404);
    });
  });

  describe(`POST ${adminUrl}`, () => {
    it('should create a top banner', async () => {
      const payload = {
        message: 'Banner e2e test',
        href: '/promo/e2e-test',
      };

      const response = await request(app.getHttpServer())
        .post(adminUrl)
        .send(payload)
        .expect(201);
      trackBanner(response.body.data.id);

      expect(response.body.data).toMatchObject({
        ...payload,
        isActive: true,
        sortOrder: 0,
      });
      expect(response.body.data.createdAt).toBeDefined();
    });
  });

  describe(`GET ${adminUrl}`, () => {
    it('should return all top banners including inactive', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          message: 'Inactive admin list',
          href: '/promo/inactive-admin',
          isActive: false,
        })
        .expect(201);
      trackBanner(createResponse.body.data.id);

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
    it('should return a top banner by id with admin fields', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          message: 'Banner for admin get',
          href: '/promo/admin-get',
        })
        .expect(201);
      trackBanner(createResponse.body.data.id);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${adminUrl}/${bannerId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        message: 'Banner for admin get',
        href: '/promo/admin-get',
        isActive: true,
      });
    });

    it('should return 404 when top banner not found', () => {
      return request(app.getHttpServer())
        .get(`${adminUrl}/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });
  });

  describe(`PATCH ${adminUrl}/:id`, () => {
    it('should update a top banner by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          message: 'Banner to update',
          href: '/promo/to-update',
        })
        .expect(201);
      trackBanner(createResponse.body.data.id);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`${adminUrl}/${bannerId}`)
        .send({
          message: 'Banner updated',
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        message: 'Banner updated',
        href: '/promo/to-update',
      });
    });
  });

  describe(`DELETE ${adminUrl}/:id`, () => {
    it('should remove a top banner by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          message: 'Banner to delete',
          href: '/promo/to-delete',
        })
        .expect(201);
      trackBanner(createResponse.body.data.id);

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
