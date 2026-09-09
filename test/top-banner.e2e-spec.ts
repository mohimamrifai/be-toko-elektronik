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
    it('should return list of top banners', () => {
      return request(app.getHttpServer())
        .get(baseUrl)
        .expect(200)
        .expect({
          data: [
            {
              id: '1',
              message: '🚀 Free shipping on orders over $50!',
              href: '/promo/free-shipping',
            },
            {
              id: '2',
              message: '⚡ Flash Sale hingga 70% — hanya hari ini!',
              href: '/promo/flash-sale',
            },
          ],
        });
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
    it('should return a top banner by id', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/1`)
        .expect(200)
        .expect({
          data: 'This action returns a #1 topBanner',
        });
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
