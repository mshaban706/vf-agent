import { useState } from 'react';
import { GlassPanel, LoadingSpinner } from '../components/ui';
import { Wrench, Mail, FileSpreadsheet, Globe, Database, MessageCircle, Monitor, X } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';

const TOOL_ICONS: Record<string, typeof Wrench> = {
  'google-sheets': FileSpreadsheet,
  gmail: Mail,
  'google-calendar': FileSpreadsheet,
  wordpress: Globe,
  supabase: Database,
  whatsapp: MessageCircle,
  playwright: Monitor,
  'web-search': Wrench,
};

export function ToolsPage() {
  const [configuring, setConfiguring] = useState<Record<string, unknown> | null>(null);
  const [configText, setConfigText] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const { data: tools, loading, error, reload, workspace } = useWorkspaceData(
    (wsId) => api.integrations.list(wsId),
  );

  const openConfig = (tool: Record<string, unknown>) => {
    setConfiguring(tool);
    setConfigText('');
    setModalError(null);
  };

  const saveConfig = async () => {
    if (!workspace || !configuring) return;
    let config: Record<string, unknown> = {};
    if (configText.trim()) {
      try {
        config = JSON.parse(configText);
      } catch {
        config = { value: configText.trim() };
      }
    }
    setSaving(true);
    setModalError(null);
    try {
      await api.integrations.save(configuring.provider as string, workspace.id, config);
      setConfiguring(null);
      await reload();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="font-display text-2xl font-bold mb-1">Tools & Integrations</h1>
      <p className="text-vf-muted text-sm mb-6">MCP-compatible tool layer for agent automation</p>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-red-400 text-sm mb-2">Could not load integrations</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(tools ?? []).map((tool) => {
            const Icon = TOOL_ICONS[tool.provider as string] || Wrench;
            const connected = Boolean(tool.connected);
            return (
              <GlassPanel key={tool.provider as string} className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-vf-gold/10 border border-vf-gold/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-vf-gold" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{tool.name as string}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                        connected
                          ? 'bg-green-400/10 text-green-400 border-green-400/20'
                          : 'bg-vf-muted/10 text-vf-muted border-vf-border'
                      }`}>
                        {connected ? 'Configured' : 'Not Connected'}
                      </span>
                    </div>
                    <p className="text-xs text-vf-muted">{tool.category as string}</p>
                    <div className="flex gap-2 mt-2">
                      {Boolean(tool.requires_approval) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-400/10 text-orange-400 border border-orange-400/20">
                          Requires Approval
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        tool.phase === 1
                          ? 'bg-green-400/10 text-green-400 border-green-400/20'
                          : 'bg-vf-muted/10 text-vf-muted border-vf-border'
                      }`}>
                        Phase {tool.phase as number}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => openConfig(tool)} className="btn-secondary w-full mt-4 text-sm">
                  Configure
                </button>
              </GlassPanel>
            );
          })}
        </div>
      )}

      {configuring && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <GlassPanel gold className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Configure {configuring.name as string}</h2>
              <button onClick={() => setConfiguring(null)} className="text-vf-muted hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-vf-muted mb-3">
              Save connection details for this integration. Full execution support arrives in Phase 2.
            </p>
            <textarea
              className="input-field font-mono text-xs"
              rows={6}
              placeholder={'{ "api_url": "...", "notes": "..." }'}
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
            />
            {modalError && <p className="text-red-400 text-xs mt-2">{modalError}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => void saveConfig()} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setConfiguring(null)} className="btn-secondary">Cancel</button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
