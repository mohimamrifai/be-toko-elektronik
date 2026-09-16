import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { INestApplication } from '@nestjs/common';
import { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';
import { users } from '../../src/database/schema/users.schema.js';

const ADMIN_EMAIL = 'admin@tokoelektronik.com';
const ADMIN_PASSWORD = 'Admin123!';

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
});

const db = drizzle(pool, { casing: 'snake_case' });

export async function ensureAdminUser() {
  const [existing] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (!existing) {
    await db.insert(users).values({
      name: 'Admin Toko',
      email: ADMIN_EMAIL,
      phone: '+6281234567001',
      passwordHash: await hash(ADMIN_PASSWORD, 10),
      role: 'admin',
    });
    return;
  }

  if (existing.role !== 'admin') {
    await db
      .update(users)
      .set({
        role: 'admin',
        passwordHash: await hash(ADMIN_PASSWORD, 10),
      })
      .where(eq(users.email, ADMIN_EMAIL));
  }
}

export async function loginAsAdmin(app: INestApplication<App>) {
  await ensureAdminUser();

  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    })
    .expect(201);

  return response.body.data.accessToken as string;
}

export async function registerAndLoginAsCustomer(app: INestApplication<App>) {
  const email = `customer-${Date.now()}@example.com`;
  const password = 'Password123!';

  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      name: 'Test Customer',
      email,
      password,
    })
    .expect(201);

  return {
    accessToken: response.body.data.accessToken as string,
    email,
    password,
  };
}

export function withAdminAuth(token: string) {
  return {
    authorization: `Bearer ${token}`,
  };
}

export async function closeAdminAuthPool() {
  await pool.end();
}
