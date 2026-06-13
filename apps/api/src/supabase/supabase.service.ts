import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client!: SupabaseClient;
  private adminClient!: SupabaseClient;
  private url!: string;
  private anonKey!: string;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.url = this.requireEnv('SUPABASE_URL');
    this.anonKey = this.requireEnv('SUPABASE_ANON_KEY');
    const serviceKey = this.requireEnv('SUPABASE_SERVICE_ROLE_KEY');

    try {
      this.client = createClient(this.url, this.anonKey);
      this.adminClient = createClient(this.url, serviceKey);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to create Supabase client. Check that SUPABASE_URL is a valid URL ` +
          `and the keys are correct. Original error: ${message}`,
      );
    }

    this.logger.log(`Supabase clients initialized for ${this.url}`);
  }

  private requireEnv(name: string): string {
    const value = this.config.get<string>(name);
    if (!value || value.trim() === '') {
      throw new Error(
        `Missing required environment variable: ${name}. ` +
          `Set it in the root .env file (see .env.example).`,
      );
    }
    return value.trim();
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  getClientWithToken(token: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
}
