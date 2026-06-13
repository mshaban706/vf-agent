import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { LiveLogsService } from '../live-logs/live-logs.service';
import { SupabaseService } from '../supabase/supabase.service';

const POLAR_SHEET_TYPES: Record<string, string> = {
  Roadmap: 'roadmap',
  'Master Clusters': 'keyword_clusters',
  'Gulf County': 'regional_keywords',
  'Panama City Metro': 'regional_keywords',
  'Tallahassee Region': 'regional_keywords',
  'Dothan-Wiregrass': 'regional_keywords',
  'Albany-SW Georgia': 'regional_keywords',
  'AEO-GEO Question Bank': 'aeo_geo',
  'Landing Pages': 'landing_pages',
  'Service Pages': 'service_pages',
  'Blog Calendar': 'blog_calendar',
  'On-Page & Schema': 'on_page_schema',
  KPIs: 'kpis',
  'Next Steps & Risks': 'risks',
  'Source Notes': 'source_notes',
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private supabase: SupabaseService,
    private liveLogs: LiveLogsService,
  ) {}

  async list(token: string, workspaceId: string, clientId?: string) {
    const client = this.supabase.getClientWithToken(token);
    let q = client
      .from('client_documents')
      .select('*, document_chunks(count)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (clientId) q = q.eq('client_id', clientId);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  async getChunks(token: string, documentId: string) {
    const client = this.supabase.getClientWithToken(token);
    const { data, error } = await client
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('source_sheet');
    if (error) throw error;
    return data;
  }

  async ingestUpload(
    token: string,
    userId: string,
    workspaceId: string,
    file: Express.Multer.File,
    clientId?: string,
    title?: string,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Empty file upload.');

    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      throw new BadRequestException('Supported formats: XLSX, XLS, CSV');
    }

    await this.liveLogs.add(workspaceId, 'info', `File upload started: ${file.originalname}`, { size: file.size });

    const db = this.supabase.getClientWithToken(token);
    const admin = this.supabase.getAdminClient();

    // Preserve file record in public.files
    const { data: fileRow, error: fileErr } = await db
      .from('files')
      .insert({
        workspace_id: workspaceId,
        client_id: clientId ?? null,
        uploaded_by: userId,
        file_name: file.originalname,
        file_type: file.mimetype,
        storage_path: `uploads/${workspaceId}/${Date.now()}_${file.originalname}`,
        metadata: { size: file.size, ext },
      })
      .select()
      .single();
    if (fileErr) this.logger.warn(`files insert: ${fileErr.message}`);

    const sheets = this.parseWorkbook(file.buffer, ext!);
    const summary = this.buildSummary(file.originalname, sheets);

    const { data: doc, error: docErr } = await db
      .from('client_documents')
      .insert({
        workspace_id: workspaceId,
        client_id: clientId ?? null,
        file_id: fileRow?.id ?? null,
        file_name: file.originalname,
        file_type: ext,
        title: title || file.originalname.replace(/\.[^.]+$/, ''),
        summary,
        metadata: { sheet_count: sheets.length, sheet_names: sheets.map((s) => s.name) },
      })
      .select()
      .single();
    if (docErr) throw docErr;

    await this.liveLogs.add(workspaceId, 'success', `File parsed: ${file.originalname}`, { sheets: sheets.length }, undefined, 'document-context');

    const chunks = sheets.map((sheet) => ({
      workspace_id: workspaceId,
      client_id: clientId ?? null,
      document_id: doc.id,
      source_sheet: sheet.name,
      source_range: sheet.range,
      chunk_type: POLAR_SHEET_TYPES[sheet.name] ?? 'sheet_tab',
      content: sheet.textContent.slice(0, 50000),
      structured_data: { headers: sheet.headers, row_count: sheet.rowCount, preview_rows: sheet.previewRows.slice(0, 20) },
      metadata: { file_name: file.originalname },
    }));

    if (chunks.length) {
      const { error: chunkErr } = await admin.from('document_chunks').insert(chunks);
      if (chunkErr) throw chunkErr;
      await this.liveLogs.add(
        workspaceId,
        'success',
        `Context chunks created: ${chunks.length} tabs from ${file.originalname}`,
        { document_id: doc.id },
        undefined,
        'document-context',
      );
    }

    return { document: doc, chunks_created: chunks.length, sheets: sheets.map((s) => s.name) };
  }

  private parseWorkbook(buffer: Buffer, ext: string) {
    const wb =
      ext === 'csv'
        ? XLSX.read(buffer.toString('utf8'), { type: 'string' })
        : XLSX.read(buffer, { type: 'buffer' });

    return wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      const headers = json.length ? Object.keys(json[0]) : [];
      const previewRows = json.slice(0, 15);
      const textLines = [
        `Sheet: ${name}`,
        `Headers: ${headers.join(' | ')}`,
        ...json.slice(0, 100).map((row, i) => `${i + 1}. ${headers.map((h) => `${h}: ${row[h]}`).join(' | ')}`),
      ];
      const ref = ws['!ref'] ?? '';
      return {
        name,
        headers,
        rowCount: json.length,
        previewRows,
        range: ref,
        textContent: textLines.join('\n'),
      };
    });
  }

  private buildSummary(fileName: string, sheets: { name: string; rowCount: number }[]): string {
    return `Uploaded ${fileName}: ${sheets.length} sheet tabs (${sheets.map((s) => `${s.name}: ${s.rowCount} rows`).join('; ')}). Use as project intelligence for keyword, content, local SEO, AEO/GEO, and roadmap tasks. Source Notes tab should be treated as validation guidance — not live verified metrics.`;
  }
}
