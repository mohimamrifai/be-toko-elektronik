import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { StorageService } from '../src/storage/storage.service.js';

describe('PromoSlider (e2e)', () => {
  let app: INestApplication<App>;
  const createdSliderIds: string[] = [];

  const publicUrl = '/api/v1/promo-slider';
  const adminUrl = '/api/v1/admin/promo-slider';

  function trackSlider(id: string) {
    createdSliderIds.push(id);
  }
  const uploadUrl = '/api/v1/storage/upload';
  const mockImageUrl =
    'https://res.cloudinary.com/test-cloud/image/upload/v1/promo-sliders/e2e.jpg';

  const mockStorageService = {
    uploadImage: vi.fn().mockResolvedValue(mockImageUrl),
  };

  const jpegBuffer = Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==',
    'base64',
  );

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .compile();

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
    for (const id of createdSliderIds.splice(0)) {
      await request(app.getHttpServer())
        .delete(`${adminUrl}/${id}`)
        .catch(() => undefined);
    }

    await app.close();
  });

  describe(`POST ${uploadUrl}`, () => {
    it('should upload image and return url', async () => {
      const response = await request(app.getHttpServer())
        .post(uploadUrl)
        .attach('file', jpegBuffer, 'promo.jpg')
        .expect(201);

      expect(mockStorageService.uploadImage).toHaveBeenCalled();
      expect(response.body.data).toEqual({ url: mockImageUrl });
    });
  });

  describe(`GET ${publicUrl}`, () => {
    it('should return list of active promo sliders', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          title: 'Promo list test',
          imageUrl: mockImageUrl,
          href: '/handphone',
        })
        .expect(201);
      trackSlider(createResponse.body.data.id);

      const response = await request(app.getHttpServer())
        .get(publicUrl)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.data.id,
            title: 'Promo list test',
            href: '/handphone',
          }),
        ]),
      );
      expect(response.body.data[0].isActive).toBeUndefined();
    });
  });

  describe(`GET ${publicUrl}/:id`, () => {
    it('should return an active promo slider by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          title: 'Promo for public get',
          imageUrl: mockImageUrl,
          href: '/handphone',
        })
        .expect(201);
      trackSlider(createResponse.body.data.id);

      const sliderId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${publicUrl}/${sliderId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: sliderId,
        title: 'Promo for public get',
        imageUrl: mockImageUrl,
        href: '/handphone',
      });
    });

    it('should return 404 for inactive promo slider on public endpoint', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          title: 'Inactive promo',
          imageUrl: mockImageUrl,
          href: '/handphone',
          isActive: false,
        })
        .expect(201);
      trackSlider(createResponse.body.data.id);

      await request(app.getHttpServer())
        .get(`${publicUrl}/${createResponse.body.data.id}`)
        .expect(404);
    });
  });

  describe(`POST ${adminUrl}`, () => {
    it('should create a promo slider', async () => {
      const payload = {
        title: 'Promo E2E',
        imageUrl: mockImageUrl,
        href: '/handphone',
      };

      const response = await request(app.getHttpServer())
        .post(adminUrl)
        .send(payload)
        .expect(201);
      trackSlider(response.body.data.id);

      expect(response.body.data).toMatchObject({
        ...payload,
        isActive: true,
        sortOrder: 0,
      });
      expect(response.body.data.createdAt).toBeDefined();
    });
  });

  describe(`GET ${adminUrl}/:id`, () => {
    it('should return a promo slider by id with admin fields', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          title: 'Promo for admin get',
          imageUrl: mockImageUrl,
          href: '/categories/handphone',
        })
        .expect(201);
      trackSlider(createResponse.body.data.id);

      const sliderId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`${adminUrl}/${sliderId}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: sliderId,
        title: 'Promo for admin get',
        imageUrl: mockImageUrl,
        href: '/categories/handphone',
        isActive: true,
      });
    });
  });

  describe(`PATCH ${adminUrl}/:id`, () => {
    it('should update a promo slider by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          title: 'Promo to update',
          imageUrl: mockImageUrl,
          href: '/handphone',
        })
        .expect(201);
      trackSlider(createResponse.body.data.id);

      const sliderId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .patch(`${adminUrl}/${sliderId}`)
        .send({
          title: 'Promo updated',
          href: '/categories/handphone',
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: sliderId,
        title: 'Promo updated',
        imageUrl: mockImageUrl,
        href: '/categories/handphone',
      });
    });
  });

  describe(`DELETE ${adminUrl}/:id`, () => {
    it('should remove a promo slider by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(adminUrl)
        .send({
          title: 'Promo to delete',
          imageUrl: mockImageUrl,
          href: '/handphone',
        })
        .expect(201);
      trackSlider(createResponse.body.data.id);

      const sliderId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`${adminUrl}/${sliderId}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${adminUrl}/${sliderId}`)
        .expect(404);
    });
  });
});
