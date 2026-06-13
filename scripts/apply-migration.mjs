#!/usr/bin/env node
/**
 * Applies a SQL migration file to the Supabase Postgres database.
 * Usage: node scripts/apply-migration.mjs supabase/migrations/002_profiles_fix.sql
 *
 * Reads DATABASE_URL from the root .env file. If the direct database host
 * (db.<ref>.supabase.co) is unreachable (it is IPv6-only), this script
 * automatically falls back to the IPv4 session pooler.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const fileArg = process.argv[2];
if (!fileArg) {
  console.error('Usage: node scripts/apply-migration.mjs <path-to-sql-file>');
  process.exit(1);
}

const sql = readFileSync(resolve(root, fileArg), 'utf8');

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set in the root .env file.');
  process.exit(1);
}

const POOLER_REGIONS = [
  'ap-southeast-1', 'ap-south-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'us-east-1', 'us-east-2', 'us-west-1', 'eu-central-1', 'eu-west-1', 'eu-west-2',
  'sa-east-1', 'ca-central-1',
];

async function tryConnect(config) {
  const client = new pg.Client({
    ...config,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  return client;
}

async function connect() {
  try {
    return await tryConnect({ connectionString });
  } catch (err) {
    const url = new URL(connectionString);
    const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname);
    if (!direct) throw err;

    console.log(`Direct host unreachable (${err.message.split('\n')[0]}). Trying IPv4 session pooler...`);
    const projectRef = direct[1];

    for (const prefix of ['aws-1', 'aws-0']) {
      for (const region of POOLER_REGIONS) {
        const host = `${prefix}-${region}.pooler.supabase.com`;
        try {
          const client = await tryConnect({
            host,
            port: 5432,
            user: `postgres.${projectRef}`,
            password: url.password,
            database: 'postgres',
          });
          console.log(`Connected via pooler: ${host}`);
          return client;
        } catch {
          /* try next region */
        }
      }
    }
    throw new Error(
      'Could not reach the database directly or via any session pooler. ' +
        'Run the SQL manually in the Supabase Dashboard SQL Editor instead.',
    );
  }
}

let client;
try {
  console.log('Connecting to database...');
  client = await connect();
  console.log(`Applying migration: ${fileArg}`);
  await client.query(sql);
  console.log('Migration applied successfully.');
} catch (err) {
  console.error(`Migration failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
