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
    },
  },
});
