export const APP_NAME = 'VF Agent Command Center';
export const APP_TAGLINE = 'Valiant Firm AI Workforce Operating System';
export const APP_VERSION = '1.0.0';

export const COLORS = {
  gold: '#D4AF37',
  goldLight: '#F5E6A3',
  goldDark: '#B8960C',
  black: '#0A0A0A',
  blackLight: '#141414',
  blackCard: '#1A1A1A',
  white: '#FAFAFA',
  whiteMuted: '#A3A3A3',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
} as const;

export const RISK_ACTIONS = [
  'delete_file',
  'send_email',
  'publish_wordpress',
  'launch_ads',
  'modify_crm',
  'send_whatsapp',
] as const;

export const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'o1'] },
  { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'] },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-2.0-flash'] },
  { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
] as const;

export const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-latest',
  gemini: 'gemini-1.5-pro',
  deepseek: 'deepseek-chat',
};

export const INTEGRATION_PROVIDERS = [
  { slug: 'google-sheets', name: 'Google Sheets', category: 'Productivity', requiresApproval: false, phase: 2 },
  { slug: 'gmail', name: 'Gmail', category: 'Communication', requiresApproval: true, phase: 2 },
  { slug: 'google-calendar', name: 'Google Calendar', category: 'Productivity', requiresApproval: false, phase: 2 },
  { slug: 'wordpress', name: 'WordPress', category: 'CMS', requiresApproval: true, phase: 2 },
  { slug: 'supabase', name: 'Supabase', category: 'Database', requiresApproval: false, phase: 2 },
  { slug: 'whatsapp', name: 'WhatsApp Gateway', category: 'Communication', requiresApproval: true, phase: 2 },
  { slug: 'playwright', name: 'Browser Automation', category: 'Automation', requiresApproval: true, phase: 2 },
  { slug: 'web-search', name: 'Web Search', category: 'Research', requiresApproval: false, phase: 1 },
] as const;
