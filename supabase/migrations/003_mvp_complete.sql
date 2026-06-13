-- VF Agent Command Center — Migration 003: complete MVP schema
-- Adds: agent_runs, live_logs, api_keys, app_settings, integrations tables,
-- workspace-scoped agents, default workspace/agents/settings on signup,
-- backfill for existing users, and RLS for everything.
-- Idempotent — safe to run multiple times.

-- ════════════════════════════════════════════════════════════
-- 1. COLUMN ADDITIONS to existing tables
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS agent_slug TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS input JSONB DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS output JSONB DEFAULT '{}';

-- allow the 'needs_approval' status
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check CHECK (
  status IN ('pending', 'planning', 'in_progress', 'qa_review', 'needs_approval', 'completed', 'failed', 'cancelled')
);

ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- backfill approvals.workspace_id from the parent task
UPDATE public.approvals a
SET workspace_id = t.workspace_id
FROM public.tasks t
WHERE a.task_id = t.id AND a.workspace_id IS NULL;

-- workspace-scoped agents (NULL workspace_id = global catalog row)
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS agents_global_slug_idx ON public.agents (slug) WHERE workspace_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agents_workspace_slug_idx ON public.agents (workspace_id, slug) WHERE workspace_id IS NOT NULL;

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'admin';

-- ════════════════════════════════════════════════════════════
-- 2. NEW TABLES
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_slug TEXT,
  provider TEXT,
  model TEXT,
  status TEXT DEFAULT 'queued',
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.live_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_slug TEXT,
  level TEXT DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  label TEXT,
  encrypted_key TEXT NOT NULL,
  key_preview TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, provider, label)
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  default_provider TEXT DEFAULT 'openai',
  default_model TEXT DEFAULT 'gpt-4o',
  require_email_approval BOOLEAN DEFAULT TRUE,
  require_wordpress_approval BOOLEAN DEFAULT TRUE,
  require_ads_approval BOOLEAN DEFAULT TRUE,
  require_file_delete_approval BOOLEAN DEFAULT TRUE,
  sandbox_mode BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  type TEXT,
  status TEXT DEFAULT 'not_connected',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_live_logs_workspace ON public.live_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON public.agent_runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_slug ON public.agent_runs(agent_slug);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_workspace ON public.agents(workspace_id);

-- ════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY for new tables
-- ════════════════════════════════════════════════════════════

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view agent runs" ON public.agent_runs;
CREATE POLICY "Members can view agent runs" ON public.agent_runs
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members can view live logs" ON public.live_logs;
CREATE POLICY "Members can view live logs" ON public.live_logs
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS "Members can insert live logs" ON public.live_logs;
CREATE POLICY "Members can insert live logs" ON public.live_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_workspace_member(workspace_id));

-- API keys: strictly owner-only (not even workspace members)
DROP POLICY IF EXISTS "Owners manage own api keys" ON public.api_keys;
CREATE POLICY "Owners manage own api keys" ON public.api_keys
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members manage app settings" ON public.app_settings;
CREATE POLICY "Members manage app settings" ON public.app_settings
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members manage integrations" ON public.integrations;
CREATE POLICY "Members manage integrations" ON public.integrations
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- workspace-scoped agents: members can view/manage their workspace agents
DROP POLICY IF EXISTS "Members manage workspace agents" ON public.agents;
CREATE POLICY "Members manage workspace agents" ON public.agents
  FOR ALL TO authenticated
  USING (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
  WITH CHECK (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id));

