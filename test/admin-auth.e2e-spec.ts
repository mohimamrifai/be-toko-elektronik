import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import {
  closeAdminAuthPool,
  loginAsAdmin,
  registerAndLoginAsCustomer,
} from './helpers/admin-auth.helper.js';

describe('Admin auth (e2e)', () => {
  let app: INestApplication<App>;

  const adminCategoriesUrl = '/api/v1/admin/categories';

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
    await closeAdminAuthPool();
  });

  it('should return 401 for unauthenticated admin requests', async () => {
    await request(app.getHttpServer()).get(adminCategoriesUrl).expect(401);
  });

  it('should return 403 for customer access to admin endpoints', async () => {
    const { accessToken } = await registerAndLoginAsCustomer(app);

    await request(app.getHttpServer())
      .get(adminCategoriesUrl)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('should allow admin access to admin endpoints', async () => {
    const adminToken = await loginAsAdmin(app);

    const response = await request(app.getHttpServer())
      .get(adminCategoriesUrl)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.data).toBeInstanceOf(Array);
  });
});
