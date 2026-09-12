import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5433/toko_elektronik',
      CLOUDINARY_CLOUD_NAME:
        process.env.CLOUDINARY_CLOUD_NAME ?? 'test-cloud',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? 'test-api-key',
      CLOUDINARY_API_SECRET:
        process.env.CLOUDINARY_API_SECRET ?? 'test-api-secret',
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-jwt-secret',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',
    },
  },
});
