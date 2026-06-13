import { Injectable } from '@nestjs/common';
import { INTEGRATION_PROVIDERS } from '@vf/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { LiveLogsService } from '../live-logs/live-logs.service';

@Injectable()
export class IntegrationsService {
  constructor(
    private supabase: SupabaseService,
    private liveLogs: LiveLogsService,
  ) {}

  /** Catalog merged with the workspace's saved integration rows. */
  async list(token: string, workspaceId: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('integrations')
      .select('*')
      .eq('workspace_id', workspaceId);
    if (error) throw error;

    const saved = new Map((data ?? []).map((row: { provider: string }) => [row.provider, row]));
    return INTEGRATION_PROVIDERS.map((p) => {
      const row = saved.get(p.slug) as Record<string, unknown> | undefined;
      return {
        provider: p.slug,
        name: p.name,
        category: p.category,
        requires_approval: p.requiresApproval,
        phase: p.phase,
        status: (row?.status as string) ?? 'not_connected',
        connected: row?.status === 'connected' || row?.status === 'configured',
        config_saved: Boolean(row),
      };
    });
  }

  async save(token: string, workspaceId: string, provider: string, config: Record<string, unknown>) {
    const known = INTEGRATION_PROVIDERS.find((p) => p.slug === provider);
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('integrations')
      .upsert(
        {
          workspace_id: workspaceId,
          provider,
          type: known?.category ?? null,
          status: 'configured',
          config,
        },
        { onConflict: 'workspace_id,provider' },
      )
      .select()
      .single();
    if (error) throw error;

    await this.liveLogs.add(workspaceId, 'success', `Integration configured: ${known?.name ?? provider}`);
    return data;
  }
}
