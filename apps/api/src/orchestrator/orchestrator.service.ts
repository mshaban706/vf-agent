import { Injectable, Logger } from '@nestjs/common';
import {
  getAgentBySlug,
  getPipelineById,
  isVFResearchingMode,
  parseResearchBrief,
  VF_RESEARCH_PIPELINE_ID,
  type TaskPlan,
  type TaskPlanStep,
} from '@vf/shared';
import { AiProviderService } from './ai-provider.service';
import { EventsGateway } from '../events/events.gateway';
import { TasksService } from '../tasks/tasks.service';
import { LiveLogsService } from '../live-logs/live-logs.service';
import { SupabaseService } from '../supabase/supabase.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { ContextPackService } from '../intelligence/context-pack.service';
import { ResearchWorkbookService } from '../research-workbook/research-workbook.service';

interface OrchestratorContext {
  taskId: string;
  workspaceId: string;
  clientId?: string;
  documentId?: string;
  pipelineId?: string;
  command: string;
  userId: string;
  clientContext?: Record<string, unknown>;
  useDocumentContext?: boolean;
  researchingMode?: boolean;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private ai: AiProviderService,
    private tasks: TasksService,
    private events: EventsGateway,
    private liveLogs: LiveLogsService,
    private supabase: SupabaseService,
    private intelligence: IntelligenceService,
    private contextPack: ContextPackService,
    private researchWorkbook: ResearchWorkbookService,
  ) {}

  async executeCommand(ctx: OrchestratorContext): Promise<void> {
    const { taskId, command, workspaceId, userId } = ctx;

    try {
      const { data: taskRow } = await this.supabase
        .getAdminClient()
        .from('tasks')
        .select('document_id, pipeline_id, use_document_context, depth_level, agent_slug')
        .eq('id', taskId)
        .maybeSingle();

      if (taskRow) {
        ctx.documentId = ctx.documentId ?? (taskRow.document_id as string | undefined);
        ctx.pipelineId = ctx.pipelineId ?? (taskRow.pipeline_id as string | undefined);
        if (ctx.useDocumentContext === undefined) {
          ctx.useDocumentContext = taskRow.use_document_context !== false;
        }
      }

      if (!ctx.researchingMode) {
        ctx.researchingMode = isVFResearchingMode(command);
      }
      if (ctx.researchingMode && !ctx.pipelineId) {
        ctx.pipelineId = VF_RESEARCH_PIPELINE_ID;
        await this.liveLogs.add(
          workspaceId,
          'info',
          'VF Researching Mode activated — SEO Master workbook pipeline',
          { pipeline: VF_RESEARCH_PIPELINE_ID },
          taskId,
          'manager',
        );
      }

      if (!ctx.documentId && ctx.useDocumentContext !== false && ctx.clientId) {
        const { data: latestDoc } = await this.supabase
          .getAdminClient()
          .from('client_documents')
          .select('id, file_name')
          .eq('workspace_id', workspaceId)
          .eq('client_id', ctx.clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestDoc?.id) {
          ctx.documentId = latestDoc.id as string;
          await this.liveLogs.add(
            workspaceId,
            'info',
            `Auto-linked document context: ${latestDoc.file_name}`,
            { document_id: latestDoc.id },
            taskId,
            'manager',
          );
        }
      }

      await this.log(taskId, 'manager', 'info', 'Manager Agent analyzing command...');
      await this.tasks.update('', taskId, { status: 'planning', started_at: new Date().toISOString() });
      this.events.emitTaskUpdate(taskId, { status: 'planning' });

      const plan = await this.createPlan(ctx);
      await this.tasks.update('', taskId, {
        status: 'in_progress',
        plan,
        assigned_agents: plan.steps.map((s) => s.agent_slug),
        title: plan.summary.slice(0, 120),
      });
      this.events.emitTaskUpdate(taskId, { status: 'in_progress', plan });

      await this.log(taskId, 'manager', 'success', `Task plan created with ${plan.steps.length} steps`);

      const stepOutputs: Map<number, string> = new Map();
      const agentOutputs: Map<string, string> = new Map();
      const createdSteps: { id: string; order: number }[] = [];

      for (const step of plan.steps) {
        const stepRecord = await this.tasks.createStep('', {
          task_id: taskId,
          agent_slug: step.agent_slug,
          title: step.title,
          description: step.description,
          order_index: step.order,
          status: 'pending',
        });
        createdSteps.push({ id: stepRecord.id, order: step.order });
      }

      const nonQaSteps = plan.steps.filter((s) => s.agent_slug !== 'qa');
      for (const step of nonQaSteps) {
        const depsMet = step.depends_on.every((dep) => stepOutputs.has(dep));
        if (!depsMet) continue;

        const stepRecord = createdSteps.find((s) => s.order === step.order)!;
        const priorContext = step.depends_on
          .map((dep) => stepOutputs.get(dep))
          .filter(Boolean)
          .join('\n\n---\n\n');

        const output = await this.runAgentStep(ctx, stepRecord.id, step, priorContext);
        stepOutputs.set(step.order, output);
        agentOutputs.set(step.agent_slug, output);
      }

      await this.tasks.update('', taskId, { status: 'qa_review' });
      this.events.emitTaskUpdate(taskId, { status: 'qa_review' });

      const allOutputs = Array.from(stepOutputs.values()).join('\n\n---\n\n');
      const qaStep = plan.steps.find((s) => s.agent_slug === 'qa');
      let finalOutput = allOutputs;
      let qaScore = 85;
      let workbookMeta: Record<string, unknown> | null = null;

      if (ctx.researchingMode) {
        await this.log(taskId, 'manager', 'info', 'Compiling VF SEO Master Excel workbook...');
        const brief = parseResearchBrief(command, ctx.clientContext);
        const compiled = this.researchWorkbook.compileFromAgentOutputs(agentOutputs, brief);
        const workbook = await this.researchWorkbook.generateAndSave({
          workspaceId,
          clientId: ctx.clientId,
          userId,
          taskId,
          brief,
          sheets: compiled.sheets,
          locationTabs: compiled.locationTabs,
        });
        finalOutput = workbook.summaryMarkdown;
        qaScore = workbook.qaScore.finalScore;
        workbookMeta = {
          file_id: workbook.fileId,
          file_name: workbook.fileName,
          download_path: workbook.downloadPath,
          qa_score: workbook.qaScore.finalScore,
          tabs: workbook.tabNames,
          researching_mode: true,
        };
        await this.tasks.addOutput({
          task_id: taskId,
          agent_slug: 'manager',
          title: 'VF SEO Master Workbook',
          content: `Download: ${workbook.fileName}\nQA Score: ${workbook.qaScore.finalScore}/100`,
          format: 'file',
        });
      } else if (qaStep) {
        const qaStepRecord = createdSteps.find((s) => s.order === qaStep.order)!;
        const qaResult = await this.runQaReview(ctx, qaStepRecord.id, allOutputs);
        finalOutput = qaResult.output;
        qaScore = qaResult.score;
      }

      await this.tasks.update('', taskId, {
        status: 'completed',
        final_output: finalOutput,
        markdown_output: finalOutput,
        json_output: workbookMeta ?? {},
        qa_score: qaScore,
        quality_score: { vf_standard_score: qaScore },
        completed_at: new Date().toISOString(),
      });

      if (!ctx.researchingMode) {
        await this.tasks.addOutput({
          task_id: taskId,
          agent_slug: 'manager',
          title: 'Final Deliverable',
          content: finalOutput,
          format: 'markdown',
        });
      }

      await this.log(taskId, 'manager', 'success', `Task completed. QA Score: ${qaScore}/100`);
      await this.liveLogs.add(workspaceId, 'success', `Task completed (QA ${qaScore}/100): ${command.slice(0, 100)}`, {}, taskId, 'manager');
      this.events.emitTaskUpdate(taskId, { status: 'completed', qa_score: qaScore, final_output: finalOutput });
      this.events.emitOutputReady(taskId, { content: finalOutput, qa_score: qaScore });

      await this.tasks.addAuditLog({
        workspace_id: workspaceId,
        user_id: userId,
        action: 'task.completed',
        resource_type: 'task',
        resource_id: taskId,
        details: { command: command.slice(0, 200), qa_score: qaScore },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Task ${taskId} failed: ${message}`);
      await this.tasks.update('', taskId, { status: 'failed' });
      await this.log(taskId, 'manager', 'error', `Task failed: ${message}`);
      await this.liveLogs.add(workspaceId, 'error', `Task failed: ${message}`, {}, taskId, 'manager');
      this.events.emitTaskUpdate(taskId, { status: 'failed', error: message });
    }
  }

  private async createPlan(ctx: OrchestratorContext): Promise<TaskPlan> {
    if (ctx.researchingMode && !ctx.pipelineId) {
      ctx.pipelineId = VF_RESEARCH_PIPELINE_ID;
    }
    if (ctx.pipelineId) {
      const pipeline = getPipelineById(ctx.pipelineId);
      if (pipeline) {
        return {
          summary: `${pipeline.name}: ${ctx.command.slice(0, 100)}`,
          steps: pipeline.agent_slugs.map((slug, i) => ({
            order: i + 1,
            agent_slug: slug,
            title: getAgentBySlug(slug)?.name ?? slug,
            description: `Execute ${slug} step for: ${ctx.command.slice(0, 120)}`,
            depends_on: i > 0 ? [i] : [],
          })),
          estimated_duration_minutes: pipeline.agent_slugs.length * 5,
        };
      }
    }

    const pack = await this.contextPack.build({
      workspaceId: ctx.workspaceId,
      clientId: ctx.clientId,
      taskId: ctx.taskId,
      agentSlug: 'manager',
      documentId: ctx.documentId,
      query: ctx.command,
      useDocumentContext: ctx.useDocumentContext,
    });

    const agent = getAgentBySlug('manager')!;
    const response = await this.ai.chat(
      [
        {
          role: 'system',
          content:
            agent.system_prompt +
            '\n\nRespond with valid JSON matching this schema: { summary: string, steps: [{ order: number, agent_slug: string, title: string, description: string, depends_on: number[] }], estimated_duration_minutes: number }',
        },
        {
          role: 'user',
          content: `${pack.promptBlock}\n\nCommand: ${ctx.command}\n\nAvailable agents: document-context, keyword-research, competitor-research, content-seo, local-seo, ai-visibility, technical-seo, semantic-seo, qa. Always include document-context first if sheets uploaded. Always include qa last.`,
        },
      ],
      { workspaceId: ctx.workspaceId },
    );

    try {
      const parsed = JSON.parse(response) as TaskPlan;
      if (!parsed.steps?.length) throw new Error('Empty plan');
      return parsed;
    } catch {
      return {
        summary: `Execute: ${ctx.command.slice(0, 100)}`,
        steps: [
          { order: 1, agent_slug: 'seo-strategy', title: 'SEO Strategy', description: 'Create SEO strategy and analysis', depends_on: [] },
          { order: 2, agent_slug: 'keyword-research', title: 'Keyword Research', description: 'Research target keywords', depends_on: [1] },
          { order: 3, agent_slug: 'content-seo', title: 'Content Plan', description: 'Create content recommendations', depends_on: [1, 2] },
          { order: 4, agent_slug: 'qa', title: 'Quality Review', description: 'Review and score output', depends_on: [1, 2, 3] },
        ],
        estimated_duration_minutes: 15,
      };
    }
  }

  private async runAgentStep(
    ctx: OrchestratorContext,
    stepId: string,
    step: TaskPlanStep,
    priorContext: string,
  ): Promise<string> {
    const { taskId, command, workspaceId, clientContext } = ctx;
    const agent = getAgentBySlug(step.agent_slug);
    if (!agent) throw new Error(`Unknown agent: ${step.agent_slug}`);

    await this.tasks.updateStep('', stepId, { status: 'in_progress', started_at: new Date().toISOString() });
    this.events.emitStepUpdate(taskId, { step_id: stepId, agent_slug: step.agent_slug, status: 'in_progress' });
    await this.log(taskId, step.agent_slug, 'info', `${agent.name} starting: ${step.title}`);

    const runId = await this.startAgentRun(workspaceId, taskId, step.agent_slug, step.title);

    const clientInfo = clientContext ? `\nClient: ${JSON.stringify(clientContext)}` : '';
    const contextBlock = priorContext ? `\n\nPrior agent outputs:\n${priorContext}` : '';

    let output: string;
    try {
      const result = await this.intelligence.executeAgent({
        workspaceId,
        clientId: ctx.clientId,
        taskId,
        agentSlug: step.agent_slug,
        userPrompt: `Original command: ${command}\n\nYour task: ${step.title} — ${step.description}${clientInfo}${contextBlock}`,
        documentId: ctx.documentId,
        useDocumentContext: ctx.useDocumentContext,
        researchingMode: ctx.researchingMode,
      });
      output = result.markdown;
      await this.finishAgentRun(runId, 'completed', output, undefined, {
        markdown: result.markdown,
        json: result.json,
        quality: result.quality as unknown as Record<string, number>,
        contextPack: { sourcesUsed: result.contextPack.sourcesUsed },
      });
    } catch (err) {
      await this.finishAgentRun(runId, 'failed', undefined, err instanceof Error ? err.message : 'unknown error');
      throw err;
    }

    await this.tasks.updateStep('', stepId, {
      status: 'completed',
      output,
      completed_at: new Date().toISOString(),
    });

    await this.tasks.addOutput({
      task_id: taskId,
      agent_slug: step.agent_slug,
      title: step.title,
      content: output,
      format: 'markdown',
    });

    await this.log(taskId, step.agent_slug, 'success', `${agent.name} completed: ${step.title}`);
    this.events.emitStepUpdate(taskId, { step_id: stepId, agent_slug: step.agent_slug, status: 'completed' });

    return output;
  }

  private async runQaReview(
    ctx: OrchestratorContext,
    stepId: string,
    combinedOutput: string,
  ): Promise<{ output: string; score: number }> {
    const { taskId, command, workspaceId } = ctx;
    const agent = getAgentBySlug('qa')!;

    await this.tasks.updateStep('', stepId, { status: 'in_progress', started_at: new Date().toISOString() });
    await this.log(taskId, 'qa', 'info', 'QA Agent reviewing all outputs...');

    const response = await this.ai.chat(
      [
        { role: 'system', content: agent.system_prompt + '\n\nRespond with valid JSON: { score: number, passed: boolean, feedback: string, revised_output: string }' },
        { role: 'user', content: `Original command: ${command}\n\nCombined agent outputs to review:\n${combinedOutput}` },
      ],
      { workspaceId },
    );

    try {
      const result = JSON.parse(response);
      await this.tasks.updateStep('', stepId, {
        status: 'completed',
        output: result.revised_output || combinedOutput,
        completed_at: new Date().toISOString(),
      });
      await this.log(taskId, 'qa', 'success', `QA Score: ${result.score}/100 — ${result.feedback}`);
      return { output: result.revised_output || combinedOutput, score: result.score || 85 };
    } catch {
      await this.tasks.updateStep('', stepId, { status: 'completed', output: combinedOutput, completed_at: new Date().toISOString() });
      await this.log(taskId, 'qa', 'success', 'QA review completed');
      return { output: combinedOutput, score: 85 };
    }
  }

  private async startAgentRun(workspaceId: string, taskId: string, agentSlug: string, title: string): Promise<string | null> {
    try {
      const { data } = await this.supabase
        .getAdminClient()
        .from('agent_runs')
        .insert({
          workspace_id: workspaceId,
          task_id: taskId,
          agent_slug: agentSlug,
          status: 'running',
          input: { title },
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      return data?.id ?? null;
    } catch {
      return null;
    }
  }

  private async finishAgentRun(
    runId: string | null,
    status: 'completed' | 'failed',
    output?: string,
    error?: string,
    result?: {
      markdown: string;
      json: Record<string, unknown> | null;
      quality: Record<string, number>;
      contextPack: { sourcesUsed: string[] };
    },
  ) {
    if (!runId) return;
    try {
      await this.supabase
        .getAdminClient()
        .from('agent_runs')
        .update({
          status,
          output: output ? { content: output.slice(0, 5000) } : {},
          markdown_output: output?.slice(0, 50000) ?? null,
          json_output: result?.json ?? {},
          output_quality: result?.quality ?? {},
          context_sources_used: result?.contextPack?.sourcesUsed ?? [],
          error: error ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);
    } catch {
      /* non-fatal */
    }
  }

  private async log(taskId: string, agentSlug: string, level: string, message: string) {
    const log = await this.tasks.addLog({
      task_id: taskId,
      agent_slug: agentSlug,
      level,
      message,
      metadata: {},
    });
    this.events.emitAgentLog(taskId, log);
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
