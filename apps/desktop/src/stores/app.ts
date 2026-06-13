import { create } from 'zustand';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => void;
  loadUser: () => Promise<void>;
}

interface AppState {
  currentWorkspace: Workspace | null;
  /** true once workspace bootstrap (ensure-default) has finished, success or not */
  workspaceReady: boolean;
  workspaceError: string | null;
  setWorkspace: (ws: Workspace | null) => void;
  setWorkspaceReady: (ready: boolean, error?: string | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  signIn: async (email, password) => {
    const data = await api.auth.signIn(email, password);
    api.setToken(data.session.access_token);
    const profile = await api.auth.me();
    set({ user: profile as User, isAuthenticated: true });
  },

  signUp: async (email, password, fullName) => {
    await api.auth.signUp(email, password, fullName);
    const data = await api.auth.signIn(email, password);
    api.setToken(data.session.access_token);
    const profile = await api.auth.me();
    set({ user: profile as User, isAuthenticated: true });
  },

  signOut: () => {
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      if (!api.getToken()) {
        set({ isLoading: false });
        return;
      }
      const profile = await api.auth.me();
      set({ user: profile as User, isAuthenticated: true, isLoading: false });
    } catch {
      api.setToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

export const useAppStore = create<AppState>((set) => ({
  currentWorkspace: null,
  workspaceReady: false,
  workspaceError: null,
  setWorkspace: (ws) => set({ currentWorkspace: ws }),
  setWorkspaceReady: (ready, error = null) => set({ workspaceReady: ready, workspaceError: error }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
