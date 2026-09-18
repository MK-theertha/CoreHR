import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

import { useDocuments, type DocumentScope } from '../../hooks/useDocuments';
import { formatDate } from '../../lib/format';
import { useConfirm } from '../shared/confirm-dialog';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { Skeleton } from '../ui/skeleton';

// Same allowlist the backend enforces (documents_service.DOCUMENT_CONTENT_TYPES)
// — checked client-side so a bad file fails fast with a toast instead of a
// wasted upload-url round trip.
const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function DocumentsTab({
  employeeId,
  scope,
  canDelete,
}: {
  employeeId: string;
  scope: DocumentScope;
  canDelete: boolean;
}) {
  const { list, uploadDocument, deleteDocument } = useDocuments(scope, employeeId);
  const { confirm, dialog } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
      toast.error('Unsupported file type. Allowed: PDF, JPEG, PNG, DOC, DOCX.');
      return;
    }

    uploadDocument.mutate(file, {
      onSuccess: () => toast.success('Document uploaded'),
      onError: (error: Error) => toast.error(error.message),
    });
  };

  const handleDelete = async (documentId: string, fileName: string) => {
    const confirmed = await confirm({
      title: 'Delete document?',
      description: `"${fileName}" will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;

    deleteDocument.mutate(documentId, {
      onSuccess: () => toast.success('Document deleted'),
      onError: (error: Error) => toast.error(error.message),
    });
  };

  if (list.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  const documents = list.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Documents</p>
        <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploadDocument.isPending}>
          <Upload className="h-3.5 w-3.5" /> {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange}
        />
      </div>

      {documents.length === 0 ? (
        <EmptyState icon={FileText} title="No documents yet" description="Upload contracts, IDs, or certifications above." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{document.fileName}</p>
                  <p className="text-xs text-muted-foreground">Uploaded {formatDate(document.createdAt)}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {document.downloadUrl ? (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={document.downloadUrl} target="_blank" rel="noreferrer" aria-label="Download">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => handleDelete(document.id, document.fileName)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
