import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authFetch } from '../lib/api';
import { uploadToPresignedUrl } from '../lib/uploadToPresignedUrl';
import type { ApiResponse, Document } from '../types';

export type DocumentScope = 'me' | 'staff';

function documentsBase(scope: DocumentScope, employeeId: string | undefined) {
  return scope === 'me' ? '/employees/me/documents' : `/employees/${employeeId}/documents`;
}

export function useDocuments(scope: DocumentScope, employeeId?: string) {
  const base = documentsBase(scope, employeeId);
  const queryClient = useQueryClient();
  const queryKey = scope === 'me' ? ['documents', 'me'] : ['documents', 'staff', employeeId];

  const list = useQuery({
    queryKey,
    queryFn: () => authFetch<ApiResponse<Document[]>>(base).then((res) => res.data),
    enabled: scope === 'me' || !!employeeId,
  });

  const uploadDocument = useMutation({
    mutationFn: async (file: File) => {
      const uploadInfo = await authFetch<ApiResponse<{ documentId: string; uploadUrl: string }>>(
        `${base}/upload-url`,
        { method: 'POST', body: JSON.stringify({ fileName: file.name, contentType: file.type }) },
      );
      await uploadToPresignedUrl(uploadInfo.data.uploadUrl, file);
      return authFetch<ApiResponse<Document>>(`${base}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ documentId: uploadInfo.data.documentId, fileName: file.name, contentType: file.type }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteDocument = useMutation({
    mutationFn: (documentId: string) => authFetch<ApiResponse<null>>(`${base}/${documentId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { list, uploadDocument, deleteDocument };
}
