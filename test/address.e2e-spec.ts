import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('Address (e2e)', () => {
  let app: INestApplication<App>;
  const createdAddresses: Array<{ id: string; token: string }> = [];

  const authUrl = '/api/v1/auth';
  const addressesUrl = '/api/v1/addresses';

  const samplePayload = {
    label: 'Rumah',
    recipientName: 'Budi Santoso',
    phone: '+6281234567890',
    fullAddress: 'Jl. Merdeka No. 10',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    postalCode: '12345',
  };

  async function registerAndLogin() {
    const email = `address-${Date.now()}-${Math.random()}@example.com`;

    const registerResponse = await request(app.getHttpServer())
      .post(`${authUrl}/register`)
      .send({
        name: 'Address User',
        email,
        password: 'Password123!',
      })
      .expect(201);

    return {
      token: registerResponse.body.data.accessToken as string,
    };
  }

  function trackAddress(id: string, token: string) {
    createdAddresses.push({ id, token });
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
    for (const entry of createdAddresses.splice(0)) {
      await request(app.getHttpServer())
        .delete(`${addressesUrl}/${entry.id}`)
        .set('Authorization', `Bearer ${entry.token}`)
        .catch(() => undefined);
    }

    await app.close();
  });

  describe(`GET ${addressesUrl}`, () => {
    it('should return list of addresses for authenticated user', async () => {
      const { token } = await registerAndLogin();

      const createResponse = await request(app.getHttpServer())
        .post(addressesUrl)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...samplePayload,
          isDefault: true,
        })
        .expect(201);
      trackAddress(createResponse.body.data.id, token);

      const response = await request(app.getHttpServer())
        .get(addressesUrl)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createResponse.body.data.id,
            recipientName: 'Budi Santoso',
            isDefault: true,
          }),
        ]),
      );
    });

    it('should return 401 without bearer token', async () => {
      await request(app.getHttpServer()).get(addressesUrl).expect(401);
    });
  });

  describe(`GET ${addressesUrl}/:id`, () => {
    it('should return an address by id', async () => {
      const { token } = await registerAndLogin();

      const createResponse = await request(app.getHttpServer())
        .post(addressesUrl)
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload)
        .expect(201);
      trackAddress(createResponse.body.data.id, token);

      const response = await request(app.getHttpServer())
        .get(`${addressesUrl}/${createResponse.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: createResponse.body.data.id,
        recipientName: 'Budi Santoso',
        city: 'Jakarta Selatan',
      });
    });

    it('should return 404 when address not found', async () => {
      const { token } = await registerAndLogin();

      await request(app.getHttpServer())
        .get(`${addressesUrl}/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe(`POST ${addressesUrl}`, () => {
    it('should create an address', async () => {
      const { token } = await registerAndLogin();

      const response = await request(app.getHttpServer())
        .post(addressesUrl)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...samplePayload,
          isDefault: true,
        })
        .expect(201);
      trackAddress(response.body.data.id, token);

      expect(response.body.data).toMatchObject({
        ...samplePayload,
        isDefault: true,
      });
    });
  });

  describe(`PATCH ${addressesUrl}/:id`, () => {
    it('should update an address and keep only one default', async () => {
      const { token } = await registerAndLogin();

      const firstResponse = await request(app.getHttpServer())
        .post(addressesUrl)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...samplePayload,
          label: 'Rumah',
          isDefault: true,
        })
        .expect(201);
      trackAddress(firstResponse.body.data.id, token);

      const secondResponse = await request(app.getHttpServer())
        .post(addressesUrl)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...samplePayload,
          label: 'Kantor',
          recipientName: 'Budi Kantor',
          fullAddress: 'Jl. Sudirman No. 1',
        })
        .expect(201);
      trackAddress(secondResponse.body.data.id, token);

      await request(app.getHttpServer())
        .patch(`${addressesUrl}/${secondResponse.body.data.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isDefault: true })
        .expect(200);

      const listResponse = await request(app.getHttpServer())
        .get(addressesUrl)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const firstAddress = listResponse.body.data.find(
        (address: { id: string }) => address.id === firstResponse.body.data.id,
      );
      const secondAddress = listResponse.body.data.find(
        (address: { id: string }) => address.id === secondResponse.body.data.id,
      );

      expect(firstAddress.isDefault).toBe(false);
      expect(secondAddress.isDefault).toBe(true);
    });
  });

  describe(`DELETE ${addressesUrl}/:id`, () => {
    it('should remove an address by id', async () => {
      const { token } = await registerAndLogin();

      const createResponse = await request(app.getHttpServer())
        .post(addressesUrl)
        .set('Authorization', `Bearer ${token}`)
        .send(samplePayload)
        .expect(201);

      const addressId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .delete(`${addressesUrl}/${addressId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`${addressesUrl}/${addressId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
