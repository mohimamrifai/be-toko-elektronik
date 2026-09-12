import {
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['customer', 'admin']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('customer').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
