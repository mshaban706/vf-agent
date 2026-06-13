import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAppStore } from '../stores/app';
import { GlassPanel } from '../components/ui';

export function CreateClientPage() {
  const { currentWorkspace } = useAppStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    domain: '',
    industry: '',
    service_area: '',
    radius_miles: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) {
      setError('No active workspace. Open the Workspaces page first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.clients.create({
        workspace_id: currentWorkspace.id,
        name: form.name,
        domain: form.domain || undefined,
        industry: form.industry || undefined,
        service_area: form.service_area || undefined,
        radius_miles: form.radius_miles ? parseInt(form.radius_miles) : undefined,
        notes: form.notes || undefined,
      });
      navigate('/workspaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-1">Create New Client</h1>
        <p className="text-vf-muted text-sm mb-6">Add a client to your workspace</p>

        <GlassPanel gold className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-vf-muted mb-1 block">Client Name *</label>
              <input className="input-field" value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-vf-muted mb-1 block">Domain</label>
              <input className="input-field" placeholder="example.com" value={form.domain} onChange={(e) => update('domain', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-vf-muted mb-1 block">Industry</label>
                <input className="input-field" placeholder="Insulation, Roofing..." value={form.industry} onChange={(e) => update('industry', e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-vf-muted mb-1 block">Service Area</label>
                <input className="input-field" placeholder="Tampa Bay, FL" value={form.service_area} onChange={(e) => update('service_area', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm text-vf-muted mb-1 block">Radius (miles)</label>
              <input className="input-field" type="number" placeholder="150" value={form.radius_miles} onChange={(e) => update('radius_miles', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-vf-muted mb-1 block">Notes</label>
              <textarea className="input-field min-h-[100px]" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Client'}</button>
              <button type="button" onClick={() => navigate('/workspaces')} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </GlassPanel>
      </div>
    </div>
  );
}
