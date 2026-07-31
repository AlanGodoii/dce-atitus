import path from 'node:path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: path.join('src', 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join('src', 'prisma', 'migrations'),
    seed: 'node src/prisma/seed.js',
  },
});
