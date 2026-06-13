import clsx from 'clsx';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
  onClick?: () => void;
}

export function GlassPanel({ children, className, gold, onClick }: GlassPanelProps) {
  return (
    <div
      className={clsx(gold ? 'glass-panel-gold' : 'glass-panel', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'bg-vf-muted',
  pending: 'bg-vf-muted',
  planning: 'bg-blue-400',
  in_progress: 'bg-vf-gold animate-pulse-gold',
  qa_review: 'bg-purple-400',
  completed: 'bg-green-400',
  failed: 'bg-red-400',
  cancelled: 'bg-vf-muted',
  thinking: 'bg-vf-gold animate-pulse',
  working: 'bg-vf-gold animate-pulse-gold',
  reviewing: 'bg-purple-400',
  error: 'bg-red-400',
  waiting_approval: 'bg-orange-400',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium capitalize',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        'bg-vf-black-light border border-vf-border',
      )}
    >
      <span className={clsx('status-dot', STATUS_COLORS[status] || 'bg-vf-muted')} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

interface AgentAvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  status?: string;
}

export function AgentAvatar({ name, color, size = 'md', status }: AgentAvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };

  return (
    <div className="relative">
      <div
        className={clsx('rounded-lg flex items-center justify-center font-bold', sizes[size])}
        style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
      >
        {initials}
      </div>
      {status && (
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-vf-black',
            STATUS_COLORS[status] || 'bg-vf-muted',
          )}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
}

export function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <GlassPanel className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-vf-muted text-sm">{label}</p>
          <p className="text-2xl font-display font-bold text-vf-gold mt-1">{value}</p>
          {trend && <p className="text-xs text-green-400 mt-1">{trend}</p>}
        </div>
        {icon && <div className="text-vf-gold/60">{icon}</div>}
      </div>
    </GlassPanel>
  );
}

interface TerminalLogProps {
  logs: Array<{ id?: string; level: string; agent_slug: string; message: string; created_at?: string }>;
}

const LOG_COLORS: Record<string, string> = {
  debug: 'text-vf-muted',
  info: 'text-blue-300',
  warn: 'text-yellow-300',
  error: 'text-red-400',
  success: 'text-green-400',
};

export function TerminalLog({ logs }: TerminalLogProps) {
  return (
    <div className="terminal-log bg-vf-black rounded-lg p-4 h-full overflow-y-auto font-mono">
      {logs.length === 0 && (
        <p className="text-vf-muted">Waiting for agent activity...</p>
      )}
      {logs.map((log, i) => (
        <div key={log.id || i} className="flex gap-2 py-0.5">
          <span className="text-vf-muted shrink-0">
            {log.created_at
              ? new Date(log.created_at).toLocaleTimeString()
              : new Date().toLocaleTimeString()}
          </span>
          <span className="text-vf-gold shrink-0">[{log.agent_slug}]</span>
          <span className={LOG_COLORS[log.level] || 'text-white'}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div
      className={clsx(
        'border-2 border-vf-gold/20 border-t-vf-gold rounded-full animate-spin',
        sizes[size],
      )}
    />
  );
}
