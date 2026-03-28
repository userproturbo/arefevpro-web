import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { Users } from '@/payload/collections/users';
import { payloadGlobals } from '@/payload/globals';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, 'src'),
    },
    meta: {
      title: 'ArefevPro CMS',
      description: 'Admin panel for the ArefevPro media platform.',
    },
  },
  collections: [Users],
  cors: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
  csrf: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
  }),
  globals: payloadGlobals,
  routes: {
    admin: '/admin',
  },
  secret: process.env.PAYLOAD_SECRET || 'change-me',
  serverURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload/payload-types.ts'),
  },
});
