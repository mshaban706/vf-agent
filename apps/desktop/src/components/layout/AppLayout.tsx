import { Outlet, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useAuthStore, useAppStore } from '../../stores/app';
import { api } from '../../lib/api';
import { LoadingSpinner } from '../ui';

export function AppLayout() {
  const { isAuthenticated, isLoading, loadUser } = useAuthStore();
  const { setWorkspace, setWorkspaceReady } = useAppStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // ensure-default guarantees the user always has a workspace (creates one if missing)
    api.workspaces
      .ensureDefault()
      .then((workspaces) => {
        if (workspaces.length > 0) {
          setWorkspace(workspaces[0] as { id: string; name: string; slug: string });
        }
        setWorkspaceReady(true);
      })
      .catch((err: Error) => {
        console.error('Workspace bootstrap failed:', err);
        setWorkspaceReady(true, err.message || 'Could not load workspace');
      });
  }, [isAuthenticated, setWorkspace, setWorkspaceReady]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-vf-black">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-vf-black bg-grid-pattern bg-grid">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
