import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('TopBanner (e2e)', () => {
  let app: INestApplication<App>;

  const baseUrl = '/api/v1/top-banner';

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

  describe(`GET ${baseUrl}`, () => {
    it('should return list of top banners from database', async () => {
      const response = await request(app.getHttpServer())
        .get(baseUrl)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: '🚀 Free shipping on orders over $50!',
            href: '/promo/free-shipping',
          }),
        ]),
      );
      expect(response.body.data[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe(`POST ${baseUrl}`, () => {
    it('should create a top banner', async () => {
      const payload = {
        message: 'Banner e2e test',
        href: '/promo/e2e-test',
      };

      const response = await request(app.getHttpServer())
        .post(baseUrl)
        .send(payload)
        .expect(201);

      expect(response.body.data).toMatchObject(payload);
      expect(response.body.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe(`GET ${baseUrl}/:id`, () => {
    it('should return a top banner by id from database', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(baseUrl)
        .send({
          message: 'Banner for get by id',
          href: '/promo/get-by-id',
        })
        .expect(201);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${bannerId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        message: 'Banner for get by id',
        href: '/promo/get-by-id',
      });
    });

    it('should return 404 when top banner not found', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });
  });

  describe(`PATCH ${baseUrl}/:id`, () => {
    it('should update a top banner by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(baseUrl)
        .send({
          message: 'Banner to update',
          href: '/promo/to-update',
        })
        .expect(201);

      const bannerId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${bannerId}`)
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

    it('should return 404 when updating non-existent top banner', () => {
      return request(app.getHttpServer())
        .patch(`${baseUrl}/00000000-0000-0000-0000-000000000000`)
        .send({ message: 'Not found' })
        .expect(404);
    });
  });

  describe(`DELETE ${baseUrl}/:id`, () => {
    it('should remove a top banner by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(baseUrl)
        .send({
          message: 'Banner to delete',
          href: '/promo/to-delete',
        })
        .expect(201);

      const bannerId = createResponse.body.data.id;

      const deleteResponse = await request(app.getHttpServer())
        .delete(`${baseUrl}/${bannerId}`)
        .expect(200);

      expect(deleteResponse.body.data).toMatchObject({
        id: bannerId,
        message: 'Banner to delete',
        href: '/promo/to-delete',
      });

      await request(app.getHttpServer())
        .get(`${baseUrl}/${bannerId}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent top banner', () => {
      return request(app.getHttpServer())
        .delete(`${baseUrl}/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });
  });
});
