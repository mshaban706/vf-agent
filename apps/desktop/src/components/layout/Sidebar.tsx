import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Bot,
  Kanban,
  Terminal,
  Wrench,
  FolderOpen,
  Mic,
  FileBarChart,
  Settings,
  Key,
  ShieldCheck,
  ChevronLeft,
  LogOut,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore, useAppStore } from '../../stores/app';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Command Center' },
  { to: '/workspaces', icon: Users, label: 'Workspaces' },
  { to: '/agents', icon: Bot, label: 'Agent Directory' },
  { to: '/tasks', icon: Kanban, label: 'Task Board' },
  { to: '/logs', icon: Terminal, label: 'Live Logs' },
  { to: '/tools', icon: Wrench, label: 'Tools & Integrations' },
  { to: '/files', icon: FolderOpen, label: 'File Library' },
  { to: '/voice', icon: Mic, label: 'Voice Command' },
  { to: '/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/approvals', icon: ShieldCheck, label: 'Approval Center' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/api-keys', icon: Key, label: 'API Keys' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      className="h-screen bg-vf-black-light border-r border-vf-border flex flex-col shrink-0"
    >
      <div className="p-4 flex items-center gap-3 border-b border-vf-border">
        <div className="w-8 h-8 rounded-lg bg-vf-gold/10 border border-vf-gold/30 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-vf-gold" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="font-display text-sm font-bold text-vf-gold leading-tight">VF Agent</h1>
            <p className="text-[10px] text-vf-muted">Command Center</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-vf-gold/10 text-vf-gold border border-vf-gold/20'
                  : 'text-vf-muted hover:text-white hover:bg-white/5',
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="text-sm truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-vf-border">
        {!sidebarCollapsed && user && (
          <div className="px-2 mb-2">
            <p className="text-xs text-white truncate">{user.full_name || user.email}</p>
            <p className="text-[10px] text-vf-muted capitalize">{user.role}</p>
          </div>
        )}
        <button onClick={toggleSidebar} className="btn-ghost w-full flex items-center gap-2 justify-center">
          <ChevronLeft className={clsx('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
          {!sidebarCollapsed && <span className="text-xs">Collapse</span>}
        </button>
        <button onClick={handleSignOut} className="btn-ghost w-full flex items-center gap-2 justify-center mt-1 text-red-400 hover:text-red-300">
          <LogOut className="w-4 h-4" />
          {!sidebarCollapsed && <span className="text-xs">Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
