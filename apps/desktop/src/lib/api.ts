const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('vf_token', token);
    else localStorage.removeItem('vf_token');
  }

  getToken() {
    if (!this.token) this.token = localStorage.getItem('vf_token');
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  auth = {
    signIn: (email: string, password: string) =>
      this.request<{ session: { access_token: string }; user: { id: string; email: string } }>(
        '/auth/signin',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      ),
    signUp: (email: string, password: string, full_name: string) =>
      this.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name }),
      }),
    me: () => this.request<{ id: string; email: string; full_name: string; role: string }>('/auth/me'),
  };

  workspaces = {
    list: () => this.request<Array<Record<string, unknown>>>('/workspaces'),
    ensureDefault: () =>
      this.request<Array<Record<string, unknown>>>('/workspaces/ensure-default', { method: 'POST' }),
    create: (name: string, slug: string) =>
      this.request('/workspaces', { method: 'POST', body: JSON.stringify({ name, slug }) }),
    get: (id: string) => this.request(`/workspaces/${id}`),
    stats: (id: string) => this.request<{
      client_count: number;
      task_count: number;
      active_tasks: number;
      completed_tasks: number;
      agent_count: number;
    }>(`/workspaces/${id}/stats`),
  };

  clients = {
    list: (workspaceId: string) =>
      this.request<Array<Record<string, unknown>>>(`/clients?workspace_id=${workspaceId}`),
    create: (data: Record<string, unknown>) =>
      this.request('/clients', { method: 'POST', body: JSON.stringify(data) }),
    get: (id: string) => this.request(`/clients/${id}`),
  };

  agents = {
    list: (workspaceId?: string) =>
      this.request<Array<Record<string, unknown>>>(
        workspaceId ? `/agents?workspace_id=${workspaceId}` : '/agents',
      ),
    get: (slug: string) => this.request(`/agents/${slug}`),
    execute: (slug: string, data: Record<string, unknown>) =>
      this.request<Record<string, unknown>>(`/agents/${slug}/execute`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    runs: (slug: string, workspaceId: string) =>
      this.request<Array<Record<string, unknown>>>(`/agents/${slug}/runs?workspace_id=${workspaceId}`),
    tasks: (slug: string, workspaceId: string) =>
      this.request<Array<Record<string, unknown>>>(`/agents/${slug}/tasks?workspace_id=${workspaceId}`),
    pipelines: () => this.request<Array<Record<string, unknown>>>('/agents/pipelines/list'),
    sync: (workspaceId: string) =>
      this.request<{
        success: boolean;
        workspaceId: string;
        expected: number;
        beforeCount: number;
        afterCount: number;
        inserted: number;
        updated: number;
        missingSlugs: string[];
      }>(`/agents/sync?workspace_id=${workspaceId}`, { method: 'POST' }),
  };

  files = {
    downloadUrl: (fileId: string) => `${API_URL}/api/v1/files/${fileId}/download`,
    download: async (fileId: string, fileName: string) => {
      const token = this.getToken();
      const res = await fetch(`${API_URL}/api/v1/files/${fileId}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    },
  };

  documents = {
    list: (workspaceId: string, clientId?: string) => {
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (clientId) params.set('client_id', clientId);
      return this.request<Array<Record<string, unknown>>>(`/documents?${params}`);
    },
    upload: async (workspaceId: string, file: File, clientId?: string, title?: string) => {
      const form = new FormData();
      form.append('file', file);
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (clientId) params.set('client_id', clientId);
      if (title) params.set('title', title);
      const token = this.getToken();
      const res = await fetch(`${API_URL}/api/v1/documents/upload?${params}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    chunks: (documentId: string) =>
      this.request<Array<Record<string, unknown>>>(`/documents/${documentId}/chunks`),
  };

  tasks = {
    list: (workspaceId: string, status?: string) => {
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (status) params.set('status', status);
      return this.request<Array<Record<string, unknown>>>(`/tasks?${params}`);
    },
    get: (id: string) => this.request<Record<string, unknown>>(`/tasks/${id}`),
    logs: (id: string) => this.request<Array<Record<string, unknown>>>(`/tasks/${id}/logs`),
    create: (data: Record<string, unknown>) =>
      this.request<Record<string, unknown>>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      this.request<Record<string, unknown>>(`/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  };

  logs = {
    list: (workspaceId: string, level?: string) => {
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (level && level !== 'all') params.set('level', level);
      return this.request<Array<Record<string, unknown>>>(`/logs?${params}`);
    },
    add: (data: { workspace_id: string; level: string; message: string; metadata?: Record<string, unknown> }) =>
      this.request('/logs', { method: 'POST', body: JSON.stringify(data) }),
  };

  integrations = {
    list: (workspaceId: string) =>
      this.request<Array<Record<string, unknown>>>(`/integrations?workspace_id=${workspaceId}`),
    save: (provider: string, workspaceId: string, config: Record<string, unknown>) =>
      this.request(`/integrations/${provider}`, {
        method: 'PUT',
        body: JSON.stringify({ workspace_id: workspaceId, config }),
      }),
  };

  reports = {
    summary: (workspaceId: string) =>
      this.request<{
        total_clients: number;
        total_tasks: number;
        completed_tasks: number;
        pending_approvals: number;
        total_logs: number;
        active_agents: number;
        uploaded_documents?: number;
        agent_runs?: number;
        average_quality_score?: number | null;
      }>(`/reports/summary?workspace_id=${workspaceId}`),
  };

  commands = {
    execute: (data: {
      command: string;
      workspace_id: string;
      client_id?: string;
      document_id?: string;
      pipeline_id?: string;
    }) =>
      this.request<{ task_id: string; status: string; message: string }>('/commands/execute', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  settings = {
    getApp: (workspaceId: string) =>
      this.request<Record<string, unknown>>(`/settings/app?workspace_id=${workspaceId}`),
    saveApp: (data: Record<string, unknown>) =>
      this.request<Record<string, unknown>>('/settings/app', { method: 'PUT', body: JSON.stringify(data) }),
    listApiKeys: (workspaceId: string) =>
      this.request<Array<Record<string, unknown>>>(`/settings/api-keys?workspace_id=${workspaceId}`),
    saveApiKey: (data: { workspace_id: string; provider: string; label: string; key: string }) =>
      this.request('/settings/api-keys', { method: 'POST', body: JSON.stringify(data) }),
    deleteApiKey: (id: string) =>
      this.request(`/settings/api-keys/${id}`, { method: 'DELETE' }),
    testApiKey: (id: string) =>
      this.request<{ ok: boolean; message: string }>(`/settings/api-keys/${id}/test`, { method: 'POST' }),
  };

  approvals = {
    list: (workspaceId: string, status?: string) => {
      const params = new URLSearchParams({ workspace_id: workspaceId });
      if (status) params.set('status', status);
      return this.request<Array<Record<string, unknown>>>(`/approvals?${params}`);
    },
    review: (id: string, approved: boolean) =>
      this.request(`/approvals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      }),
  };
}

export const api = new ApiClient();
