import { useState } from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { GlassPanel, LoadingSpinner } from '../components/ui';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export function ApprovalsPage() {
  const [tab, setTab] = useState('pending');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: approvals, loading, error, reload } = useWorkspaceData(
    (wsId) => api.approvals.list(wsId, tab),
    [tab],
  );

  const review = async (id: string, approved: boolean) => {
    setActionError(null);
    try {
      await api.approvals.review(id, approved);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Review failed');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Approval Center</h1>
        <p className="text-vf-muted text-sm mt-1">Human approval layer for risky agent actions</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-sm px-4 py-1.5 rounded-lg border transition-all ${
              tab === t.key
                ? 'bg-vf-gold/10 border-vf-gold/30 text-vf-gold'
                : 'border-white/10 text-vf-muted hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionError && <p className="text-red-400 text-sm">{actionError}</p>}

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center max-w-3xl">
          <p className="text-red-400 text-sm mb-2">Could not load approvals</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : (approvals ?? []).length === 0 ? (
        <GlassPanel className="p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-vf-muted mx-auto mb-4" />
          <p className="text-vf-muted">
            {tab === 'pending' ? 'No pending approvals. All clear.' : `No ${tab} approvals yet.`}
          </p>
          <p className="text-xs text-vf-muted mt-2">
            Risky actions (emails, publishing, ads, deletions) will require your approval here.
          </p>
        </GlassPanel>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {(approvals ?? []).map((a) => (
            <GlassPanel key={a.id as string} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded border ${RISK_COLORS[a.risk_level as string] || RISK_COLORS.medium}`}>
                      {((a.risk_level as string) || 'medium').toUpperCase()}
                    </span>
                    <span className="text-xs text-vf-muted">{a.action_type as string}</span>
                  </div>
                  {(a.title as string) && <p className="text-sm font-medium mt-2">{a.title as string}</p>}
                  <p className="text-sm mt-1 text-vf-muted">{a.description as string}</p>
                  <p className="text-xs text-vf-muted mt-2">
                    Requested {new Date(a.created_at as string).toLocaleString()}
                  </p>
                </div>
                {tab === 'pending' ? (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => void review(a.id as string, true)} className="btn-primary flex items-center gap-1 text-sm py-1.5">
                      <Check className="w-3 h-3" /> Approve
                    </button>
                    <button onClick={() => void review(a.id as string, false)} className="btn-secondary flex items-center gap-1 text-sm py-1.5 text-red-400">
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded shrink-0 ${tab === 'approved' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                    {tab === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
