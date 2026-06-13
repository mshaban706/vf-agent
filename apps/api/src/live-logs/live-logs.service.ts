import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type LiveLogLevel = 'info' | 'warning' | 'error' | 'success' | 'debug';

@Injectable()
export class LiveLogsService {
  private readonly logger = new Logger(LiveLogsService.name);

  constructor(private supabase: SupabaseService) {}

  /** Server-side log write (admin client — never blocked by RLS). Never throws. */
  async add(
    workspaceId: string,
    level: LiveLogLevel,
    message: string,
    metadata: Record<string, unknown> = {},
    taskId?: string,
    agentSlug?: string,
  ) {
    try {
      await this.supabase.getAdminClient().from('live_logs').insert({
        workspace_id: workspaceId,
        level,
        message,
        metadata,
        task_id: taskId ?? null,
        agent_slug: agentSlug ?? null,
      });
    } catch (err) {
      this.logger.warn(`live_logs write failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  async list(token: string, workspaceId: string, level?: string, limit = 200) {
    const client = this.supabase.getClientWithToken(token);
    let query = client
      .from('live_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (level && level !== 'all') query = query.eq('level', level);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
