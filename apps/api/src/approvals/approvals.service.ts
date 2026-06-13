import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LiveLogsService } from '../live-logs/live-logs.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private supabase: SupabaseService,
    private liveLogs: LiveLogsService,
  ) {}

  async list(token: string, workspaceId: string, status?: string) {
    const client = this.supabase.getClientWithToken(token);
    let query = client
      .from('approvals')
      .select('*, tasks(title)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async review(token: string, id: string, userId: string, approved: boolean) {
    const client = this.supabase.getClientWithToken(token);
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('approvals')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewed_by: userId,
        reviewed_at: now,
        approved_by: approved ? userId : null,
        approved_at: approved ? now : null,
        rejected_at: approved ? null : now,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    if (data.workspace_id) {
      await this.liveLogs.add(
        data.workspace_id,
        approved ? 'success' : 'warning',
        `Approval ${approved ? 'approved' : 'rejected'}: ${data.title || data.action_type}`,
        { approval_id: id },
        data.task_id ?? undefined,
      );
    }
    return data;
  }
}
