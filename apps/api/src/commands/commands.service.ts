import { Injectable } from '@nestjs/common';
import { isVFResearchingMode, VF_RESEARCH_PIPELINE_ID } from '@vf/shared';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { TasksService } from '../tasks/tasks.service';
import { ClientsService } from '../clients/clients.service';
import { LiveLogsService } from '../live-logs/live-logs.service';
import { SupabaseService } from '../supabase/supabase.service';

interface ExecuteDto {
  command: string;
  workspace_id: string;
  client_id?: string;
  project_id?: string;
  document_id?: string;
  pipeline_id?: string;
  use_document_context?: boolean;
}

@Injectable()
export class CommandsService {
  constructor(
    private orchestrator: OrchestratorService,
    private tasks: TasksService,
    private clients: ClientsService,
    private liveLogs: LiveLogsService,
    private supabase: SupabaseService,
  ) {}

  async execute(token: string, userId: string, dto: ExecuteDto) {
    let clientContext: Record<string, unknown> | undefined;

    if (dto.client_id) {
      try {
        const client = await this.clients.getById(token, dto.client_id);
        clientContext = {
          name: client.name,
          domain: client.domain,
          industry: client.industry,
          service_area: client.service_area,
          radius_miles: client.radius_miles,
        };
      } catch {
        /* client optional */
      }
    }

    const researchingMode = isVFResearchingMode(dto.command);

    const task = await this.tasks.create(token, {
      workspace_id: dto.workspace_id,
      client_id: dto.client_id || null,
      project_id: dto.project_id || null,
      document_id: dto.document_id || null,
      pipeline_id: dto.pipeline_id || (researchingMode ? VF_RESEARCH_PIPELINE_ID : null),
      use_document_context: dto.use_document_context !== false,
      title: dto.command.slice(0, 120),
      command: dto.command,
      status: 'pending',
      task_type: researchingMode ? 'research_workbook' : undefined,
      created_by: userId,
    });

    if (researchingMode) {
      await this.liveLogs.add(
        dto.workspace_id,
        'info',
        'VF Researching Mode activated — generating SEO Master workbook',
        { pipeline: VF_RESEARCH_PIPELINE_ID },
        task.id,
        'manager',
      );
    }

    let documentId = dto.document_id;
    let useDocumentContext = dto.use_document_context !== false;

    if (!documentId && dto.client_id && useDocumentContext) {
      const { data: settings } = await this.supabase
        .getAdminClient()
        .from('app_settings')
        .select('always_use_document_context')
        .eq('workspace_id', dto.workspace_id)
        .maybeSingle();
      if (settings?.always_use_document_context !== false) {
        const { data: latestDoc } = await this.supabase
          .getAdminClient()
          .from('client_documents')
          .select('id, file_name')
          .eq('workspace_id', dto.workspace_id)
          .eq('client_id', dto.client_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestDoc?.id) {
          documentId = latestDoc.id as string;
          await this.tasks.update('', task.id, { document_id: documentId });
          await this.liveLogs.add(
            dto.workspace_id,
            'info',
            `Document context linked: ${latestDoc.file_name}`,
            { document_id: documentId },
            task.id,
            'manager',
          );
        }
      }
    }

    await this.tasks.addMessage({
      task_id: task.id,
      role: 'user',
      content: dto.command,
      metadata: {},
    });

    await this.tasks.addAuditLog({
      workspace_id: dto.workspace_id,
      user_id: userId,
      action: 'command.executed',
      resource_type: 'task',
      resource_id: task.id,
      details: { command: dto.command.slice(0, 200) },
    });

    await this.liveLogs.add(dto.workspace_id, 'info', `Task created: ${dto.command.slice(0, 100)}`, {}, task.id, 'manager');

    this.orchestrator.executeCommand({
      taskId: task.id,
      workspaceId: dto.workspace_id,
      clientId: dto.client_id,
      documentId,
      pipelineId: dto.pipeline_id || (researchingMode ? VF_RESEARCH_PIPELINE_ID : undefined),
      command: dto.command,
      userId,
      clientContext,
      useDocumentContext,
      researchingMode,
    });

    return {
      task_id: task.id,
      status: 'pending',
      message: 'Command received. Manager Agent is creating a task plan.',
    };
  }
}
