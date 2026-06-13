import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Download } from 'lucide-react';
import { api } from '../lib/api';
import { subscribeToTask } from '../lib/socket';
import { GlassPanel, StatusBadge, TerminalLog, AgentAvatar, LoadingSpinner } from '../components/ui';

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const loadTask = useCallback(async () => {
    if (!id) return;
    const data = await api.tasks.get(id);
    setTask(data);
    setLogs((data.agent_logs as Array<Record<string, unknown>>) || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (!id) return;

    const unsub = subscribeToTask(id, {
      onLog: (log) => setLogs((prev) => [...prev, log]),
      onTaskUpdate: () => loadTask(),
      onStepUpdate: () => loadTask(),
      onOutputReady: () => loadTask(),
    });

    return unsub;
  }, [id, loadTask]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <GlassPanel className="p-8 text-center">
          <p className="text-vf-muted">Task not found</p>
          <Link to="/tasks" className="btn-primary mt-4 inline-block">Back to Tasks</Link>
        </GlassPanel>
      </div>
    );
  }

  const steps = (task.task_steps as Array<Record<string, unknown>>) || [];
  const outputs = (task.outputs as Array<Record<string, unknown>>) || [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/tasks" className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">{task.title as string}</h1>
          <p className="text-vf-muted text-sm mt-0.5">{task.command as string}</p>
        </div>
        <StatusBadge status={task.status as string} size="md" />
        {task.qa_score != null && (
          <div className="text-center px-4 py-2 rounded-lg bg-vf-gold/10 border border-vf-gold/30">
            <p className="text-2xl font-display font-bold text-vf-gold">{task.qa_score as number}</p>
            <p className="text-[10px] text-vf-muted">QA Score</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {steps.length > 0 && (
            <GlassPanel className="p-5">
              <h2 className="font-display text-sm font-semibold text-vf-gold mb-4">Task Pipeline</h2>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={step.id as string} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                        step.status === 'completed' ? 'bg-green-400/20 border-green-400 text-green-400' :
                        step.status === 'in_progress' ? 'bg-vf-gold/20 border-vf-gold text-vf-gold animate-pulse' :
                        'bg-vf-black-light border-vf-border text-vf-muted'
                      }`}>
                        {i + 1}
                      </div>
                      {i < steps.length - 1 && <div className="w-px h-6 bg-vf-border" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{step.title as string}</span>
                        <StatusBadge status={step.status as string} />
                      </div>
                      <p className="text-xs text-vf-muted mt-0.5">{step.agent_slug as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          )}

          {Boolean(task.final_output) && (
            <GlassPanel gold className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-sm font-semibold text-vf-gold">Final Output</h2>
                <div className="flex gap-2">
                  {Boolean((task.json_output as Record<string, unknown> | undefined)?.file_id) && (
                    <button
                      className="btn-primary flex items-center gap-1 text-xs"
                      onClick={() => {
                        const meta = task.json_output as Record<string, unknown>;
                        void api.files.download(meta.file_id as string, (meta.file_name as string) || 'VF_SEO_Master.xlsx');
                      }}
                    >
                      <Download className="w-3 h-3" /> Download Excel Workbook
                    </button>
                  )}
                  <button
                    className="btn-ghost flex items-center gap-1 text-xs"
                    onClick={() => {
                      const blob = new Blob([task.final_output as string], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `vf-output-${id}.md`;
                      a.click();
                    }}
                  >
                    <Download className="w-3 h-3" /> Summary (.md)
                  </button>
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{task.final_output as string}</ReactMarkdown>
              </div>
            </GlassPanel>
          )}

          {outputs.length > 0 && !task.final_output && (
            <GlassPanel className="p-5">
              <h2 className="font-display text-sm font-semibold text-vf-gold mb-4">Agent Outputs</h2>
              {outputs.map((output) => (
                <div key={output.id as string} className="mb-4 pb-4 border-b border-vf-border last:border-0">
                  <p className="text-sm font-medium text-vf-gold">{output.title as string}</p>
                  <p className="text-xs text-vf-muted mb-2">{output.agent_slug as string}</p>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{(output.content as string)?.slice(0, 2000)}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </GlassPanel>
          )}
        </div>

        <div className="space-y-4">
          <GlassPanel className="p-4">
            <h2 className="font-display text-sm font-semibold text-vf-gold mb-3">Live Agent Logs</h2>
            <div className="h-[400px]">
              <TerminalLog logs={logs as Array<{ id?: string; level: string; agent_slug: string; message: string; created_at?: string }>} />
            </div>
          </GlassPanel>

          {(task.assigned_agents as string[])?.length > 0 && (
            <GlassPanel className="p-4">
              <h2 className="font-display text-sm font-semibold text-vf-gold mb-3">Assigned Agents</h2>
              <div className="flex flex-wrap gap-2">
                {(task.assigned_agents as string[]).map((slug) => (
                  <AgentAvatar key={slug} name={slug.replace(/-/g, ' ')} color="#D4AF37" size="sm" />
                ))}
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}
