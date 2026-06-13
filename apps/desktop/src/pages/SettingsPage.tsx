import { useEffect, useState } from 'react';
import { Settings, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { GlassPanel, LoadingSpinner } from '../components/ui';
import { AI_PROVIDERS, PROVIDER_DEFAULT_MODELS } from '@vf/shared';

const INTELLIGENCE_TOGGLES: Array<{ key: string; label: string }> = [
  { key: 'always_use_document_context', label: 'Always use uploaded document context' },
  { key: 'auto_quality_improvement', label: 'Auto quality improvement pass (VF 95+)' },
  { key: 'require_source_labels', label: 'Require confidence/source labels on estimates' },
  { key: 'require_missing_data_section', label: 'Require Missing Data section' },
  { key: 'require_aeo_geo_section', label: 'Require AEO/GEO section' },
  { key: 'require_local_seo_section', label: 'Require local SEO section when location present' },
  { key: 'require_schema_internal_links', label: 'Require schema + internal linking for SEO tasks' },
  { key: 'require_cro_section', label: 'Require CRO section for landing/content tasks' },
];

const TOGGLES: Array<{ key: string; label: string }> = [
  { key: 'require_email_approval', label: 'Require approval before sending emails' },
  { key: 'require_wordpress_approval', label: 'Require approval before publishing WordPress' },
  { key: 'require_ads_approval', label: 'Require approval before launching ads' },
  { key: 'require_file_delete_approval', label: 'Require approval before deleting files' },
  { key: 'sandbox_mode', label: 'Sandbox mode (no real tool execution)' },
];

export function SettingsPage() {
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);

  const { data: settings, loading, error, reload, workspace } = useWorkspaceData(
    (wsId) => api.settings.getApp(wsId),
  );

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleProviderChange = (provider: string) => {
    setForm((prev) => ({
      ...prev,
      default_provider: provider,
      default_model: PROVIDER_DEFAULT_MODELS[provider] || (prev?.default_model as string),
    }));
  };

  const save = async () => {
    if (!workspace || !form) return;
    setSaving(true);
    setToast(null);
    try {
      const saved = await api.settings.saveApp({
        workspace_id: workspace.id,
        default_provider: form.default_provider,
        default_model: form.default_model,
        require_email_approval: form.require_email_approval,
        require_wordpress_approval: form.require_wordpress_approval,
        require_ads_approval: form.require_ads_approval,
        require_file_delete_approval: form.require_file_delete_approval,
        sandbox_mode: form.sandbox_mode,
        default_output_depth: form.default_output_depth || 'vf95',
        always_use_document_context: form.always_use_document_context,
        auto_quality_improvement: form.auto_quality_improvement,
        require_source_labels: form.require_source_labels,
        require_missing_data_section: form.require_missing_data_section,
        require_aeo_geo_section: form.require_aeo_geo_section,
        require_local_seo_section: form.require_local_seo_section,
        require_schema_internal_links: form.require_schema_internal_links,
        require_cro_section: form.require_cro_section,
      });
      setForm(saved);
      setToast({ ok: true, message: 'Settings saved.' });
    } catch (err) {
      setToast({ ok: false, message: err instanceof Error ? err.message : 'Failed to save settings' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const syncAgents = async () => {
    if (!workspace) return;
    setSyncing(true);
    setToast(null);
    try {
      const result = await api.agents.sync(workspace.id);
      setToast({
        ok: result.success,
        message: result.success
          ? `${result.afterCount} Valiant Firm agents synced successfully.`
          : `Sync incomplete: ${result.afterCount}/${result.expected} agents.`,
      });
    } catch (err) {
      setToast({ ok: false, message: err instanceof Error ? err.message : 'Agent sync failed' });
    } finally {
      setSyncing(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between max-w-4xl">
        <div>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="text-vf-muted text-sm mt-1">Application and safety configuration</p>
        </div>
        <button onClick={() => void save()} disabled={saving || !form} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {toast && (
        <p className={`text-sm max-w-4xl ${toast.ok ? 'text-green-400' : 'text-red-400'}`}>{toast.message}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center max-w-4xl">
          <p className="text-red-400 text-sm mb-2">Could not load settings</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : form && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
          <GlassPanel className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5 text-vf-gold" />
              <h2 className="font-display text-sm font-semibold">General</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-vf-muted">Default AI Provider</label>
                <select
                  className="input-field mt-1"
                  value={(form.default_provider as string) || 'openai'}
                  onChange={(e) => handleProviderChange(e.target.value)}
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-vf-muted">Default Model</label>
                <input
                  className="input-field mt-1"
                  value={(form.default_model as string) || ''}
                  onChange={(e) => setForm({ ...form, default_model: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-vf-muted">Default Output Depth</label>
                <select
                  className="input-field mt-1"
                  value={(form.default_output_depth as string) || 'vf95'}
                  onChange={(e) => setForm({ ...form, default_output_depth: e.target.value })}
                >
                  <option value="standard">Standard</option>
                  <option value="advanced">Advanced</option>
                  <option value="vf95">VF 95+</option>
                </select>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-vf-gold" />
              <h2 className="font-display text-sm font-semibold">VF Intelligence Engine</h2>
            </div>
            <div className="space-y-3">
              {INTELLIGENCE_TOGGLES.map(({ key, label }) => {
                const enabled = form[key] !== false;
                return (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, [key]: !enabled })}
                    className="flex items-center justify-between py-1 w-full text-left"
                  >
                    <span className="text-sm">{label}</span>
                    {enabled ? (
                      <ToggleRight className="w-8 h-8 text-vf-gold shrink-0" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-vf-muted shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => void syncAgents()}
              disabled={syncing || !workspace}
              className="btn-secondary mt-4 w-full text-sm disabled:opacity-50"
            >
              {syncing ? 'Syncing agents...' : 'Sync VF Agents'}
            </button>
          </GlassPanel>

          <GlassPanel className="p-5 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-vf-gold" />
              <h2 className="font-display text-sm font-semibold">Safety & Approvals</h2>
            </div>
            <div className="space-y-3">
              {TOGGLES.map(({ key, label }) => {
                const enabled = Boolean(form[key]);
                return (
                  <button
                    key={key}
                    onClick={() => setForm({ ...form, [key]: !enabled })}
                    className="flex items-center justify-between py-1 w-full text-left"
                  >
                    <span className="text-sm">{label}</span>
                    {enabled ? (
                      <ToggleRight className="w-8 h-8 text-vf-gold shrink-0" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-vf-muted shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
