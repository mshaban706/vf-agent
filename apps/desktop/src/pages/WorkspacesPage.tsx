import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Globe, MapPin } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../stores/app';
import { GlassPanel, LoadingSpinner } from '../components/ui';

export function WorkspacesPage() {
  const { currentWorkspace, setWorkspace, workspaceReady } = useAppStore();
  const [workspaces, setWorkspaces] = useState<Array<Record<string, unknown>>>([]);
  const [clients, setClients] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsSlug, setWsSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ws = await api.workspaces.list();
      setWorkspaces(ws);
      if (ws.length > 0) {
        const wsId = currentWorkspace?.id || (ws[0].id as string);
        const c = await api.clients.list(wsId);
        setClients(c);
      } else {
        setClients([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load workspaces';
      console.error('Workspaces load error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (workspaceReady) void load();
  }, [workspaceReady, load]);

  const createWorkspace = async () => {
    if (!wsName || !wsSlug) {
      setCreateError('Name and slug are required.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const ws = await api.workspaces.create(wsName, wsSlug);
      setWorkspace(ws as { id: string; name: string; slug: string });
      setShowCreate(false);
      setWsName('');
      setWsSlug('');
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-400/10 text-green-400',
    paused: 'bg-yellow-400/10 text-yellow-400',
    archived: 'bg-vf-muted/10 text-vf-muted',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Client Workspaces</h1>
          <p className="text-vf-muted text-sm mt-1">Manage workspaces and client accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(true)} className="btn-secondary">New Workspace</button>
          <Link to="/clients/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Client
          </Link>
        </div>
      </div>

      {showCreate && (
        <GlassPanel gold className="p-5 space-y-3">
          <h3 className="font-display text-sm text-vf-gold">Create Workspace</h3>
          <input className="input-field" placeholder="Workspace Name" value={wsName} onChange={(e) => { setWsName(e.target.value); setWsSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); }} />
          <input className="input-field" placeholder="Slug" value={wsSlug} onChange={(e) => setWsSlug(e.target.value)} />
          {createError && <p className="text-red-400 text-xs">{createError}</p>}
          <div className="flex gap-2">
            <button onClick={() => void createWorkspace()} disabled={creating} className="btn-primary disabled:opacity-50">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </GlassPanel>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-red-400 text-sm mb-2">Could not load workspaces</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void load()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <GlassPanel
                key={ws.id as string}
                gold={currentWorkspace?.id === ws.id}
                className="p-5 cursor-pointer hover:border-vf-gold/40 transition-all"
                onClick={() => setWorkspace(ws as { id: string; name: string; slug: string })}
              >
                <h3 className="font-display font-semibold">{ws.name as string}</h3>
                <p className="text-xs text-vf-muted mt-1">/{ws.slug as string}</p>
              </GlassPanel>
            ))}
          </div>

          <h2 className="font-display text-lg font-semibold text-vf-gold mt-4">Clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.length === 0 && (
              <GlassPanel className="p-8 text-center col-span-full">
                <p className="text-vf-muted">No clients yet.</p>
                <Link to="/clients/new" className="btn-primary mt-4 inline-block">Add First Client</Link>
              </GlassPanel>
            )}
            {clients.map((client) => (
              <GlassPanel key={client.id as string} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{client.name as string}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${STATUS_COLORS[(client.status as string) || 'active'] || STATUS_COLORS.active}`}>
                    {(client.status as string) || 'active'}
                  </span>
                </div>
                {Boolean(client.website || client.domain) && (
                  <p className="text-sm text-vf-muted flex items-center gap-1 mt-1">
                    <Globe className="w-3 h-3" /> {(client.website || client.domain) as string}
                  </p>
                )}
                {Boolean(client.location || client.service_area) && (
                  <p className="text-sm text-vf-muted flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {(client.location || client.service_area) as string}
                    {client.radius_miles ? ` (${client.radius_miles} mi)` : ''}
                  </p>
                )}
                {Boolean(client.industry) && (
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-vf-gold/10 text-vf-gold border border-vf-gold/20">
                    {client.industry as string}
                  </span>
                )}
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
