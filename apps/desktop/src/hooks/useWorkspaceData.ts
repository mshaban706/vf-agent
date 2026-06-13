import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../stores/app';

/**
 * Standard page data loader: waits for workspace bootstrap, never leaves a
 * spinner hanging, and surfaces readable errors.
 */
export function useWorkspaceData<T>(
  fetcher: (workspaceId: string) => Promise<T>,
  deps: unknown[] = [],
) {
  const { currentWorkspace, workspaceReady, workspaceError } = useAppStore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!workspaceReady) return;
    if (!currentWorkspace) {
      setLoading(false);
      setError(workspaceError || 'No active workspace found.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher(currentWorkspace.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Page load error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceReady, currentWorkspace?.id, workspaceError, ...deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, loading, error, reload, workspace: currentWorkspace, workspaceReady };
}
