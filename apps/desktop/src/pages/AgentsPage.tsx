import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map, Plus, History, RefreshCw, Search, Play } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { AgentAvatar, GlassPanel, LoadingSpinner, StatusBadge } from '../components/ui';

export function AgentsPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [recentTasks, setRecentTasks] = useState<Array<Record<string, unknown>>>([]);
  const [runs, setRuns] = useState<Array<Record<string, unknown>> | null>(null);
  const [showRuns, setShowRuns] = useState(false);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const { data: agents, loading, error, reload, workspace } = useWorkspaceData(
    (wsId) => api.agents.list(wsId),
  );

  useEffect(() => {
    if (!selected || !workspace) {
      setRecentTasks([]);
      setRuns(null);
      setShowRuns(false);
      return;
    }
    setShowRuns(false);
    setRuns(null);
    api.agents
      .tasks(selected.slug as string, workspace.id)
      .then(setRecentTasks)
      .catch(() => setRecentTasks([]));
  }, [selected, workspace]);

  const loadRuns = async () => {
    if (!selected || !workspace) return;
    setShowRuns(true);
    try {
      setRuns(await api.agents.runs(selected.slug as string, workspace.id));
    } catch {
      setRuns([]);
    }
  };

  const handleSync = async () => {
    if (!workspace) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await api.agents.sync(workspace.id);
      await reload();
      setSyncMessage(
        result.success
          ? `${result.afterCount} Valiant Firm agents synced successfully.`
          : `Sync incomplete: ${result.afterCount}/${result.expected} agents.`,
      );
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const filteredAgents = (agents ?? []).filter((agent) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (agent.name as string)?.toLowerCase().includes(q) ||
      (agent.role as string)?.toLowerCase().includes(q) ||
      (agent.slug as string)?.toLowerCase().includes(q) ||
      ((agent.tags as string[]) ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Agent Directory</h1>
          <p className="text-vf-muted text-sm mt-1">
            {agents ? `${agents.length} specialized AI agents in your workforce` : 'Your AI agent workforce'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleSync()}
            disabled={syncing || !workspace}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync VF Agents
          </button>
          <Link to="/agent-town" className="btn-secondary flex items-center gap-2">
            <Map className="w-4 h-4" /> Agent Town
          </Link>
        </div>
      </div>

      {syncMessage && (
        <p className={`text-sm mb-4 ${syncMessage.includes('successfully') ? 'text-green-400' : 'text-yellow-400'}`}>
          {syncMessage}
        </p>
      )}

      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-vf-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9 w-full"
            placeholder="Search agents by name, role, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-red-400 text-sm mb-2">Could not load agents</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(filteredAgents ?? []).map((agent, i) => (
              <motion.div
                key={agent.slug as string}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassPanel
                  className={`p-5 cursor-pointer transition-all ${selected?.slug === agent.slug ? 'border-vf-gold/50' : 'hover:border-vf-gold/20'}`}
                  onClick={() => setSelected(agent)}
                >
                  <div className="flex items-start gap-4">
                    <AgentAvatar
                      name={agent.name as string}
                      color={agent.avatar_color as string}
                      size="lg"
                      status={agent.status === 'busy' ? 'working' : 'idle'}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{agent.name as string}</h3>
                      <p className="text-xs text-vf-gold">{agent.role as string}</p>
                      <p className="text-sm text-vf-muted mt-2 line-clamp-2">{agent.description as string}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {((agent.capabilities as string[]) ?? []).slice(0, 4).map((cap) => (
                      <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-vf-black-light border border-vf-border text-vf-muted">
                        {cap.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {((agent.skills as string[]) ?? []).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-vf-gold/10 text-vf-gold border border-vf-gold/20">
                        VF 95+
                      </span>
                    )}
                    {((agent.skills as string[]) ?? []).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-vf-gold/5 text-vf-muted border border-vf-border">
                        {((agent.skills as string[]) ?? []).length} skills
                      </span>
                    )}
                    {Boolean(agent.uses_document_context) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20">
                        Sheet-aware
                      </span>
                    )}
                  </div>
                </GlassPanel>
              </motion.div>
            ))}
          </div>

          <div>
            {selected ? (
              <GlassPanel gold className="p-5 sticky top-6">
                <div className="flex items-start justify-between">
                  <AgentAvatar name={selected.name as string} color={selected.avatar_color as string} size="lg" />
                  <StatusBadge status={(selected.status as string) || 'available'} />
                </div>
                <h3 className="font-display text-lg font-bold mt-4">{selected.name as string}</h3>
                <p className="text-sm text-vf-gold">{selected.role as string}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-vf-gold/10 text-vf-gold border border-vf-gold/20">VF 95+ Target</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-vf-black-light border border-vf-border text-vf-muted">
                    v{(selected.prompt_version as string) || '2.0'}
                  </span>
                  {Boolean(selected.uses_document_context) && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-400/10 text-blue-400">Context-aware</span>
                  )}
                </div>
                <p className="text-sm text-vf-muted mt-3">{selected.description as string}</p>

                {((selected.skills as string[]) ?? []).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs text-vf-gold font-semibold mb-2">VF SKILLS ({((selected.skills as string[]) ?? []).length})</h4>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {(selected.skills as string[]).slice(0, 12).map((skill) => (
                        <span key={skill} className="text-[10px] px-1.5 py-0.5 rounded bg-vf-gold/5 text-vf-muted border border-vf-border">
                          {skill.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {((selected.tags as string[]) ?? []).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs text-vf-gold font-semibold mb-2">TAGS</h4>
                    <div className="flex flex-wrap gap-1">
                      {(selected.tags as string[]).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded bg-vf-black-light border border-vf-border text-vf-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <h4 className="text-xs text-vf-gold font-semibold mb-2">CAPABILITIES</h4>
                  <div className="flex flex-wrap gap-1">
                    {((selected.capabilities as string[]) ?? []).map((cap) => (
                      <span key={cap} className="text-xs px-2 py-0.5 rounded bg-vf-gold/10 text-vf-gold border border-vf-gold/20">
                        {cap.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs text-vf-gold font-semibold mb-2">PERMISSIONS</h4>
                  <div className="flex flex-wrap gap-1">
                    {((selected.permission_scopes as string[]) ?? []).map((scope) => (
                      <span key={scope} className="text-xs px-2 py-0.5 rounded bg-vf-black-light border border-vf-border text-vf-muted">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h4 className="text-xs text-vf-gold font-semibold mb-2">RECENT TASKS</h4>
                  {recentTasks.length === 0 ? (
                    <p className="text-xs text-vf-muted">No tasks yet for this agent.</p>
                  ) : (
                    <div className="space-y-1">
                      {recentTasks.slice(0, 5).map((t) => (
                        <Link key={t.id as string} to={`/tasks/${t.id}`} className="block text-xs text-vf-muted hover:text-vf-gold truncate">
                          • {t.title as string}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {showRuns && (
                  <div className="mt-4">
                    <h4 className="text-xs text-vf-gold font-semibold mb-2">RUN HISTORY</h4>
                    {runs === null ? (
                      <LoadingSpinner size="sm" />
                    ) : runs.length === 0 ? (
                      <p className="text-xs text-vf-muted">No runs recorded yet.</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {runs.map((r) => {
                          const quality = (r.output_quality as Record<string, number> | undefined)?.vf_standard_score;
                          return (
                          <div key={r.id as string} className="text-xs text-vf-muted flex items-center justify-between gap-2">
                            <span className={r.status === 'failed' ? 'text-red-400' : r.status === 'completed' ? 'text-green-400' : ''}>
                              {r.status as string}
                              {quality != null && (
                                <span className={`ml-1 ${quality >= 95 ? 'text-vf-gold' : 'text-yellow-400'}`}>
                                  VF {quality}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0">{new Date(r.created_at as string).toLocaleString()}</span>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => navigate(`/tasks?create=1&agent=${selected.slug as string}`)}
                    className="btn-primary flex items-center gap-1 text-sm flex-1 justify-center"
                  >
                    <Plus className="w-3 h-3" /> Create Task
                  </button>
                  <button
                    onClick={() => navigate(`/tasks?create=1&agent=${selected.slug as string}`)}
                    className="btn-secondary flex items-center gap-1 text-sm flex-1 justify-center"
                  >
                    <Play className="w-3 h-3" /> Run Agent
                  </button>
                  <button onClick={() => void loadRuns()} className="btn-secondary flex items-center gap-1 text-sm flex-1 justify-center">
                    <History className="w-3 h-3" /> Runs
                  </button>
                </div>
              </GlassPanel>
            ) : (
              <GlassPanel className="p-8 text-center text-vf-muted">
                Select an agent to view details
              </GlassPanel>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
