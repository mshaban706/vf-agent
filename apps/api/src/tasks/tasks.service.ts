import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LiveLogsService } from '../live-logs/live-logs.service';

interface ManualTaskDto {
  workspace_id: string;
  title: string;
  description?: string;
  client_id?: string;
  agent_slug?: string;
  document_id?: string;
  pipeline_id?: string;
  depth_level?: string;
  use_document_context?: boolean;
  require_qa_review?: boolean;
  priority?: string;
  task_type?: string;
  requires_approval?: boolean;
}

@Injectable()
export class TasksService {
  constructor(
    private supabase: SupabaseService,
    private liveLogs: LiveLogsService,
  ) {}

  async createManual(token: string, userId: string, dto: ManualTaskDto) {
    const client = this.supabase.getClientWithToken(token);
    const status = dto.requires_approval ? 'needs_approval' : 'pending';

    const { data: task, error } = await client
      .from('tasks')
      .insert({
        workspace_id: dto.workspace_id,
        client_id: dto.client_id || null,
        document_id: dto.document_id || null,
        pipeline_id: dto.pipeline_id || null,
        title: dto.title,
        command: dto.description || dto.title,
        description: dto.description || null,
        agent_slug: dto.agent_slug || null,
        priority: dto.priority || 'medium',
        task_type: dto.task_type || null,
        depth_level: dto.depth_level || 'vf95',
        use_document_context: dto.use_document_context !== false,
        require_qa_review: dto.require_qa_review !== false,
        status,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;

    if (dto.requires_approval) {
      await this.supabase.getAdminClient().from('approvals').insert({
        task_id: task.id,
        workspace_id: dto.workspace_id,
        action_type: dto.task_type || 'task_execution',
        title: dto.title,
        description: `Approval requested for task: ${dto.title}`,
        risk_level: dto.priority === 'urgent' || dto.priority === 'high' ? 'high' : 'medium',
        requested_by: userId,
        status: 'pending',
      });
      await this.liveLogs.add(dto.workspace_id, 'warning', `Approval requested: ${dto.title}`, {}, task.id);
    }

    await this.liveLogs.add(dto.workspace_id, 'info', `Task created: ${dto.title}`, { priority: dto.priority }, task.id, dto.agent_slug);
    return task;
  }

  async updateStatus(token: string, userId: string, id: string, status: string) {
    const client = this.supabase.getClientWithToken(token);
    const updates: Record<string, unknown> = { status };
    if (status === 'in_progress') updates.started_at = new Date().toISOString();
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { data, error } = await client.from('tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;

    await this.liveLogs.add(data.workspace_id, 'info', `Task status changed to ${status}: ${data.title}`, { by: userId }, id);
    return data;
  }

  async list(token: string, workspaceId: string, status?: string) {
    const client = this.supabase.getClientWithToken(token);
    let query = client
      .from('tasks')
      .select('*, clients(name, domain), task_steps(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getById(token: string, id: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('tasks')
      .select('*, clients(*), task_steps(*), agent_logs(*), messages(*), outputs(*)')
      .eq('id', id)
      .single();
    if (error) throw error;

    if (data.task_steps) {
      data.task_steps.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index);
    }
    if (data.agent_logs) {
      data.agent_logs.sort(
        (a: { created_at: string }, b: { created_at: string }) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
    return data;
  }

  async getLogs(token: string, taskId: string, limit = 100) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('agent_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  async create(token: string, task: Record<string, unknown>) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client.from('tasks').insert(task).select().single();
    if (error) throw error;
    return data;
  }

  async update(token: string, id: string, updates: Record<string, unknown>) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.from('tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async createStep(token: string, step: Record<string, unknown>) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.from('task_steps').insert(step).select().single();
    if (error) throw error;
    return data;
  }

  async updateStep(token: string, id: string, updates: Record<string, unknown>) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.from('task_steps').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async addLog(log: Record<string, unknown>) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.from('agent_logs').insert(log).select().single();
    if (error) throw error;
    return data;
  }

  async addMessage(message: Record<string, unknown>) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.from('messages').insert(message).select().single();
    if (error) throw error;
    return data;
  }

  async addOutput(output: Record<string, unknown>) {
    const client = this.supabase.getAdminClient();
    const { data, error } = await client.from('outputs').insert(output).select().single();
    if (error) throw error;
    return data;
  }

  async addAuditLog(log: Record<string, unknown>) {
    const client = this.supabase.getAdminClient();
    await client.from('audit_logs').insert(log);
  }
}
