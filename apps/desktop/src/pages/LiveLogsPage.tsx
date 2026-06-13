import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { GlassPanel, TerminalLog, LoadingSpinner } from '../components/ui';

const LEVELS = [
  { key: 'all', label: 'All' },
  { key: 'info', label: 'Info' },
  { key: 'warning', label: 'Warning' },
  { key: 'error', label: 'Error' },
  { key: 'success', label: 'Success' },
];

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-blue-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  success: 'text-green-400',
};

export function LiveLogsPage() {
  const [level, setLevel] = useState('all');

  const { data: logs, setData, loading, error, reload, workspace } = useWorkspaceData(
    (wsId) => api.logs.list(wsId, level),
    [level],
  );

  // lightweight realtime: poll for new logs every 5 seconds
  useEffect(() => {
    if (!workspace) return;
    const interval = setInterval(() => {
      api.logs.list(workspace.id, level).then(setData).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [workspace, level, setData]);

  const terminalLogs = (logs ?? [])
    .slice()
    .reverse()
    .map((l) => ({
      id: l.id as string,
      level: l.level as string,
      agent_slug: (l.agent_slug as string) || 'system',
      message: l.message as string,
      created_at: l.created_at as string,
    }));

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6">
      <h1 className="font-display text-2xl font-bold mb-1">Live Agent Logs</h1>
      <p className="text-vf-muted text-sm mb-4">Terminal-style agent activity stream</p>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-red-400 text-sm mb-2">Could not load logs</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
          <GlassPanel className="p-3 overflow-y-auto">
            <h3 className="text-xs text-vf-gold font-semibold mb-2">FILTERS</h3>
            {LEVELS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLevel(l.key)}
                className={`w-full text-left p-2 rounded-lg mb-1 transition-all text-sm ${
                  level === l.key ? 'bg-vf-gold/10 border border-vf-gold/30' : 'hover:bg-white/5'
                }`}
              >
                <span className={l.key !== 'all' ? LEVEL_COLORS[l.key] : ''}>{l.label}</span>
                {level === l.key && logs && (
                  <span className="ml-2 text-xs text-vf-muted">({logs.length})</span>
                )}
              </button>
            ))}
          </GlassPanel>

          <GlassPanel className="lg:col-span-3 p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Workspace activity</h3>
              <button onClick={() => void reload()} className="text-xs text-vf-gold hover:underline">Refresh</button>
            </div>
            <div className="flex-1 min-h-0">
              {terminalLogs.length === 0 ? (
                <p className="text-vf-muted text-center py-12">No logs yet.</p>
              ) : (
                <TerminalLog logs={terminalLogs} />
              )}
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
