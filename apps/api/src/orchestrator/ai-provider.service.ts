import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PROVIDER_DEFAULT_MODELS } from '@vf/shared';
import { SupabaseService } from '../supabase/supabase.service';
import { SettingsService } from '../settings/settings.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  workspaceId?: string;
  provider?: string;
  model?: string;
  temperature?: number;
}

export interface ResolvedProvider {
  provider: string;
  model: string;
  source: 'workspace_key' | 'env' | 'mock';
}

const ENV_KEY_NAMES: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GOOGLE_AI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
};

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
    private settings: SettingsService,
  ) {}

  /**
   * Provider router: resolves provider/model from workspace app_settings,
   * fetches the workspace's encrypted key (or env fallback), and calls the
   * right provider API. Falls back to a mock if no key is available.
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const { provider, model } = await this.resolveProviderModel(options);
    const apiKey = await this.resolveApiKey(provider, options?.workspaceId);

    if (!apiKey) {
      return this.chatMock(messages, provider);
    }

    const temperature = options?.temperature ?? 0.7;
    try {
      switch (provider) {
        case 'openai':
          return await this.chatOpenAICompatible('https://api.openai.com/v1', apiKey, model, messages, temperature);
        case 'deepseek':
          return await this.chatOpenAICompatible('https://api.deepseek.com', apiKey, model, messages, temperature);
        case 'anthropic':
          return await this.chatAnthropic(apiKey, model, messages, temperature);
        case 'gemini':
          return await this.chatGemini(apiKey, model, messages, temperature);
        default:
          return this.chatMock(messages, provider);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`${provider} call failed: ${message}`);
      throw new Error(`AI provider "${provider}" call failed: ${message}`);
    }
  }

  private async resolveProviderModel(options?: ChatOptions): Promise<{ provider: string; model: string }> {
    if (options?.provider) {
      return {
        provider: options.provider,
        model: options.model || PROVIDER_DEFAULT_MODELS[options.provider] || 'gpt-4o',
      };
    }

    if (options?.workspaceId) {
      const { data } = await this.supabase
        .getAdminClient()
        .from('app_settings')
        .select('default_provider, default_model')
        .eq('workspace_id', options.workspaceId)
        .maybeSingle();
      if (data?.default_provider) {
        return {
          provider: data.default_provider,
          model: data.default_model || PROVIDER_DEFAULT_MODELS[data.default_provider] || 'gpt-4o',
        };
      }
    }

    const envProvider = this.config.get<string>('DEFAULT_AI_PROVIDER', 'openai');
    return {
      provider: envProvider,
      model: this.config.get<string>('DEFAULT_AI_MODEL') || PROVIDER_DEFAULT_MODELS[envProvider] || 'gpt-4o',
    };
  }

  private async resolveApiKey(provider: string, workspaceId?: string): Promise<string | null> {
    if (workspaceId) {
      const stored = await this.settings.getDecryptedKey(workspaceId, provider);
      if (stored) return stored;
    }
    const envName = ENV_KEY_NAMES[provider];
    const envKey = envName ? this.config.get<string>(envName) : undefined;
    return envKey && envKey.trim() ? envKey.trim() : null;
  }

  // ─── OpenAI-compatible (OpenAI, DeepSeek) ─────────────────

  private async chatOpenAICompatible(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    temperature: number,
  ): Promise<string> {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || '';
  }

  // ─── Anthropic ────────────────────────────────────────────

  private async chatAnthropic(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    temperature: number,
  ): Promise<string> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const turns = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 4096, temperature, system: system || undefined, messages: turns }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content.filter((c) => c.type === 'text').map((c) => c.text).join('') || '';
  }

  // ─── Google Gemini ────────────────────────────────────────

  private async chatGemini(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    temperature: number,
  ): Promise<string> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents,
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          generationConfig: { temperature },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') || '';
  }

  // ─── Mock fallback (no API key configured) ────────────────

  private chatMock(messages: ChatMessage[], provider: string): string {
    this.logger.warn(`No API key for "${provider}" — using mock responses. Add a key in API Keys page or .env.`);
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const system = messages.find((m) => m.role === 'system');

    if (system?.content.includes('Manager Agent')) {
      return JSON.stringify({
        summary: `Task plan for: ${lastUser?.content?.slice(0, 80)}`,
        steps: [
          { order: 1, agent_slug: 'seo-strategy', title: 'SEO Strategy Analysis', description: 'Analyze domain and create SEO strategy framework', depends_on: [] },
          { order: 2, agent_slug: 'keyword-research', title: 'Keyword Research', description: 'Research and cluster target keywords by location and intent', depends_on: [1] },
          { order: 3, agent_slug: 'content-seo', title: 'Content Recommendations', description: 'Create content outlines and page recommendations', depends_on: [1, 2] },
          { order: 4, agent_slug: 'qa', title: 'Quality Review', description: 'Review all outputs and score quality', depends_on: [1, 2, 3] },
        ],
        estimated_duration_minutes: 15,
      });
    }

    if (system?.content.includes('QA Agent')) {
      return JSON.stringify({
        score: 92,
        passed: false,
        feedback: 'Good comprehensive output. Minor improvements needed in local keyword clustering and CTA placement.',
        revised_output: (lastUser?.content?.slice(0, 500) ?? '') + '\n\n[QA Enhanced per Valiant Firm standards.]',
      });
    }

    return `[${system?.content.split('\n')[0] || 'Agent'} — MOCK OUTPUT]\n\nNo AI provider key is configured, so this is sample output for: "${lastUser?.content?.slice(0, 120) || 'task'}"\n\n## Key Findings\n\n1. Comprehensive market analysis completed\n2. Strategic recommendations generated\n3. Actionable next steps identified\n\nAdd a real API key in the API Keys page to get live AI responses.\n\n---\n*Generated by Valiant Firm AI Agent (mock mode)*`;
  }
}
