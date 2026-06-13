import { Injectable, Logger } from '@nestjs/common';
import { AGENT_DEFINITIONS, getAgentBySlug, VF_PIPELINES, type PipelineDefinition, isPolarInsulationContext, getPolarContextBlock } from '@vf/shared';
import { SupabaseService } from '../supabase/supabase.service';

export interface ContextPackOptions {
  workspaceId: string;
  clientId?: string;
  taskId?: string;
  agentSlug?: string;
  documentId?: string;
  query?: string;
  useDocumentContext?: boolean;
}

export interface AgentContextPack {
  workspace: Record<string, unknown> | null;
  client: Record<string, unknown> | null;
  task: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  documents: Array<{ id: string; file_name: string; title: string | null; summary: string | null }>;
  chunks: Array<{ source_sheet: string; content: string; chunk_type: string }>;
  previousRuns: Array<Record<string, unknown>>;
  pipeline: PipelineDefinition | null;
  polarProfile: string | null;
  sourcesUsed: string[];
  promptBlock: string;
}

@Injectable()
export class ContextPackService {
  private readonly logger = new Logger(ContextPackService.name);

  constructor(private supabase: SupabaseService) {}

  async build(options: ContextPackOptions): Promise<AgentContextPack> {
    const admin = this.supabase.getAdminClient();
    const sourcesUsed: string[] = [];
    let workspace: Record<string, unknown> | null = null;
    let client: Record<string, unknown> | null = null;
    let task: Record<string, unknown> | null = null;
    let settings: Record<string, unknown> | null = null;
    let pipeline: (typeof VF_PIPELINES)[number] | null = null;

    const { data: ws } = await admin.from('workspaces').select('*').eq('id', options.workspaceId).maybeSingle();
    workspace = ws;
    if (ws) sourcesUsed.push(`workspace:${ws.name}`);

    if (options.clientId) {
      const { data: c } = await admin.from('clients').select('*').eq('id', options.clientId).maybeSingle();
      client = c;
      if (c) sourcesUsed.push(`client:${c.name}`);
    }

    if (options.taskId) {
      const { data: t } = await admin.from('tasks').select('*').eq('id', options.taskId).maybeSingle();
      task = t;
      if (t) {
        sourcesUsed.push(`task:${t.title}`);
        if (t.pipeline_id) {
          pipeline = VF_PIPELINES.find((p) => p.id === t.pipeline_id) ?? null;
          if (pipeline) sourcesUsed.push(`pipeline:${pipeline.name}`);
        }
        if (!options.documentId && t.document_id) options.documentId = t.document_id as string;
      }
    }

    const { data: appSettings } = await admin
      .from('app_settings')
      .select('*')
      .eq('workspace_id', options.workspaceId)
      .maybeSingle();
    settings = appSettings;

    let documents: AgentContextPack['documents'] = [];
    let chunks: AgentContextPack['chunks'] = [];

    const useDocs = options.useDocumentContext !== false;
    if (useDocs) {
      let docQuery = admin
        .from('client_documents')
        .select('id, file_name, title, summary, client_id')
        .eq('workspace_id', options.workspaceId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (options.documentId) docQuery = docQuery.eq('id', options.documentId);
      else if (options.clientId) docQuery = docQuery.eq('client_id', options.clientId);

      const { data: docs } = await docQuery;
      documents = (docs ?? []) as AgentContextPack['documents'];

      const docIds = documents.map((d) => d.id);
      if (docIds.length) {
        let chunkQuery = admin
          .from('document_chunks')
          .select('source_sheet, content, chunk_type, document_id')
          .in('document_id', docIds)
          .order('created_at', { ascending: true })
          .limit(40);

        if (options.query) {
          const q = options.query.toLowerCase();
          const { data: allChunks } = await chunkQuery;
          chunks = (allChunks ?? [])
            .filter(
              (ch) =>
                (ch.content as string).toLowerCase().includes(q) ||
                (ch.source_sheet as string)?.toLowerCase().includes(q),
            )
            .slice(0, 25)
            .map((ch) => ({
              source_sheet: ch.source_sheet as string,
              content: (ch.content as string).slice(0, 3000),
              chunk_type: ch.chunk_type as string,
            }));
        } else {
          const { data: allChunks } = await chunkQuery;
          chunks = (allChunks ?? []).map((ch) => ({
            source_sheet: ch.source_sheet as string,
            content: (ch.content as string).slice(0, 3000),
            chunk_type: ch.chunk_type as string,
          }));
        }

        for (const d of documents) {
          sourcesUsed.push(`document:${d.file_name}`);
        }
        for (const ch of chunks) {
          if (ch.source_sheet) sourcesUsed.push(`sheet:${ch.source_sheet}`);
        }
      }
    }

    let previousRuns: Array<Record<string, unknown>> = [];
    if (options.agentSlug && options.workspaceId) {
      const { data: runs } = await admin
        .from('agent_runs')
        .select('agent_slug, status, markdown_output, output_quality, created_at')
        .eq('workspace_id', options.workspaceId)
        .eq('agent_slug', options.agentSlug)
        .order('created_at', { ascending: false })
        .limit(3);
      previousRuns = runs ?? [];
    }

    const clientName = client?.name as string | undefined;
    const fileName = documents[0]?.file_name;
    const polarProfile =
      isPolarInsulationContext(clientName, fileName) || isPolarInsulationContext(undefined, options.query)
        ? getPolarContextBlock()
        : null;
    if (polarProfile) sourcesUsed.push('profile:polar-insulation');

    const agent = options.agentSlug ? getAgentBySlug(options.agentSlug) : null;
    const promptBlock = this.formatPromptBlock({
      workspace,
      client,
      task,
      settings,
      documents,
      chunks,
      previousRuns,
      pipeline,
      polarProfile,
      agentName: agent?.name,
      query: options.query,
    });

    return {
      workspace,
      client,
      task,
      settings,
      documents,
      chunks,
      previousRuns,
      pipeline,
      polarProfile,
      sourcesUsed,
      promptBlock,
    };
  }

  private formatPromptBlock(parts: {
    workspace: Record<string, unknown> | null;
    client: Record<string, unknown> | null;
    task: Record<string, unknown> | null;
    settings: Record<string, unknown> | null;
    documents: AgentContextPack['documents'];
    chunks: AgentContextPack['chunks'];
    previousRuns: Array<Record<string, unknown>>;
    pipeline: (typeof VF_PIPELINES)[number] | null;
    polarProfile: string | null;
    agentName?: string;
    query?: string;
  }): string {
    const sections: string[] = ['=== VF AGENT CONTEXT PACK ==='];

    if (parts.workspace) {
      sections.push(`WORKSPACE: ${parts.workspace.name} (${parts.workspace.slug})`);
    }
    if (parts.client) {
      sections.push(
        `CLIENT: ${parts.client.name}\nIndustry: ${parts.client.industry ?? 'n/a'}\nWebsite: ${parts.client.website ?? parts.client.domain ?? 'n/a'}\nLocation/Service Area: ${parts.client.location ?? parts.client.service_area ?? 'n/a'}\nRadius: ${parts.client.radius_miles ?? 'n/a'} miles\nNotes: ${parts.client.notes ?? ''}`,
      );
    }
    if (parts.task) {
      sections.push(`TASK: ${parts.task.title}\nCommand: ${parts.task.command ?? parts.task.description ?? ''}\nDepth: ${parts.task.depth_level ?? 'vf95'}`);
    }
    if (parts.pipeline) {
      sections.push(`PIPELINE: ${parts.pipeline.name}\nAgents: ${(parts.pipeline.agent_slugs as string[])?.join(', ')}`);
    }
    if (parts.settings) {
      sections.push(
        `SETTINGS: Provider=${parts.settings.default_provider} Model=${parts.settings.default_model} Sandbox=${parts.settings.sandbox_mode} AutoQA=${parts.settings.auto_quality_improvement ?? true}`,
      );
    }
    if (parts.polarProfile) {
      sections.push(parts.polarProfile);
    }
    if (parts.documents.length) {
      sections.push(
        'UPLOADED DOCUMENTS:\n' +
          parts.documents
            .map((d) => `- ${d.file_name}${d.summary ? `: ${d.summary.slice(0, 500)}` : ''}`)
            .join('\n'),
      );
    }
    if (parts.chunks.length) {
      sections.push(
        'SHEET / DOCUMENT CHUNKS (USE THESE — do not ignore):\n' +
          parts.chunks
            .map((c) => `--- Sheet: ${c.source_sheet || 'general'} (${c.chunk_type}) ---\n${c.content}`)
            .join('\n\n'),
      );
    } else if (parts.documents.length) {
      sections.push('NOTE: Documents uploaded but no parsed chunks found. Reference document summaries and request sheet re-upload if needed.');
    }
    if (parts.previousRuns.length) {
      sections.push(
        'RECENT AGENT RUNS:\n' +
          parts.previousRuns
            .map((r) => `- ${r.created_at}: ${r.status} (VF score: ${(r.output_quality as Record<string, number>)?.vf_standard_score ?? 'n/a'})`)
            .join('\n'),
      );
    }
    if (parts.query) {
      sections.push(`USER QUERY / COMMAND: ${parts.query}`);
    }
    sections.push(`TOTAL AGENTS IN DIRECTORY: ${AGENT_DEFINITIONS.length}`);
    sections.push('=== END CONTEXT PACK ===');
    return sections.join('\n\n');
  }
}
