import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('Category (e2e)', () => {
  let app: INestApplication<App>;
  const createdCategoryIds: string[] = [];

  const publicUrl = '/api/v1/categories';
  const adminUrl = '/api/v1/admin/categories';

  function trackCategory(id: string) {
    createdCategoryIds.push(id);
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
    for (const id of createdCategoryIds.splice(0)) {
      await request(app.getHttpServer())
        .delete(`${adminUrl}/${id}`)
        .catch(() => undefined);
    }

    await app.close();
  });

  describe(`GET ${publicUrl}`, () => {
    it('should return list of active categories', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Handphone',
          slug: `handphone-${Date.now()}`,
          icon: 'Smartphone',
        })
        .expect(201);
      trackCategory(createResponse.body.data.id);

      const response = await request(app.getHttpServer())
        .get(publicUrl)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.data.id,
            name: 'Handphone',
          }),
        ]),
      );
    });
  });

  describe(`GET ${publicUrl}/:id`, () => {
    it('should return an active category by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Laptop',
          slug: `laptop-${Date.now()}`,
          icon: 'Laptop',
        })
        .expect(201);
      trackCategory(createResponse.body.data.id);

      const categoryId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${publicUrl}/${categoryId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: categoryId,
        name: 'Laptop',
        slug: createResponse.body.data.slug,
        icon: 'Laptop',
      });
    });

    it('should return 404 for inactive category on public endpoint', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Inactive category',
          slug: `inactive-${Date.now()}`,
          isActive: false,
        })
        .expect(201);
      trackCategory(createResponse.body.data.id);

      await request(app.getHttpServer())
        .get(`${publicUrl}/${createResponse.body.data.id}`)
        .expect(404);
    });
  });

  describe(`POST ${adminUrl}`, () => {
    it('should create a category', async () => {
      const payload = {
        name: 'Audio',
        slug: `audio-${Date.now()}`,
        icon: 'Headphones',
        sortOrder: 2,
      };

      const response = await request(app.getHttpServer())
        .post(adminUrl)
        .send(payload)
        .expect(201);
      trackCategory(response.body.data.id);

      expect(response.body.data).toMatchObject({
        ...payload,
        isActive: true,
      });
      expect(response.body.data.createdAt).toBeDefined();
    });
  });

  describe(`GET ${adminUrl}`, () => {
    it('should return all categories including inactive', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Inactive admin list',
          slug: `inactive-admin-${Date.now()}`,
          isActive: false,
        })
        .expect(201);
      trackCategory(createResponse.body.data.id);

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
    it('should return a category by id with admin fields', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Category for admin get',
          slug: `admin-get-${Date.now()}`,
        })
        .expect(201);
      trackCategory(createResponse.body.data.id);

      const categoryId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${adminUrl}/${categoryId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: categoryId,
        name: 'Category for admin get',
        isActive: true,
      });
    });

    it('should return 404 when category not found', () => {
      return request(app.getHttpServer())
        .get(`${adminUrl}/00000000-0000-0000-0000-000000000000`)
        .expect(404);
    });
  });

  describe(`PATCH ${adminUrl}/:id`, () => {
    it('should update a category by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Category to update',
          slug: `to-update-${Date.now()}`,
        })
        .expect(201);
      trackCategory(createResponse.body.data.id);

      const categoryId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`${adminUrl}/${categoryId}`)
        .send({
          name: 'Category updated',
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: categoryId,
        name: 'Category updated',
      });
    });

    it('should toggle category active status', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Category to toggle',
          slug: `to-toggle-${Date.now()}`,
        })
        .expect(201);
      trackCategory(createResponse.body.data.id);

      const categoryId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`${adminUrl}/${categoryId}`)
        .send({
          isActive: false,
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: categoryId,
        isActive: false,
      });

      await request(app.getHttpServer())
        .get(`${publicUrl}/${categoryId}`)
        .expect(404);
    });
  });

  describe(`DELETE ${adminUrl}/:id`, () => {
    it('should remove a category by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          name: 'Category to delete',
          slug: `to-delete-${Date.now()}`,
        })
        .expect(201);
      trackCategory(createResponse.body.data.id);

      const categoryId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`${adminUrl}/${categoryId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${adminUrl}/${categoryId}`)
        .expect(404);
    });
  });
});
