#!/usr/bin/env node
/**
 * Syncs all VF agent definitions into every workspace.
 * Usage: npm run sync:agents
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { AGENT_DEFINITIONS } from '../packages/shared/dist/index.js';
import { connectDatabase } from './db-connect.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const EXPECTED = AGENT_DEFINITIONS.length;

function agentType(def) {
  return def.tags?.[0] ?? 'specialist';
}

async function syncWorkspace(client, workspaceId) {
  const { rows: beforeRows } = await client.query(
    'SELECT slug FROM public.agents WHERE workspace_id = $1 AND is_active = true',
    [workspaceId],
  );
  const beforeCount = beforeRows.length;
  let inserted = 0;
  let updated = 0;

  for (const def of AGENT_DEFINITIONS) {
    const config = {
      system_prompt: def.system_prompt,
      skills: def.skills,
      output_schema_key: def.output_schema_key,
      uses_document_context: def.uses_document_context,
      phase: def.phase,
    };

    const { rows: existing } = await client.query(
      'SELECT id FROM public.agents WHERE workspace_id = $1 AND slug = $2 LIMIT 1',
      [workspaceId, def.slug],
    );

    if (existing.length > 0) {
      await client.query(
        `UPDATE public.agents SET
          name = $1, type = $2, role = $3, description = $4, avatar_color = $5,
          capabilities = $6, permission_scopes = $7, status = 'available', tags = $8,
          skills = $9, config = $10, prompt_version = $11, output_schema = $12,
          quality_gates = $13, related_agents = $14, required_inputs = $15,
          optional_tools = $16, phase = $17, is_active = true, updated_at = NOW()
         WHERE id = $18`,
        [
          def.name,
          agentType(def),
          def.role,
          def.description,
          def.avatar_color,
          JSON.stringify(def.capabilities),
          JSON.stringify(def.permission_scopes),
          def.tags,
          JSON.stringify(def.skills),
          JSON.stringify(config),
          def.prompt_version,
          JSON.stringify({ key: def.output_schema_key }),
          JSON.stringify({ vf_standard_score: 95 }),
          def.related_agents,
          def.required_inputs,
          def.optional_tools,
          def.phase,
          existing[0].id,
        ],
      );
      updated++;
    } else {
      await client.query(
        `INSERT INTO public.agents (
          workspace_id, slug, name, type, role, description, avatar_color,
          capabilities, permission_scopes, status, tags, skills, config,
          prompt_version, output_schema, quality_gates, related_agents,
          required_inputs, optional_tools, phase, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'available', $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, true
        )`,
        [
          workspaceId,
          def.slug,
          def.name,
          agentType(def),
          def.role,
          def.description,
          def.avatar_color,
          JSON.stringify(def.capabilities),
          JSON.stringify(def.permission_scopes),
          def.tags,
          JSON.stringify(def.skills),
          JSON.stringify(config),
          def.prompt_version,
          JSON.stringify({ key: def.output_schema_key }),
          JSON.stringify({ vf_standard_score: 95 }),
          def.related_agents,
          def.required_inputs,
          def.optional_tools,
          def.phase,
        ],
      );
      inserted++;
    }
  }

  const { rows: afterRows } = await client.query(
    'SELECT count(*)::int AS n FROM public.agents WHERE workspace_id = $1 AND is_active = true',
    [workspaceId],
  );

  return {
    workspaceId,
    expected: EXPECTED,
    beforeCount,
    afterCount: afterRows[0].n,
    inserted,
    updated,
  };
}

async function main() {
  execSync('npm run build -w @vf/shared', { cwd: root, stdio: 'inherit' });

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
      console.log('No workspaces found.');
      process.exit(1);
    }

    for (const ws of workspaces) {
      const result = await syncWorkspace(client, ws.id);
      console.log(`\n${ws.name} (${ws.id})`);
      console.log(
        `  Before: ${result.beforeCount} | After: ${result.afterCount} | Inserted: ${result.inserted} | Updated: ${result.updated}`,
      );
      if (result.afterCount < EXPECTED) {
        console.error(`  ERROR: Expected ${EXPECTED} agents, got ${result.afterCount}`);
        process.exit(1);
      }
    }

    console.log(`\nSuccess: ${EXPECTED} VF agents synced for ${workspaces.length} workspace(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
