import { useRef, useState } from 'react';
import { FolderOpen, Upload, FileSpreadsheet } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspaceData } from '../hooks/useWorkspaceData';
import { GlassPanel, LoadingSpinner } from '../components/ui';

export function FilesPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: documents, loading, error, reload, workspace } = useWorkspaceData(
    (wsId) => api.documents.list(wsId),
  );

  const handleUpload = async (file: File) => {
    if (!workspace) return;
    setUploading(true);
    setUploadError(null);
    try {
      await api.documents.upload(workspace.id, file);
      await reload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">File Library</h1>
          <p className="text-vf-muted text-sm mt-1">Upload strategy sheets — agents use them as project intelligence</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !workspace}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Sheet'}
          </button>
        </div>
      </div>

      {uploadError && <p className="text-red-400 text-sm mb-4">{uploadError}</p>}

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : error ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-red-400 text-sm mb-2">Could not load files</p>
          <button onClick={() => void reload()} className="text-vf-gold text-sm hover:underline">Retry</button>
        </GlassPanel>
      ) : (documents ?? []).length === 0 ? (
        <GlassPanel className="p-12 text-center">
          <FolderOpen className="w-12 h-12 text-vf-muted mx-auto mb-4" />
          <p className="text-vf-muted">No files yet. Upload an XLSX strategy sheet (e.g. Polar Insulation SEO Strategy).</p>
          <p className="text-xs text-vf-muted mt-2">Supported: XLSX, XLS, CSV — parsed into context chunks for all agents</p>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(documents ?? []).map((doc) => (
            <GlassPanel key={doc.id as string} className="p-5">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-8 h-8 text-vf-gold shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{doc.title as string || doc.file_name as string}</h3>
                  <p className="text-xs text-vf-muted mt-1">{doc.file_name as string}</p>
                  {(doc.summary as string) && (
                    <p className="text-xs text-vf-muted mt-2 line-clamp-3">{doc.summary as string}</p>
                  )}
                  <p className="text-[10px] text-vf-gold mt-2">
                    {((doc.metadata as Record<string, unknown>)?.sheet_count as number) ?? '?'} sheets parsed
                  </p>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
