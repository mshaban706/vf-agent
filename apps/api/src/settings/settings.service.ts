import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PROVIDER_DEFAULT_MODELS } from '@vf/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { CryptoService } from '../common/crypto.service';
import { LiveLogsService } from '../live-logs/live-logs.service';

export interface AppSettingsDto {
  default_provider?: string;
  default_model?: string;
  require_email_approval?: boolean;
  require_wordpress_approval?: boolean;
  require_ads_approval?: boolean;
  require_file_delete_approval?: boolean;
  sandbox_mode?: boolean;
  default_output_depth?: string;
  always_use_document_context?: boolean;
  auto_quality_improvement?: boolean;
  require_source_labels?: boolean;
  require_missing_data_section?: boolean;
  require_aeo_geo_section?: boolean;
  require_local_seo_section?: boolean;
  require_schema_internal_links?: boolean;
  require_cro_section?: boolean;
}

const PROVIDER_TEST_ENDPOINTS: Record<string, { url: string; headers: (key: string) => Record<string, string> }> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  deepseek: {
    url: 'https://api.deepseek.com/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/models',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    headers: (key) => ({ 'x-goog-api-key': key }),
  },
};

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private supabase: SupabaseService,
    private crypto: CryptoService,
    private liveLogs: LiveLogsService,
  ) {}

  // ─── App settings ─────────────────────────────────────────

  async getAppSettings(token: string, workspaceId: string, userId: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('app_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;

    // create defaults if missing
    const { data: created, error: insertErr } = await this.supabase
      .getAdminClient()
      .from('app_settings')
      .upsert({ workspace_id: workspaceId, user_id: userId }, { onConflict: 'workspace_id' })
      .select()
      .single();
    if (insertErr) throw insertErr;
    return created;
  }

  async saveAppSettings(token: string, workspaceId: string, userId: string, updates: AppSettingsDto) {
    if (updates.default_provider && !updates.default_model) {
      updates.default_model = PROVIDER_DEFAULT_MODELS[updates.default_provider];
    }

    const { data, error } = await this.supabase
      .getAdminClient()
      .from('app_settings')
      .upsert({ workspace_id: workspaceId, user_id: userId, ...updates }, { onConflict: 'workspace_id' })
      .select()
      .single();
    if (error) throw error;

    await this.liveLogs.add(workspaceId, 'success', 'Settings updated', {
      provider: data.default_provider,
      model: data.default_model,
    });
    return data;
  }

  // ─── API keys (encrypted) ─────────────────────────────────

  async listApiKeys(token: string, workspaceId: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('api_keys')
      .select('id, provider, label, key_preview, status, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async saveApiKey(token: string, userId: string, workspaceId: string, provider: string, label: string, key: string) {
    const trimmed = key.trim();
    if (!trimmed) throw new BadRequestException('API key cannot be empty.');

    const encrypted = this.crypto.encrypt(trimmed); // throws clear error if secret missing
    const client = this.supabase.getClientWithToken(token);

    const { data, error } = await client
      .from('api_keys')
      .upsert(
        {
          user_id: userId,
          workspace_id: workspaceId,
          provider,
          label: label || provider,
          encrypted_key: encrypted,
          key_preview: this.crypto.preview(trimmed),
          status: 'active',
        },
        { onConflict: 'workspace_id,provider,label' },
      )
      .select('id, provider, label, key_preview, status, created_at')
      .single();
    if (error) throw error;

    await this.liveLogs.add(workspaceId, 'success', `API key added for ${provider}`, { label });
    return data;
  }

  async deleteApiKey(token: string, id: string) {
    const client = this.supabase.getClientWithToken(token);
    const { error } = await client.from('api_keys').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }

  async testApiKey(token: string, id: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('api_keys')
      .select('provider, encrypted_key')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('API key not found.');

    const endpoint = PROVIDER_TEST_ENDPOINTS[data.provider];
    if (!endpoint) return { ok: false, message: `Connection test not supported for ${data.provider}.` };

    const key = this.crypto.decrypt(data.encrypted_key);
    try {
      const res = await fetch(endpoint.url, { headers: endpoint.headers(key) });
      if (res.ok) return { ok: true, message: 'Connection successful.' };
      return { ok: false, message: `Provider returned ${res.status} — the key is likely invalid.` };
    } catch (err) {
      return { ok: false, message: `Connection failed: ${err instanceof Error ? err.message : 'network error'}` };
    }
  }

  /** Server-side only: decrypted key for the provider router. */
  async getDecryptedKey(workspaceId: string, provider: string): Promise<string | null> {
    if (!this.crypto.isConfigured()) return null;
    const { data } = await this.supabase
      .getAdminClient()
      .from('api_keys')
      .select('encrypted_key')
      .eq('workspace_id', workspaceId)
      .eq('provider', provider)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    try {
      return this.crypto.decrypt(data.encrypted_key);
    } catch {
      this.logger.warn(`Could not decrypt stored ${provider} key for workspace ${workspaceId}`);
      return null;
    }
  }
}
