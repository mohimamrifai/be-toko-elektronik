import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { Database } from '../database.types.js';
import { users } from '../schema/users.schema.js';

const USER_SEEDS = [
  {
    name: 'Admin Toko',
    email: 'admin@tokoelektronik.com',
    phone: '+6281234567001',
    password: 'Admin123!',
    role: 'admin' as const,
  },
  {
    name: 'Customer Demo',
    email: 'customer@example.com',
    phone: '+6281234567002',
    password: 'Customer123!',
    role: 'customer' as const,
  },
];

export async function seedUsers(db: Database) {
  for (const seedUser of USER_SEEDS) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, seedUser.email))
      .limit(1);

    if (existing) {
      continue;
    }

    await db.insert(users).values({
      name: seedUser.name,
      email: seedUser.email,
      phone: seedUser.phone,
      passwordHash: await hash(seedUser.password, 10),
      role: seedUser.role,
    });
  }
}
