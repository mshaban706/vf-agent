import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { GlassPanel, StatusBadge, LoadingSpinner } from '../components/ui';

const COLUMNS = [
  { key: 'pending', statuses: ['pending', 'planning'], label: 'Pending', color: 'border-vf-muted' },
  { key: 'in_progress', statuses: ['in_progress', 'qa_review'], label: 'In Progress', color: 'border-vf-gold' },
  { key: 'needs_approval', statuses: ['needs_approval'], label: 'Needs Approval', color: 'border-purple-400' },
  { key: 'completed', statuses: ['completed'], label: 'Completed', color: 'border-green-400' },
  { key: 'failed', statuses: ['failed', 'cancelled'], label: 'Failed', color: 'border-red-400' },
];

const STATUS_OPTIONS = ['pending', 'in_progress', 'needs_approval', 'completed', 'failed'];

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === '1');
  const [clients, setClients] = useState<Array<Record<string, unknown>>>([]);
  const [agents, setAgents] = useState<Array<Record<string, unknown>>>([]);
  const [documents, setDocuments] = useState<Array<Record<string, unknown>>>([]);
  const [pipelines, setPipelines] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    client_id: '',
    agent_slug: searchParams.get('agent') || '',
    document_id: '',
    pipeline_id: '',
    depth_level: 'vf95',
    use_document_context: true,
    require_qa_review: true,
    priority: 'medium',
    task_type: 'general',
    requires_approval: false,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: tasks, loading, error, reload, workspace } = useWorkspaceData(
    (wsId) => api.tasks.list(wsId),
  );

  useEffect(() => {
    if (!workspace || !showCreate) return;
    api.clients.list(workspace.id).then(setClients).catch(() => setClients([]));
    api.agents.list(workspace.id).then(setAgents).catch(() => setAgents([]));
    api.documents.list(workspace.id).then(setDocuments).catch(() => setDocuments([]));
    api.agents.pipelines().then(setPipelines).catch(() => setPipelines([]));
  }, [workspace, showCreate]);

  const getTasksByColumn = (statuses: string[]) =>
    (tasks ?? []).filter((t) => statuses.includes(t.status as string));

  const handleCreate = async () => {
    if (!workspace || !form.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.tasks.create({
        workspace_id: workspace.id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        client_id: form.client_id || undefined,
        agent_slug: form.agent_slug || undefined,
        document_id: form.document_id || undefined,
        pipeline_id: form.pipeline_id || undefined,
        depth_level: form.depth_level,
        use_document_context: form.use_document_context,
        require_qa_review: form.require_qa_review,
        priority: form.priority,
        task_type: form.task_type,
        requires_approval: form.requires_approval,
      });
      setShowCreate(false);
      setSearchParams({});
      setForm({ title: '', description: '', client_id: '', agent_slug: '', document_id: '', pipeline_id: '', depth_level: 'vf95', use_document_context: true, require_qa_review: true, priority: 'medium', task_type: 'general', requires_approval: false });
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await api.tasks.updateStatus(taskId, status);
      await reload();
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const inputClass = 'w-full bg-vf-black-light border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-vf-gold/50 focus:outline-none';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Task Board</h1>
          <p className="text-vf-muted text-sm">Multi-agent task pipeline</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-vf-gold/10 border border-vf-gold/30 text-vf-gold px-4 py-2 rounded-lg text-sm hover:bg-vf-gold/20 transition-all"
        >
          <Plus size={16} /> Create Task
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-red-400 text-sm mb-2">Could not load tasks</p>
          <p className="text-vf-muted text-xs mb-4">{error}</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[60vh]">
          {COLUMNS.map((col) => (
            <div key={col.key} className={`border-t-2 ${col.color} pt-3`}>
              <h3 className="text-sm font-semibold text-vf-muted mb-3 px-1">
                {col.label}
                <span className="ml-2 text-xs bg-vf-black-light px-1.5 py-0.5 rounded">
                  {getTasksByColumn(col.statuses).length}
                </span>
              </h3>
              <div className="space-y-2">
                {getTasksByColumn(col.statuses).map((task) => (
                  <GlassPanel key={task.id as string} className="p-3 hover:border-vf-gold/30 transition-all">
                    <Link to={`/tasks/${task.id}`}>
                      <p className="text-sm font-medium truncate">{task.title as string}</p>
                      <p className="text-xs text-vf-muted mt-1 line-clamp-2">
                        {((task.description || task.command) as string)?.slice(0, 80)}
                      </p>
                    </Link>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <StatusBadge status={task.status as string} />
                      {task.qa_score != null && (
                        <span className="text-xs text-vf-gold">{task.qa_score as number}/100</span>
                      )}
                      <select
                        value={STATUS_OPTIONS.includes(task.status as string) ? (task.status as string) : 'pending'}
                        onChange={(e) => void handleStatusChange(task.id as string, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-vf-black-light border border-white/10 rounded px-1 py-0.5 text-vf-muted focus:outline-none"
                        title="Change status"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <GlassPanel className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Create Task</h2>
              <button onClick={() => { setShowCreate(false); setSearchParams({}); }} className="text-vf-muted hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-vf-muted block mb-1">Title *</label>
                <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. SEO audit for client site" />
              </div>
              <div>
                <label className="text-xs text-vf-muted block mb-1">Description</label>
                <textarea className={inputClass} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What should be done?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-vf-muted block mb-1">Client</label>
                  <select className={inputClass} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">— None —</option>
                    {clients.map((c) => (
                      <option key={c.id as string} value={c.id as string}>{c.name as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-vf-muted block mb-1">Agent</label>
                  <select className={inputClass} value={form.agent_slug} onChange={(e) => setForm({ ...form, agent_slug: e.target.value })}>
                    <option value="">— Any —</option>
                    {agents.map((a) => (
                      <option key={a.slug as string} value={a.slug as string}>{a.name as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-vf-muted block mb-1">Priority</label>
                  <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-vf-muted block mb-1">Task Type</label>
                  <select className={inputClass} value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })}>
                    <option value="general">General</option>
                    <option value="seo">SEO</option>
                    <option value="content">Content</option>
                    <option value="ads">Ads</option>
                    <option value="reporting">Reporting</option>
                    <option value="automation">Automation</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-vf-muted block mb-1">Sheet / Document Context</label>
                  <select className={inputClass} value={form.document_id} onChange={(e) => setForm({ ...form, document_id: e.target.value })}>
                    <option value="">— None —</option>
                    {documents.map((d) => (
                      <option key={d.id as string} value={d.id as string}>{d.file_name as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-vf-muted block mb-1">Pipeline</label>
                  <select className={inputClass} value={form.pipeline_id} onChange={(e) => setForm({ ...form, pipeline_id: e.target.value })}>
                    <option value="">— Single Agent —</option>
                    {pipelines.map((p) => (
                      <option key={p.id as string} value={p.id as string}>{p.name as string}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-vf-muted block mb-1">Output Depth</label>
                  <select className={inputClass} value={form.depth_level} onChange={(e) => setForm({ ...form, depth_level: e.target.value })}>
                    <option value="standard">Standard</option>
                    <option value="advanced">Advanced</option>
                    <option value="vf95">VF 95+</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-vf-muted cursor-pointer">
                <input type="checkbox" checked={form.use_document_context} onChange={(e) => setForm({ ...form, use_document_context: e.target.checked })} className="accent-yellow-500" />
                Use uploaded sheet context
              </label>
              <label className="flex items-center gap-2 text-sm text-vf-muted cursor-pointer">
                <input type="checkbox" checked={form.require_qa_review} onChange={(e) => setForm({ ...form, require_qa_review: e.target.checked })} className="accent-yellow-500" />
                Require QA review
              </label>
              <label className="flex items-center gap-2 text-sm text-vf-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requires_approval}
                  onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })}
                  className="accent-yellow-500"
                />
                Requires approval before execution
              </label>

              {formError && <p className="text-red-400 text-xs">{formError}</p>}

              <button
                onClick={() => void handleCreate()}
                disabled={saving}
                className="w-full bg-vf-gold text-vf-black font-semibold py-2 rounded-lg text-sm hover:bg-vf-gold/90 transition-all disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
