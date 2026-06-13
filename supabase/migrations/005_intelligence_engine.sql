-- Migration 005: VF Intelligence Engine — document context, quality scores, task enrichment
-- Additive only. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  title TEXT,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  document_id UUID NOT NULL REFERENCES public.client_documents(id) ON DELETE CASCADE,
  source_sheet TEXT,
  source_range TEXT,
  chunk_type TEXT DEFAULT 'sheet_tab',
  content TEXT NOT NULL,
  structured_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_slug TEXT,
  context_type TEXT DEFAULT 'execution',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_workspace ON public.client_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_workspace ON public.document_chunks(workspace_id, source_sheet);
CREATE INDEX IF NOT EXISTS idx_agent_context_task ON public.agent_context(task_id);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members manage client documents" ON public.client_documents;
CREATE POLICY "Members manage client documents" ON public.client_documents
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members manage document chunks" ON public.document_chunks;
CREATE POLICY "Members manage document chunks" ON public.document_chunks
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

DROP POLICY IF EXISTS "Members manage agent context" ON public.agent_context;
CREATE POLICY "Members manage agent context" ON public.agent_context
  FOR ALL TO authenticated USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

-- Task intelligence columns
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.client_documents(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS pipeline_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS depth_level TEXT DEFAULT 'vf95';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS use_document_context BOOLEAN DEFAULT TRUE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS require_qa_review BOOLEAN DEFAULT TRUE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS markdown_output TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS json_output JSONB DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS quality_score JSONB DEFAULT '{}';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS context_sources_used JSONB DEFAULT '[]';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS missing_data JSONB DEFAULT '[]';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS next_actions JSONB DEFAULT '[]';

-- Agent run quality
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS output_quality JSONB DEFAULT '{}';
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS markdown_output TEXT;
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS json_output JSONB DEFAULT '{}';
ALTER TABLE public.agent_runs ADD COLUMN IF NOT EXISTS context_sources_used JSONB DEFAULT '[]';

-- Intelligence settings on app_settings
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS default_output_depth TEXT DEFAULT 'vf95';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS always_use_document_context BOOLEAN DEFAULT TRUE;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS auto_quality_improvement BOOLEAN DEFAULT TRUE;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS require_source_labels BOOLEAN DEFAULT TRUE;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS require_missing_data_section BOOLEAN DEFAULT TRUE;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS require_aeo_geo_section BOOLEAN DEFAULT TRUE;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS require_local_seo_section BOOLEAN DEFAULT TRUE;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS require_schema_internal_links BOOLEAN DEFAULT TRUE;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS require_cro_section BOOLEAN DEFAULT TRUE;

DROP TRIGGER IF EXISTS client_documents_updated_at ON public.client_documents;
CREATE TRIGGER client_documents_updated_at BEFORE UPDATE ON public.client_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

SELECT pg_notify('pgrst', 'reload schema');
