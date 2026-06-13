-- VF Agent sync: additive columns + backfill support (never deletes agents)

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS prompt_version TEXT NOT NULL DEFAULT 'vf-2.0';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS output_schema JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS quality_gates JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS related_agents TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS required_inputs TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS optional_tools TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS phase INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_agents_workspace_slug ON public.agents (workspace_id, slug);

DROP TRIGGER IF EXISTS agents_updated_at ON public.agents;
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Ensure workspace-scoped slug uniqueness for idempotent sync (partial index already exists from 003)
CREATE UNIQUE INDEX IF NOT EXISTS agents_workspace_slug_idx
  ON public.agents (workspace_id, slug)
  WHERE workspace_id IS NOT NULL;

COMMENT ON COLUMN public.agents.skills IS 'VF skill IDs from @vf/shared definitions';
COMMENT ON COLUMN public.agents.config IS 'Agent runtime config including system_prompt snapshot';
