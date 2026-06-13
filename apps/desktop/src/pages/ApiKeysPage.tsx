import { useState } from 'react';
import { Key, Plus, Trash2, PlugZap } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { GlassPanel, LoadingSpinner } from '../components/ui';
import { AI_PROVIDERS } from '@vf/shared';

export function ApiKeysPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ provider: 'openai', label: '', key: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);

  const { data: keys, loading, error, reload, workspace } = useWorkspaceData(
    (wsId) => api.settings.listApiKeys(wsId),
  );

  const save = async () => {
    if (!workspace) return;
    if (!form.key.trim()) {
      setFormError('API key is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.settings.saveApiKey({
        workspace_id: workspace.id,
        provider: form.provider,
        label: form.label || form.provider,
        key: form.key,
      });
      setShowAdd(false);
      setForm({ provider: 'openai', label: '', key: '' });
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save key');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.settings.deleteApiKey(id);
      await reload();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const test = async (id: string) => {
    setTesting(id);
    try {
      const result = await api.settings.testApiKey(id);
      setTestResults((prev) => ({ ...prev, [id]: result }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, message: err instanceof Error ? err.message : 'Test failed' },
      }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">API Keys</h1>
          <p className="text-vf-muted text-sm mt-1">Configure AI provider credentials — keys are encrypted server-side</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Key
        </button>
      </div>

      {showAdd && (
        <GlassPanel gold className="p-5 space-y-3 max-w-lg">
          <h3 className="font-display text-sm text-vf-gold">Add API Key</h3>
          <select
            className="input-field"
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input className="input-field" placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <input className="input-field" type="password" placeholder="API Key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <div className="flex gap-2">
            <button onClick={() => void save()} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setShowAdd(false); setFormError(null); }} className="btn-secondary">Cancel</button>
          </div>
        </GlassPanel>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center max-w-2xl">
          <p className="text-red-400 text-sm mb-2">Could not load API keys</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {(keys ?? []).length === 0 && (
            <GlassPanel className="p-8 text-center">
              <Key className="w-8 h-8 text-vf-muted mx-auto mb-2" />
              <p className="text-vf-muted">No API keys configured. Add one to enable live AI responses.</p>
            </GlassPanel>
          )}
          {(keys ?? []).map((k) => (
            <GlassPanel key={k.id as string} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-vf-gold" />
                  <div>
                    <p className="text-sm font-medium">{k.label as string}</p>
                    <p className="text-xs text-vf-muted capitalize">
                      {k.provider as string}
                      {(k.key_preview as string) && (
                        <span className="ml-2 font-mono">{k.key_preview as string}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${k.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-vf-muted/10 text-vf-muted'}`}>
                    {k.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => void test(k.id as string)}
                    disabled={testing === k.id}
                    className="btn-ghost text-vf-gold disabled:opacity-50"
                    title="Test connection"
                  >
                    <PlugZap className="w-4 h-4" />
                  </button>
                  <button onClick={() => void remove(k.id as string)} className="btn-ghost text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {testResults[k.id as string] && (
                <p className={`text-xs mt-2 ${testResults[k.id as string].ok ? 'text-green-400' : 'text-red-400'}`}>
                  {testResults[k.id as string].message}
                </p>
              )}
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
