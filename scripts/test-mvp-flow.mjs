// End-to-end MVP test: signup → workspace bootstrap → agents → settings →
// api keys → tasks → logs → approvals → integrations → reports. Cleans up after.
import 'dotenv/config';

const API = 'http://localhost:4000/api/v1';
const email = `mvp-test-${Date.now()}@valiantfirm-test.com`;
const password = 'Test-Passw0rd-9182!';
let token = null;
let failures = 0;

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// 1. health
const health = await fetch('http://localhost:4000/health').then((r) => r.json());
check('health endpoint', health.status === 'ok');

// 2. signup + signin
const signup = await call('POST', '/auth/signup', { email, password, full_name: 'MVP Tester' });
check('signup', signup.status === 201 || signup.status === 200, JSON.stringify(signup.data).slice(0, 100));
const signin = await call('POST', '/auth/signin', { email, password });
check('signin', Boolean(signin.data?.session?.access_token));
token = signin.data.session.access_token;
const userId = signin.data.user.id;

// 3. workspace bootstrap (signup trigger should have created the default one)
const ws = await call('POST', '/workspaces/ensure-default');
check('ensure-default workspace', Array.isArray(ws.data) && ws.data.length > 0, `${ws.data?.length} workspace(s): ${ws.data?.[0]?.name}`);
const wsId = ws.data[0].id;

// 4. workspace agents (seeded by trigger)
const agents = await call('GET', `/agents?workspace_id=${wsId}`);
check('workspace agents seeded', Array.isArray(agents.data) && agents.data.length === 12, `${agents.data?.length} agents`);

// 5. app settings (auto-created by trigger) + save with provider switch
const settings = await call('GET', `/settings/app?workspace_id=${wsId}`);
check('app settings load', settings.data?.default_provider === 'openai');
const saved = await call('PUT', '/settings/app', { workspace_id: wsId, default_provider: 'deepseek' });
check('settings save (deepseek)', saved.data?.default_provider === 'deepseek' && saved.data?.default_model === 'deepseek-chat', `model=${saved.data?.default_model}`);

// 6. api key save (encrypted) + preview + delete
const key = await call('POST', '/settings/api-keys', { workspace_id: wsId, provider: 'deepseek', label: 'test', key: 'sk-test-1234567890abcd' });
check('api key save', Boolean(key.data?.key_preview), `preview=${key.data?.key_preview}`);
const keys = await call('GET', `/settings/api-keys?workspace_id=${wsId}`);
check('api key list hides raw key', keys.data?.length === 1 && !JSON.stringify(keys.data).includes('sk-test-1234567890abcd'));
const del = await call('DELETE', `/settings/api-keys/${key.data.id}`);
check('api key delete', del.data?.deleted === true);

// 7. manual task with approval
const task = await call('POST', '/tasks', { workspace_id: wsId, title: 'Test approval task', priority: 'high', task_type: 'seo', requires_approval: true });
check('task create (needs approval)', task.data?.status === 'needs_approval');
const statusUpd = await call('PATCH', `/tasks/${task.data.id}/status`, { status: 'in_progress' });
check('task status update', statusUpd.data?.status === 'in_progress');

// 8. approvals: list pending + approve
const approvals = await call('GET', `/approvals?workspace_id=${wsId}&status=pending`);
check('approval created', approvals.data?.length === 1, `title=${approvals.data?.[0]?.title}`);
const review = await call('POST', `/approvals/${approvals.data[0].id}/review`, { approved: true });
check('approval approve', review.data?.status === 'approved' && Boolean(review.data?.approved_at));

// 9. live logs accumulated from all the above
const logs = await call('GET', `/logs?workspace_id=${wsId}`);
check('live logs written', Array.isArray(logs.data) && logs.data.length >= 4, `${logs.data?.length} log entries`);

// 10. integrations
const integrations = await call('GET', `/integrations?workspace_id=${wsId}`);
check('integrations list', integrations.data?.length === 8);
const intSave = await call('PUT', '/integrations/web-search', { workspace_id: wsId, config: { engine: 'test' } });
check('integration configure', intSave.data?.status === 'configured');

// 11. reports summary
const report = await call('GET', `/reports/summary?workspace_id=${wsId}`);
check('reports summary', report.data?.total_tasks === 1 && report.data?.active_agents === 12, JSON.stringify(report.data));

// 12. clients create (website/location mapping)
const clientRes = await call('POST', '/clients', { workspace_id: wsId, name: 'Test Client', domain: 'example.com', service_area: 'Tampa, FL', industry: 'Roofing' });
check('client create maps website/location', clientRes.data?.website === 'example.com' && clientRes.data?.location === 'Tampa, FL');

// cleanup: delete test user via admin API
const { createClient } = await import('@supabase/supabase-js');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { error: delErr } = await admin.auth.admin.deleteUser(userId);
console.log(delErr ? `cleanup failed: ${delErr.message}` : 'cleanup: test user deleted');

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
