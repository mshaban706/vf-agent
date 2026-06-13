import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { WorkspacesPage } from './pages/WorkspacesPage';
import { CreateClientPage } from './pages/CreateClientPage';
import { AgentsPage } from './pages/AgentsPage';
import { AgentTownPage } from './pages/AgentTownPage';
import { TasksPage } from './pages/TasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { LiveLogsPage } from './pages/LiveLogsPage';
import { ToolsPage } from './pages/ToolsPage';
import { FilesPage } from './pages/FilesPage';
import { VoicePage } from './pages/VoicePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { ApprovalsPage } from './pages/ApprovalsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<CommandCenterPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
        <Route path="/clients/new" element={<CreateClientPage />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agent-town" element={<AgentTownPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="/logs" element={<LiveLogsPage />} />
        <Route path="/tools" element={<ToolsPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/voice" element={<VoicePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
