import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ReportsService {
  constructor(private supabase: SupabaseService) {}

  async summary(token: string, workspaceId: string) {
    const client = this.supabase.getClientWithToken(token);

    const [clients, tasks, completedTasks, pendingApprovals, logs, agents, documents, runs] = await Promise.all([
      client.from('clients').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      client.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      client.from('tasks').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'completed'),
      client.from('approvals').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'pending'),
      client.from('live_logs').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      client.from('agents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId).eq('status', 'available'),
      client.from('client_documents').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      client.from('agent_runs').select('output_quality').eq('workspace_id', workspaceId).limit(100),
    ]);

    const qualityScores = (runs.data ?? [])
      .map((r) => (r.output_quality as Record<string, number>)?.vf_standard_score)
      .filter((s): s is number => typeof s === 'number');
    const avgQuality =
      qualityScores.length > 0
        ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
        : null;

    return {
      total_clients: clients.count ?? 0,
      total_tasks: tasks.count ?? 0,
      completed_tasks: completedTasks.count ?? 0,
      pending_approvals: pendingApprovals.count ?? 0,
      total_logs: logs.count ?? 0,
      active_agents: agents.count ?? 0,
      uploaded_documents: documents.count ?? 0,
      agent_runs: runs.data?.length ?? 0,
      average_quality_score: avgQuality,
    };
  }
}
