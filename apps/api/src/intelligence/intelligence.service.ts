import { Injectable, Logger } from '@nestjs/common';
import {
  getAgentBySlug,
  getOutputSchemaHint,
  QUALITY_IMPROVEMENT_PROMPT,
  scoreAgentOutput,
  formatQualitySummary,
  getResearchAgentPromptSuffix,
  type QualityScores,
} from '@vf/shared';
import { AiProviderService } from '../orchestrator/ai-provider.service';
import { LiveLogsService } from '../live-logs/live-logs.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ContextPackService, type AgentContextPack } from './context-pack.service';

export interface ExecuteAgentOptions {
  workspaceId: string;
  clientId?: string;
  taskId?: string;
  agentSlug: string;
  userPrompt: string;
  autoImprove?: boolean;
  documentId?: string;
  useDocumentContext?: boolean;
  researchingMode?: boolean;
}

export interface AgentExecutionResult {
  markdown: string;
  json: Record<string, unknown> | null;
  quality: QualityScores;
  passes: boolean;
  warnings: string[];
  contextPack: AgentContextPack;
  improved: boolean;
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    private ai: AiProviderService,
    private contextPack: ContextPackService,
    private liveLogs: LiveLogsService,
    private supabase: SupabaseService,
  ) {}

  async executeAgent(options: ExecuteAgentOptions): Promise<AgentExecutionResult> {
    const agent = getAgentBySlug(options.agentSlug);
    if (!agent) throw new Error(`Unknown agent: ${options.agentSlug}`);

    await this.liveLogs.add(
      options.workspaceId,
      'info',
      `Building context pack for ${agent.name}`,
      { agent: options.agentSlug },
      options.taskId,
      options.agentSlug,
    );

    const pack = await this.contextPack.build({
      workspaceId: options.workspaceId,
      clientId: options.clientId,
      taskId: options.taskId,
      agentSlug: options.agentSlug,
      documentId: options.documentId,
      query: options.userPrompt,
      useDocumentContext: options.useDocumentContext,
    });

    const schemaHint = getOutputSchemaHint(agent.output_schema_key) ?? getOutputSchemaHint(options.agentSlug);
    const researchSuffix = options.researchingMode ? getResearchAgentPromptSuffix(options.agentSlug) : '';
    const userMessage = `${pack.promptBlock}\n\n--- Your Assignment ---\n${options.userPrompt}${researchSuffix}\n\nReturn comprehensive markdown with all required VF sections. If JSON schema applies, include a \`\`\`json code block with structured data.\n${schemaHint ? `\nTarget JSON schema:\n${schemaHint}` : ''}`;

    await this.liveLogs.add(
      options.workspaceId,
      'info',
      `AI call started: ${agent.name} (${pack.sourcesUsed.length} context sources)`,
      { provider: 'workspace_settings', sources: pack.sourcesUsed.slice(0, 10) },
      options.taskId,
      options.agentSlug,
    );

    let markdown = await this.ai.chat(
      [
        { role: 'system', content: agent.system_prompt },
        { role: 'user', content: userMessage },
      ],
      { workspaceId: options.workspaceId },
    );

    let improved = false;
    let gate = scoreAgentOutput(markdown, {
      usedDocumentContext: pack.documents.length > 0,
      hasLocationContext: Boolean(pack.client?.service_area || pack.client?.location || pack.polarProfile),
      isSeoContentTask: ['content-seo', 'keyword-research', 'seo-strategy'].includes(options.agentSlug),
      isLocalSeoTask: ['local-seo', 'gbp-optimization', 'local-entity'].includes(options.agentSlug),
    });

    const autoImprove = options.autoImprove !== false && (pack.settings?.auto_quality_improvement !== false);
    if (!gate.passes && autoImprove) {
      await this.liveLogs.add(
        options.workspaceId,
        'warning',
        `Quality score ${gate.scores.vf_standard_score}/100 — running improvement pass`,
        { scores: gate.scores },
        options.taskId,
        options.agentSlug,
      );

      markdown = await this.ai.chat(
        [
          { role: 'system', content: agent.system_prompt },
          { role: 'user', content: userMessage },
          { role: 'assistant', content: markdown },
          { role: 'user', content: QUALITY_IMPROVEMENT_PROMPT },
        ],
        { workspaceId: options.workspaceId },
      );
      improved = true;
      gate = scoreAgentOutput(markdown, {
        usedDocumentContext: pack.documents.length > 0,
        hasLocationContext: Boolean(pack.client?.service_area || pack.polarProfile),
        isSeoContentTask: true,
      });
    }

    const json = this.extractJson(markdown);
    const qualityFooter = formatQualitySummary(gate.scores, gate.passes);
    if (!gate.passes) {
      markdown += `\n\n---\n\n${qualityFooter}\n\n> ⚠ Output needs strategist review before client delivery.`;
    } else {
      markdown += `\n\n---\n\n${qualityFooter}`;
    }

    await this.liveLogs.add(
      options.workspaceId,
      gate.passes ? 'success' : 'warning',
      `AI call completed: ${agent.name} — VF score ${gate.scores.vf_standard_score}/100`,
      { scores: gate.scores, improved, sources: pack.sourcesUsed },
      options.taskId,
      options.agentSlug,
    );

    // Persist agent context snapshot
    await this.supabase.getAdminClient().from('agent_context').insert({
      workspace_id: options.workspaceId,
      client_id: options.clientId ?? null,
      task_id: options.taskId ?? null,
      agent_slug: options.agentSlug,
      context_type: 'execution',
      content: pack.promptBlock.slice(0, 15000),
      metadata: { sources: pack.sourcesUsed, quality: gate.scores },
    });

    return {
      markdown,
      json,
      quality: gate.scores,
      passes: gate.passes,
      warnings: gate.warnings,
      contextPack: pack,
      improved,
    };
  }

  private extractJson(markdown: string): Record<string, unknown> | null {
    const match = markdown.match(/```json\s*([\s\S]*?)```/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
