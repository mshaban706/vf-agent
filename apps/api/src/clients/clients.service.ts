import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { LiveLogsService } from '../live-logs/live-logs.service';

export interface CreateClientDto {
  workspace_id: string;
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  location?: string;
  service_area?: string;
  radius_miles?: number;
  status?: string;
  notes?: string;
}

@Injectable()
export class ClientsService {
  constructor(
    private supabase: SupabaseService,
    private liveLogs: LiveLogsService,
  ) {}

  async list(token: string, workspaceId: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('clients')
      .select('*, projects(count), tasks(count)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async create(token: string, userId: string, dto: CreateClientDto) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('clients')
      .insert({
        ...dto,
        website: dto.website ?? dto.domain ?? null,
        location: dto.location ?? dto.service_area ?? null,
        status: dto.status ?? 'active',
        owner_id: userId,
      })
      .select()
      .single();
    if (error) throw error;

    await this.liveLogs.add(dto.workspace_id, 'success', `Client created: ${dto.name}`, {
      website: dto.website ?? dto.domain,
    });
    return data;
  }

  async getById(token: string, id: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('clients')
      .select('*, projects(*), tasks(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  async update(token: string, id: string, updates: Partial<CreateClientDto>) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
