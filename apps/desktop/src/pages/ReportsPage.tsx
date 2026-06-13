import { GlassPanel, LoadingSpinner, StatCard } from '../components/ui';
import { FileBarChart, Users, ListChecks, CheckCircle2, ShieldCheck, ScrollText, Bot } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';

export function ReportsPage() {
  const { data: summary, loading, error, reload } = useWorkspaceData(
    (wsId) => api.reports.summary(wsId),
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="font-display text-2xl font-bold mb-1">Reports</h1>
      <p className="text-vf-muted text-sm mb-6">Workspace overview and analytics</p>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-red-400 text-sm mb-2">Could not load report data</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Clients" value={summary.total_clients} icon={<Users className="w-5 h-5" />} />
            <StatCard label="Total Tasks" value={summary.total_tasks} icon={<ListChecks className="w-5 h-5" />} />
            <StatCard label="Completed Tasks" value={summary.completed_tasks} icon={<CheckCircle2 className="w-5 h-5" />} />
            <StatCard label="Pending Approvals" value={summary.pending_approvals} icon={<ShieldCheck className="w-5 h-5" />} />
            <StatCard label="Total Logs" value={summary.total_logs} icon={<ScrollText className="w-5 h-5" />} />
            <StatCard label="Active Agents" value={summary.active_agents} icon={<Bot className="w-5 h-5" />} />
            <StatCard label="Uploaded Documents" value={summary.uploaded_documents ?? 0} icon={<FileBarChart className="w-5 h-5" />} />
            <StatCard label="Avg Quality Score" value={summary.average_quality_score ?? '—'} icon={<CheckCircle2 className="w-5 h-5" />} />
          </div>

          <GlassPanel className="p-8 text-center">
            <FileBarChart className="w-10 h-10 text-vf-muted mx-auto mb-3" />
            <p className="text-vf-muted text-sm">Advanced SEO reports coming in Phase 2.</p>
            <p className="text-xs text-vf-muted mt-2">
              Will include MoM growth, keyword rankings, backlink growth, and 30-day focus plans.
            </p>
          </GlassPanel>
        </>
      )}
    </div>
  );
}
