import { Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FilesService {
  private readonly uploadRoot = resolve(process.cwd(), '..', '..', 'uploads');

  constructor(private supabase: SupabaseService) {}

  async getDownloadStream(token: string, fileId: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client.from('files').select('*').eq('id', fileId).single();
    if (error || !data) throw new NotFoundException('File not found');

    const storagePath = data.storage_path as string;
    const fileName = storagePath.split('/').pop() ?? (data.file_name as string);
    const fullPath = join(this.uploadRoot, data.workspace_id as string, fileName);

    if (!existsSync(fullPath)) {
      throw new NotFoundException('File not found on disk');
    }

    return {
      stream: createReadStream(fullPath),
      fileName: data.file_name as string,
      mimeType: (data.file_type as string) || 'application/octet-stream',
    };
  }
}