-- updated_at triggers for new tables
DROP TRIGGER IF EXISTS api_keys_updated_at ON public.api_keys;
CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS app_settings_updated_at ON public.app_settings;
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS integrations_updated_at ON public.integrations;
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ════════════════════════════════════════════════════════════
-- 4. DEFAULT WORKSPACE SEEDING (agents + settings)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.seed_workspace_defaults(ws_id UUID, owner UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.app_settings (workspace_id, user_id)
  VALUES (ws_id, owner)
  ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.agents (workspace_id, slug, name, role, description, avatar_color, capabilities, permission_scopes, status, tags)
  VALUES
    (ws_id, 'manager', 'Manager Agent', 'Orchestrator', 'Analyzes commands, creates task plans, assigns work, tracks progress, and delivers final output.', '#D4AF37', '["planning","delegation","review","synthesis"]', '["read:all","write:tasks","assign:agents"]', 'available', ARRAY['core','orchestration']),
    (ws_id, 'automation', 'Automation Agent', 'Workflow Automator', 'Connects Google Sheets, Gmail, Calendar, WordPress, Supabase, WhatsApp, CRM workflows.', '#94A3B8', '["sheets","gmail","calendar","wordpress","crm","workflows"]', '["read:tools","write:automations","execute:tools"]', 'available', ARRAY['automation','tools']),
    (ws_id, 'competitor-research', 'Competitor Research Agent', 'Competitive Analyst', 'Finds competitors, analyzes weak points, ranking pages, content depth, and gap reports.', '#F87171', '["competitor_discovery","ranking_analysis","content_depth","gap_reports"]', '["read:web","write:outputs"]', 'available', ARRAY['research','seo']),
    (ws_id, 'content-seo', 'Content SEO Agent', 'Content Strategist', 'Writes service pages, city pages, blog outlines, FAQs with EEAT, semantic entities, and conversion CTAs.', '#A78BFA', '["service_pages","city_pages","blog_outlines","faqs","eeat","ctas"]', '["read:web","write:outputs","write:drafts"]', 'available', ARRAY['content','seo']),
    (ws_id, 'cro', 'CRO Agent', 'Conversion Optimizer', 'Reviews landing pages, improves CTAs, trust blocks, form conversion, and page layout.', '#E879F9', '["landing_review","cta_optimization","trust_blocks","form_conversion"]', '["read:web","write:outputs"]', 'available', ARRAY['cro','conversion']),
    (ws_id, 'google-ads', 'Google Ads Agent', 'PPC Strategist', 'Builds campaigns, ad groups, keywords, negatives, headlines, descriptions, landing page alignment.', '#FBBF24', '["campaign_structure","ad_copy","keyword_bidding","landing_alignment"]', '["read:web","write:outputs","write:drafts"]', 'available', ARRAY['ads','ppc']),
    (ws_id, 'keyword-research', 'Keyword Research Agent', 'Keyword Analyst', 'Finds service, local, near-me, AEO/GEO, buyer intent, and commercial intent keywords with location tabs.', '#60A5FA', '["service_keywords","local_keywords","intent_clustering","location_tabs","aeo_questions"]', '["read:web","write:outputs"]', 'available', ARRAY['keywords','seo']),
    (ws_id, 'local-seo', 'Local SEO / GBP Agent', 'Local SEO Specialist', 'GBP optimization, posts, Q&A, review templates, location entity optimization, service area structure.', '#34D399', '["gbp_optimization","local_posts","review_templates","service_areas"]', '["read:web","write:outputs","write:drafts"]', 'available', ARRAY['local','gbp']),
    (ws_id, 'reporting', 'Reporting Agent', 'Analytics Reporter', 'Creates monthly SEO reports with MoM growth, rankings, backlinks, traffic, and 30-day focus plans.', '#38BDF8', '["monthly_reports","rank_tracking","traffic_analysis","focus_plans"]', '["read:analytics","write:outputs","write:reports"]', 'available', ARRAY['reporting','analytics']),
    (ws_id, 'technical-seo', 'Technical SEO Agent', 'Technical Auditor', 'Audits sitemap, robots.txt, schema, indexation, redirects, speed, meta tags, and crawl structure.', '#FB923C', '["crawl_audit","schema","indexation","speed","meta_audit"]', '["read:web","write:outputs"]', 'available', ARRAY['technical','seo']),
    (ws_id, 'link-building', 'Link Building Agent', 'Link Building Specialist', 'Finds link prospects, analyzes backlink gaps, creates outreach templates, and tracks acquired links.', '#C084FC', '["prospect_discovery","backlink_gaps","outreach_templates","link_tracking"]', '["read:web","write:outputs"]', 'available', ARRAY['links','offpage']),
    (ws_id, 'ai-visibility', 'AI Visibility / AEO / GEO Agent', 'AI Search Optimizer', 'Optimizes for AI Overviews, ChatGPT, Perplexity; AEO question targeting, GEO citability, llms.txt, entity signals.', '#22D3EE', '["ai_overviews","aeo_questions","geo_citability","entity_signals"]', '["read:web","write:outputs"]', 'available', ARRAY['aeo','geo','ai'])
  ON CONFLICT (workspace_id, slug) WHERE workspace_id IS NOT NULL DO NOTHING;
EXCEPTION WHEN unique_violation THEN
  NULL; -- already seeded
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- seed automatically whenever a workspace is created
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.seed_workspace_defaults(NEW.id, NEW.owner_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- ════════════════════════════════════════════════════════════
-- 5. SIGNUP TRIGGER: profile + default workspace
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE ws_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'admin'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE owner_id = NEW.id) THEN
    INSERT INTO public.workspaces (name, slug, owner_id, description)
    VALUES ('Valiant Firm Workspace', 'valiant-firm-' || substr(NEW.id::text, 1, 8), NEW.id, 'Default workspace')
    RETURNING id INTO ws_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (ws_id, NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ════════════════════════════════════════════════════════════
-- 6. BACKFILL existing users and workspaces
-- ════════════════════════════════════════════════════════════

-- profiles for users that lack one
INSERT INTO public.profiles (id, email, full_name, role)
SELECT u.id, u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  'admin'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- default workspace for users that have none (trigger seeds agents/settings)
DO $$
DECLARE u RECORD; ws_id UUID;
BEGIN
  FOR u IN
    SELECT au.id FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.owner_id = au.id)
  LOOP
    INSERT INTO public.workspaces (name, slug, owner_id, description)
    VALUES ('Valiant Firm Workspace', 'valiant-firm-' || substr(u.id::text, 1, 8), u.id, 'Default workspace')
    RETURNING id INTO ws_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (ws_id, u.id, 'admin')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- seed defaults for any pre-existing workspaces missing them
DO $$
DECLARE w RECORD;
BEGIN
  FOR w IN SELECT id, owner_id FROM public.workspaces LOOP
    PERFORM public.seed_workspace_defaults(w.id, w.owner_id);
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════
-- 7. Refresh PostgREST schema cache
-- ════════════════════════════════════════════════════════════
SELECT pg_notify('pgrst', 'reload schema');
