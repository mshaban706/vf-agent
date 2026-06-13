#!/usr/bin/env node
/**
 * Verifies VF agents exist per workspace.
 * Usage: npm run verify:agents
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { AGENT_DEFINITIONS } from '../packages/shared/dist/index.js';
import { connectDatabase } from './db-connect.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const EXPECTED = AGENT_DEFINITIONS.length;
const EXPECTED_SLUGS = new Set(AGENT_DEFINITIONS.map((a) => a.slug));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = await connectDatabase(process.env.DATABASE_URL);
  try {
    const { rows: workspaces } = await client.query(
      'SELECT id, name FROM public.workspaces ORDER BY created_at ASC',
    );

    if (workspaces.length === 0) {
      console.log('FAIL: No workspaces found.');
      process.exit(1);
    }

    let allPass = true;

    for (const ws of workspaces) {
      const { rows: agents } = await client.query(
        `SELECT slug, name, status, is_active FROM public.agents
         WHERE workspace_id = $1 AND is_active = true
         ORDER BY name`,
        [ws.id],
      );

      const slugs = agents.map((a) => a.slug);
      const slugSet = new Set(slugs);
      const missing = [...EXPECTED_SLUGS].filter((s) => !slugSet.has(s));
      const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);

      console.log(`\nWorkspace: ${ws.name} (${ws.id})`);
      console.log(`  Total agents: ${agents.length} (expected ${EXPECTED})`);
      console.log(`  Missing (${missing.length}): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`);
      console.log(`  Duplicates: ${duplicates.length}`);

      if (agents.length !== EXPECTED || missing.length > 0 || duplicates.length > 0) {
        allPass = false;
        console.log('  Result: FAIL');
      } else {
        console.log('  Result: PASS');
      }
    }

    const { rows: totalRow } = await client.query('SELECT count(*)::int AS n FROM public.agents');
    console.log(`\nGlobal agent rows (all workspaces): ${totalRow[0].n}`);
    console.log(allPass ? '\nPASS: 40 VF agents are present and visible.' : '\nFAIL: Run npm run sync:agents to fix.');
    process.exit(allPass ? 0 : 1);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
