#!/usr/bin/env node
/** Checks which VF tables exist via the Supabase REST API. */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tables = ['profiles', 'workspaces', 'clients', 'tasks', 'agents', 'agent_logs', 'nonexistent_probe'];
for (const table of tables) {
  const { error, data } = await admin.from(table).select('*').limit(1);
  if (error) {
    console.log(`${table}: MISSING/ERROR [${error.code}] ${error.message}`);
  } else {
    console.log(`${table}: OK (sample rows: ${data.length})`);
  }
}

const { data: users, error: userErr } = await admin.auth.admin.listUsers();
console.log(userErr ? `auth.users: ERROR ${userErr.message}` : `auth.users: ${users.users.length} user(s)`);
