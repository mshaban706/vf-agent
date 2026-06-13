export type AgentStatus = 'idle' | 'thinking' | 'working' | 'reviewing' | 'completed' | 'error' | 'waiting_approval';
export type TaskStatus = 'pending' | 'planning' | 'in_progress' | 'qa_review' | 'completed' | 'failed' | 'cancelled';
export type TaskStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';
export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'google' | 'local';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'operator' | 'viewer';
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  workspace_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  service_area: string | null;
  radius_miles: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  role: string;
  description: string;
  avatar_color: string;
  capabilities: string[];
  permission_scopes: string[];
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  client_id: string | null;
  project_id: string | null;
  title: string;
  command: string;
  status: TaskStatus;
  plan: TaskPlan | null;
  assigned_agents: string[];
  final_output: string | null;
  qa_score: number | null;
  created_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskPlan {
  summary: string;
  steps: TaskPlanStep[];
  estimated_duration_minutes: number;
}

export interface TaskPlanStep {
  order: number;
  agent_slug: string;
  title: string;
  description: string;
  depends_on: number[];
}

export interface TaskStep {
  id: string;
  task_id: string;
  agent_slug: string;
  title: string;
  description: string | null;
  status: TaskStepStatus;
  order_index: number;
  input: Record<string, unknown> | null;
  output: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AgentLog {
  id: string;
  task_id: string;
  task_step_id: string | null;
  agent_slug: string;
  level: LogLevel;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Message {
  id: string;
  task_id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  agent_slug: string | null;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Output {
  id: string;
  task_id: string;
  agent_slug: string;
  title: string;
  content: string;
  format: 'markdown' | 'json' | 'html' | 'csv' | 'pdf';
  file_id: string | null;
  created_at: string;
}

export interface Approval {
  id: string;
  task_id: string;
  action_type: string;
  description: string;
  risk_level: RiskLevel;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Tool {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  requires_approval: boolean;
  is_active: boolean;
  config_schema: Record<string, unknown>;
  created_at: string;
}

export interface ToolCredential {
  id: string;
  workspace_id: string;
  tool_id: string;
  label: string;
  encrypted_credentials: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface Memory {
  id: string;
  workspace_id: string;
  client_id: string | null;
  agent_slug: string | null;
  content: string;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface ApiKeySetting {
  id: string;
  workspace_id: string;
  provider: AIProvider;
  label: string;
  is_active: boolean;
  created_at: string;
}

export interface CommandRequest {
  command: string;
  workspace_id: string;
  client_id?: string;
  project_id?: string;
}

export interface CommandResponse {
  task_id: string;
  status: TaskStatus;
  message: string;
}

export interface WSEvent {
  type: 'task_update' | 'agent_log' | 'step_update' | 'approval_request' | 'output_ready';
  payload: unknown;
}

export interface AgentRuntimeState {
  slug: string;
  status: AgentStatus;
  current_task_id: string | null;
  current_step_id: string | null;
  last_activity: string;
}
