import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './client/lib/db/sqlite.ts',
  out: './migrations',
  dbCredentials: {
    url: 'file:./school-mis.db',
  },
});
