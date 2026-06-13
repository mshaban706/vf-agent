import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Users, Kanban, Activity, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAppStore } from '../stores/app';
import { CommandInput } from '../components/CommandInput';
import { StatCard, GlassPanel, StatusBadge, AgentAvatar, LoadingSpinner } from '../components/ui';

export function CommandCenterPage() {
  const { currentWorkspace, workspaceReady } = useAppStore();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [agents, setAgents] = useState<Array<Record<string, unknown>>>([]);
  const [recentTasks, setRecentTasks] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace) {
      if (workspaceReady) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      api.workspaces.stats(currentWorkspace.id),
      api.agents.list(currentWorkspace.id),
      api.tasks.list(currentWorkspace.id),
    ])
      .then(([s, a, t]) => {
        setStats(s);
        setAgents(a.slice(0, 6));
        setRecentTasks(t.slice(0, 5));
      })
      .catch((err: Error) => {
        console.error('Command center load error:', err);
        setError(err.message || 'Failed to load dashboard');
      })
      .finally(() => setLoading(false));
  }, [currentWorkspace, workspaceReady]);

  if (workspaceReady && !currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <GlassPanel className="p-8 text-center">
          <p className="text-vf-muted mb-4">No workspace selected</p>
          <Link to="/workspaces" className="btn-primary">Create Workspace</Link>
        </GlassPanel>
      </div>
    );
  }
  if (!currentWorkspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-display text-2xl font-bold text-white"
          >
            Command Center
          </motion.h1>
          <p className="text-vf-muted text-sm mt-1">
            {currentWorkspace.name} — AI Workforce Status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="status-dot bg-green-400 animate-pulse" />
          <span className="text-sm text-green-400">System Online</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-red-400 text-sm mb-2">Could not load dashboard</p>
          <p className="text-vf-muted text-xs">{error}</p>
        </GlassPanel>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Agents" value={stats?.agent_count || 0} icon={<Bot className="w-5 h-5" />} />
            <StatCard label="Clients" value={stats?.client_count || 0} icon={<Users className="w-5 h-5" />} />
            <StatCard label="Active Tasks" value={stats?.active_tasks || 0} icon={<Activity className="w-5 h-5" />} />
            <StatCard label="Completed" value={stats?.completed_tasks || 0} icon={<Kanban className="w-5 h-5" />} />
          </div>

          <CommandInput />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassPanel className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-sm font-semibold text-vf-gold">Agent Workforce</h2>
                <Link to="/agents" className="text-xs text-vf-muted hover:text-vf-gold flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {agents.map((agent) => (
                  <div key={agent.slug as string} className="flex items-center gap-3 p-3 rounded-lg bg-vf-black-light border border-vf-border">
                    <AgentAvatar
                      name={agent.name as string}
                      color={agent.avatar_color as string}
                      status="idle"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name as string}</p>
                      <p className="text-xs text-vf-muted truncate">{agent.role as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-sm font-semibold text-vf-gold">Recent Tasks</h2>
                <Link to="/tasks" className="text-xs text-vf-muted hover:text-vf-gold flex items-center gap-1">
                  Task Board <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {recentTasks.length === 0 && (
                  <p className="text-vf-muted text-sm py-4 text-center">No tasks yet. Execute a command above.</p>
                )}
                {recentTasks.map((task) => (
                  <Link
                    key={task.id as string}
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-vf-black-light border border-vf-border hover:border-vf-gold/30 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{task.title as string}</p>
                      <p className="text-xs text-vf-muted truncate">{(task.command as string)?.slice(0, 60)}</p>
                    </div>
                    <StatusBadge status={task.status as string} />
                  </Link>
                ))}
              </div>
            </GlassPanel>
          </div>
        </>
      )}
    </div>
  );
}
