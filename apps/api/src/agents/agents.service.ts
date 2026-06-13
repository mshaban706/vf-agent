import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AGENT_DEFINITIONS, getAgentBySlug, VF_PIPELINES } from '@vf/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { IntelligenceService } from '../intelligence/intelligence.service';

export interface AgentSyncResult {
  success: boolean;
  workspaceId: string;
  expected: number;
  beforeCount: number;
  afterCount: number;
  inserted: number;
  updated: number;
  missingSlugs: string[];
}

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly expectedCount = AGENT_DEFINITIONS.length;

  constructor(
    private supabase: SupabaseService,
    private intelligence: IntelligenceService,
  ) {}

  /** Workspace agents synced from VF definitions; always syncs before listing. */
  async list(workspaceId?: string) {
    if (workspaceId) {
      await this.syncValiantFirmAgentsForWorkspace(workspaceId);
      const admin = this.supabase.getAdminClient();
      const { data, error } = await admin
        .from('agents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return this.enrichAgents(data ?? []);
    }

    return AGENT_DEFINITIONS.map((a) => this.toAgentRow(a));
  }

  private enrichAgents(rows: Array<Record<string, unknown>>) {
    return rows.map((row) => {
      const def = getAgentBySlug(row.slug as string);
      const config = (row.config as Record<string, unknown> | null) ?? {};
      return {
        ...row,
        skills: def?.skills ?? row.skills ?? [],
        tags: def?.tags ?? row.tags ?? [],
        prompt_version: def?.prompt_version ?? row.prompt_version ?? 'vf-2.0',
        uses_document_context: def?.uses_document_context ?? true,
        related_agents: def?.related_agents ?? row.related_agents ?? [],
        required_inputs: def?.required_inputs ?? row.required_inputs ?? [],
        optional_tools: def?.optional_tools ?? row.optional_tools ?? [],
        output_schema_key: def?.output_schema_key ?? (row.output_schema as Record<string, string>)?.key,
        phase: def?.phase ?? row.phase ?? 1,
        type: row.type ?? def?.tags?.[0] ?? 'specialist',
      };
    });
  }

  private toAgentRow(a: (typeof AGENT_DEFINITIONS)[number]) {
    return {
      slug: a.slug,
      name: a.name,
      role: a.role,
      type: a.tags[0] ?? 'specialist',
      description: a.description,
      avatar_color: a.avatar_color,
      capabilities: a.capabilities,
      permission_scopes: a.permission_scopes,
      skills: a.skills,
      tags: a.tags,
      status: 'available',
      is_active: true,
      prompt_version: a.prompt_version,
      uses_document_context: a.uses_document_context,
      related_agents: a.related_agents,
      required_inputs: a.required_inputs,
      optional_tools: a.optional_tools,
      output_schema_key: a.output_schema_key,
      phase: a.phase,
    };
  }

  private buildDbRow(workspaceId: string, def: (typeof AGENT_DEFINITIONS)[number]) {
    return {
      workspace_id: workspaceId,
      slug: def.slug,
      name: def.name,
      type: def.tags[0] ?? 'specialist',
      role: def.role,
      description: def.description,
      avatar_color: def.avatar_color,
      capabilities: def.capabilities,
      permission_scopes: def.permission_scopes,
      status: 'available',
      tags: def.tags,
      skills: def.skills,
      config: {
        system_prompt: def.system_prompt,
        skills: def.skills,
        output_schema_key: def.output_schema_key,
        uses_document_context: def.uses_document_context,
        phase: def.phase,
      },
      prompt_version: def.prompt_version,
      output_schema: { key: def.output_schema_key },
      quality_gates: { vf_standard_score: 95 },
      related_agents: def.related_agents,
      required_inputs: def.required_inputs,
      optional_tools: def.optional_tools,
      phase: def.phase,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Idempotent sync: upserts all VF agent definitions into a workspace.
   * Never deletes agents. Uses select-then-insert/update (Supabase upsert fails on partial unique index).
   */
  async syncValiantFirmAgentsForWorkspace(workspaceId: string): Promise<AgentSyncResult> {
    if (!workspaceId) throw new BadRequestException('workspace_id is required');

    const admin = this.supabase.getAdminClient();

    const { count: beforeCount, error: countErr } = await admin
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);
    if (countErr) throw countErr;

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const def of AGENT_DEFINITIONS) {
      const row = this.buildDbRow(workspaceId, def);

      const { data: existing, error: findErr } = await admin
        .from('agents')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('slug', def.slug)
        .maybeSingle();

      if (findErr) {
        errors.push(`${def.slug}: ${findErr.message}`);
        continue;
      }

      if (existing?.id) {
        const { error: updateErr } = await admin.from('agents').update(row).eq('id', existing.id);
        if (updateErr) errors.push(`${def.slug}: ${updateErr.message}`);
        else updated++;
      } else {
        const { error: insertErr } = await admin.from('agents').insert(row);
        if (insertErr) errors.push(`${def.slug}: ${insertErr.message}`);
        else inserted++;
      }
    }

    if (errors.length) {
      this.logger.error(`Agent sync errors for ${workspaceId}: ${errors.slice(0, 5).join('; ')}`);
    }

    const { data: afterRows, error: afterErr } = await admin
      .from('agents')
      .select('slug')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);
    if (afterErr) throw afterErr;

    const afterSlugs = new Set((afterRows ?? []).map((r) => r.slug as string));
    const missingSlugs = AGENT_DEFINITIONS.map((a) => a.slug).filter((s) => !afterSlugs.has(s));
    const afterCount = afterSlugs.size;

    const result: AgentSyncResult = {
      success: afterCount >= this.expectedCount && missingSlugs.length === 0,
      workspaceId,
      expected: this.expectedCount,
      beforeCount: beforeCount ?? 0,
      afterCount,
      inserted,
      updated,
      missingSlugs,
    };

    if (!result.success) {
      this.logger.warn(
        `Agent sync incomplete for ${workspaceId}: ${afterCount}/${this.expectedCount} (missing: ${missingSlugs.join(', ')})`,
      );
    } else {
      this.logger.log(`Agent sync OK for ${workspaceId}: ${afterCount} agents (${inserted} inserted, ${updated} updated)`);
    }

    return result;
  }

  /** @deprecated use syncValiantFirmAgentsForWorkspace */
  async syncWorkspaceAgents(workspaceId: string) {
    return this.syncValiantFirmAgentsForWorkspace(workspaceId);
  }

  async getBySlug(slug: string) {
    return getAgentBySlug(slug) ?? null;
  }

  async execute(
    token: string,
    slug: string,
    body: {
      workspace_id: string;
      client_id?: string;
      task_id?: string;
      document_id?: string;
      prompt: string;
      use_document_context?: boolean;
    },
  ) {
    await this.syncValiantFirmAgentsForWorkspace(body.workspace_id);

    const result = await this.intelligence.executeAgent({
      workspaceId: body.workspace_id,
      clientId: body.client_id,
      taskId: body.task_id,
      documentId: body.document_id,
      agentSlug: slug,
      userPrompt: body.prompt,
      useDocumentContext: body.use_document_context,
    });

    const admin = this.supabase.getAdminClient();
    const { data: run } = await admin
      .from('agent_runs')
      .insert({
        workspace_id: body.workspace_id,
        task_id: body.task_id ?? null,
        agent_slug: slug,
        status: 'completed',
        markdown_output: result.markdown.slice(0, 50000),
        json_output: result.json ?? {},
        output_quality: result.quality,
        context_sources_used: result.contextPack.sourcesUsed,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    return { run_id: run?.id, ...result };
  }

  async getRuns(token: string, slug: string, workspaceId: string, limit = 20) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('agent_runs')
      .select('id, task_id, agent_slug, provider, model, status, error, output_quality, started_at, completed_at, created_at')
      .eq('workspace_id', workspaceId)
      .eq('agent_slug', slug)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  async getRecentTasks(token: string, slug: string, workspaceId: string, limit = 10) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('tasks')
      .select('id, title, status, quality_score, created_at')
      .eq('workspace_id', workspaceId)
      .or(`agent_slug.eq.${slug},assigned_agents.cs.["${slug}"]`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  getDefinitions() {
    return AGENT_DEFINITIONS;
  }

  getPipelines() {
    return VF_PIPELINES;
  }
}
