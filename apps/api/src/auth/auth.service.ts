import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private supabase: SupabaseService) {}

  async signUp(email: string, password: string, fullName: string) {
    try {
      const { data, error } = await this.supabase.getClient().auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) {
        this.logger.error(
          `Supabase signUp failed for ${email}: [${error.status ?? 'n/a'}] ${error.message}`,
        );
        throw this.mapSupabaseAuthError(error.message, error.status);
      }

      // Supabase quirk: with email confirmation enabled, signing up an existing
      // email returns a fake user with no identities instead of an error.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new ConflictException(
          'An account with this email already exists. Please sign in instead.',
        );
      }

      return {
        ...data,
        message: data.session
          ? 'Account created successfully.'
          : 'Account created. Please check your email to confirm your address before signing in.',
      };
    } catch (err) {
      throw this.toHttpException(err, 'signUp');
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.getClient().auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.error(
          `Supabase signIn failed for ${email}: [${error.status ?? 'n/a'}] ${error.message}`,
        );
        throw this.mapSupabaseAuthError(error.message, error.status);
      }

      return data;
    } catch (err) {
      throw this.toHttpException(err, 'signIn');
    }
  }

  async getProfile(userId: string) {
    try {
      const admin = this.supabase.getAdminClient();
      const { data, error } = await admin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        this.logger.error(
          `Profile fetch failed for user ${userId}: [${error.code ?? 'n/a'}] ${error.message}`,
        );
        throw this.mapSupabaseDbError(error.message, error.code);
      }

      if (data) return data;

      // Self-heal: profile row missing (e.g. user created before the
      // handle_new_user trigger existed). Create it from auth user data.
      return await this.createMissingProfile(userId);
    } catch (err) {
      throw this.toHttpException(err, 'getProfile');
    }
  }

  /** Creates a profile row for an authenticated user that has none. */
  private async createMissingProfile(userId: string) {
    const admin = this.supabase.getAdminClient();

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !userData.user) {
      this.logger.error(
        `Cannot load auth user ${userId} to create profile: ${userError?.message ?? 'user not found'}`,
      );
      throw new UnauthorizedException('Authenticated user not found in Supabase Auth.');
    }

    const user = userData.user;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const fullName =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      user.email?.split('@')[0] ||
      'User';

    this.logger.warn(`Profile missing for ${user.email} (${userId}) — creating it now.`);

    const { data: created, error: insertError } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: user.email,
          full_name: fullName,
          role: 'admin', // development default; tighten for production
        },
        { onConflict: 'id' },
      )
      .select()
      .single();

    if (insertError) {
      this.logger.error(
        `Profile auto-create failed for ${userId}: [${insertError.code ?? 'n/a'}] ${insertError.message}`,
      );
      throw this.mapSupabaseDbError(insertError.message, insertError.code);
    }

    return created;
  }

  /** Maps Supabase Auth (GoTrue) errors to meaningful HTTP exceptions. */
  private mapSupabaseAuthError(message: string, status?: number): Error {
    const msg = message.toLowerCase();

    if (msg.includes('already registered') || msg.includes('already exists')) {
      return new ConflictException(
        'An account with this email already exists. Please sign in instead.',
      );
    }
    if (msg.includes('invalid login credentials')) {
      return new UnauthorizedException('Invalid email or password.');
    }
    if (msg.includes('email not confirmed')) {
      return new UnauthorizedException(
        'Email not confirmed. Check your inbox for the confirmation link, or disable email confirmation in Supabase Auth settings for development.',
      );
    }
    if (msg.includes('password should be')) {
      return new BadRequestException(message);
    }
    if (msg.includes('invalid api key') || msg.includes('jwt') || status === 401) {
      return new InternalServerErrorException(
        'Supabase API key is invalid. Verify SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in the root .env match your Supabase project (Settings → API).',
      );
    }
    if (msg.includes('database error saving new user')) {
      return new InternalServerErrorException(
        'Supabase could not create the profile row for the new user. The "profiles" table or the "handle_new_user" trigger is missing — run supabase/migrations/001_initial_schema.sql in the Supabase SQL Editor.',
      );
    }
    if (msg.includes('rate limit')) {
      return new HttpException(
        'Supabase email rate limit exceeded (its built-in mailer allows only a few confirmation emails per hour). For development, disable "Confirm email" in Supabase Dashboard → Authentication → Providers → Email, then try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (msg.includes('signups not allowed')) {
      return new BadRequestException(
        'Signups are disabled for this Supabase project. Enable them under Authentication → Providers → Email.',
      );
    }
    if (msg.includes('fetch failed') || msg.includes('enotfound') || msg.includes('econnrefused')) {
      return new ServiceUnavailableException(
        'Cannot reach Supabase. Verify SUPABASE_URL in .env is correct and your network connection is working.',
      );
    }

    return new BadRequestException(`Authentication failed: ${message}`);
  }

  /** Maps Supabase PostgREST/database errors to meaningful HTTP exceptions. */
  private mapSupabaseDbError(message: string, code?: string): Error {
    const lower = message.toLowerCase();
    if (
      code === '42P01' ||
      code === 'PGRST205' ||
      lower.includes('does not exist') ||
      lower.includes('schema cache')
    ) {
      return new InternalServerErrorException(
        `Database table missing: ${message}. Run supabase/migrations/002_profiles_fix.sql (or the full 001_initial_schema.sql) in the Supabase SQL Editor, then it will reload the schema cache automatically.`,
      );
    }
    if (code === 'PGRST116') {
      return new UnauthorizedException(
        'Profile not found for this user. If you created this account before running the migration, delete the user in Supabase Auth and sign up again.',
      );
    }
    if (code === '23505') {
      return new ConflictException('This record already exists.');
    }
    return new InternalServerErrorException(`Database error: ${message}`);
  }

  /** Ensures only HttpExceptions leave the service; logs anything unknown. */
  private toHttpException(err: unknown, operation: string): Error {
    if (err instanceof Error && 'getStatus' in err && typeof (err as { getStatus: unknown }).getStatus === 'function') {
      return err; // already an HttpException
    }

    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Unexpected error in ${operation}: ${message}`, err instanceof Error ? err.stack : undefined);

    const msg = message.toLowerCase();
    if (msg.includes('fetch failed') || msg.includes('enotfound') || msg.includes('econnrefused')) {
      return new ServiceUnavailableException(
        'Cannot reach Supabase. Verify SUPABASE_URL in .env and your network connection.',
      );
    }
    if (msg.includes('invalid api key')) {
      return new InternalServerErrorException(
        'Supabase API key is invalid. Verify the keys in the root .env (Supabase Dashboard → Settings → API).',
      );
    }

    return new InternalServerErrorException(`${operation} failed: ${message}`);
  }
}
