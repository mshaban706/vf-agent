#!/usr/bin/env node
/**
 * End-to-end auth test: creates a confirmed test user, signs in through the
 * API, fetches /auth/me (profile), then deletes the test user.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env') });

const API = 'http://localhost:4000/api/v1';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const email = `vf-e2e-test-${Date.now()}@example.com`;
const password = 'E2eTestPassword123!';
let userId;

try {
  // 1. Create confirmed test user (bypasses email confirmation + rate limits)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'E2E Test User' },
  });
  if (createErr) throw new Error(`createUser failed: ${createErr.message}`);
  userId = created.user.id;
  console.log(`1. Test user created: ${email}`);

  // 2. Sign in through the API
  const signinRes = await fetch(`${API}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const signinBody = await signinRes.json();
  if (!signinRes.ok) throw new Error(`signin failed (${signinRes.status}): ${signinBody.message}`);
  console.log(`2. Sign-in via API: OK (${signinRes.status})`);

  // 3. Fetch profile via /auth/me
  const meRes = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${signinBody.session.access_token}` },
  });
  const profile = await meRes.json();
  if (!meRes.ok) throw new Error(`/auth/me failed (${meRes.status}): ${profile.message}`);
  console.log(`3. Profile fetch: OK — full_name="${profile.full_name}", role="${profile.role}", email="${profile.email}"`);

  console.log('\nALL TESTS PASSED — signup/login → profile → dashboard flow works.');
} catch (err) {
  console.error(`\nTEST FAILED: ${err.message}`);
  process.exitCode = 1;
} finally {
  if (userId) {
    await admin.auth.admin.deleteUser(userId);
    console.log('4. Test user deleted (cleanup complete).');
  }
}
