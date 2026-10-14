import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// The CLI (migrations) uses the direct connection; the app uses the pooled DATABASE_URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Run with `npm run db:seed` (prisma db seed). tsx, like `npm run test:race`.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // process.env instead of env(): env() throws when unset, which would break the
    // `prisma generate` postinstall on fresh clones. Migrations still need DIRECT_URL.
    url: process.env.DIRECT_URL ?? '',
  },
});
