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
      expect(response.body.data[0]).toMatchObject({
        message: '🚀 Free shipping on orders over $50!',
        href: '/promo/free-shipping',
      });
      expect(response.body.data[1]).toMatchObject({
        message: '⚡ Flash Sale hingga 70% — hanya hari ini!',
        href: '/promo/flash-sale',
      });
      expect(response.body.data[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe(`POST ${baseUrl}`, () => {
    it('should create a top banner', () => {
      return request(app.getHttpServer())
        .post(baseUrl)
        .send({})
        .expect(201)
        .expect({
          data: 'This action adds a new topBanner',
        });
    });
  });

  describe(`GET ${baseUrl}/:id`, () => {
    it('should return a top banner by id from database', async () => {
      const listResponse = await request(app.getHttpServer())
        .get(baseUrl)
        .expect(200);

      const bannerId = listResponse.body.data[0].id;

      const response = await request(app.getHttpServer())
        .get(`${baseUrl}/${bannerId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: bannerId,
        message: '🚀 Free shipping on orders over $50!',
        href: '/promo/free-shipping',
      });
    });

    it('should return 404 when top banner not found', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });
  });

  describe(`PATCH ${baseUrl}/:id`, () => {
    it('should update a top banner by id', () => {
      return request(app.getHttpServer())
        .patch(`${baseUrl}/2`)
        .send({})
        .expect(200)
        .expect({
          data: 'This action updates a #2 topBanner',
        });
    });
  });

  describe(`DELETE ${baseUrl}/:id`, () => {
    it('should remove a top banner by id', () => {
      return request(app.getHttpServer())
        .delete(`${baseUrl}/3`)
        .expect(200)
        .expect({
          data: 'This action removes a #3 topBanner',
        });
    });
  });
});
