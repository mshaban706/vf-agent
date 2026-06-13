import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LiveLogsService } from '../live-logs/live-logs.service';
import { AgentsService } from '../agents/agents.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private supabase: SupabaseService,
    private liveLogs: LiveLogsService,
    private agents: AgentsService,
  ) {}

  /** Guarantees the user has at least one workspace; returns the full list. */
  async ensureDefault(token: string, userId: string) {
    const existing = await this.list(token);
    if (existing.length > 0) return existing;

    const admin = this.supabase.getAdminClient();
    const { data: ws, error } = await admin
      .from('workspaces')
      .insert({
        name: 'Valiant Firm Workspace',
        slug: `valiant-firm-${userId.slice(0, 8)}`,
        owner_id: userId,
        description: 'Default workspace',
      })
      .select()
      .single();
    if (error) throw error;

    await admin.from('workspace_members').upsert(
      { workspace_id: ws.id, user_id: userId, role: 'admin' },
      { onConflict: 'workspace_id,user_id' },
    );

    await this.liveLogs.add(ws.id, 'success', 'Default workspace created');
    return this.list(token);
  }

  async list(token: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('workspaces')
      .select('*, clients(count), tasks(count)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async create(token: string, userId: string, name: string, slug: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('workspaces')
      .insert({ name, slug, owner_id: userId })
      .select()
      .single();
    if (error) throw error;

    await client.from('workspace_members').insert({
      workspace_id: data.id,
      user_id: userId,
      role: 'admin',
    });

    await this.liveLogs.add(data.id, 'success', `Workspace created: ${name}`);
    return data;
  }

  async getById(token: string, id: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('workspaces')
      .select('*, clients(*), projects(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async getStats(token: string, id: string) {
    await this.agents.syncValiantFirmAgentsForWorkspace(id);

    const client = this.supabase.getClientWithToken(token);
    const [clients, tasks, agents] = await Promise.all([
      client.from('clients').select('id', { count: 'exact', head: true }).eq('workspace_id', id),
      client.from('tasks').select('id, status', { count: 'exact' }).eq('workspace_id', id),
      client.from('agents').select('id', { count: 'exact', head: true }).eq('workspace_id', id).eq('is_active', true),
    ]);

    const taskData = tasks.data || [];
    return {
      client_count: clients.count || 0,
      task_count: tasks.count || 0,
      active_tasks: taskData.filter((t) => ['planning', 'in_progress', 'qa_review'].includes(t.status)).length,
      completed_tasks: taskData.filter((t) => t.status === 'completed').length,
      agent_count: agents.count || 0,
    };
  }
}
