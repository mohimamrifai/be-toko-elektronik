import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DRIZZLE } from './database.constants.js';
import * as schema from './schema/index.js';

export const drizzleProvider = {
  provide: DRIZZLE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const pool = new Pool({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });

    return drizzle(pool, { schema, casing: 'snake_case' });
  },
};
