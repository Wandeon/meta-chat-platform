import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, FileText } from 'lucide-react';
import { useApi } from '../api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentTable } from '@/components/documents/DocumentTable';
import { DocumentCard } from '@/components/documents/DocumentCard';
import type { Document, CreateDocumentRequest } from '../api/types';

export function DocumentsPage() {
  const { t } = useTranslation();
  const api = useApi();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const documentsQuery = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<Document[]>('/api/documents'),
  });

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<any[]>('/api/tenants'),
  });

  const getTenantName = (tenantId: string) => {
    const tenant = tenantsQuery.data?.find((t: any) => t.id === tenantId);
    return tenant?.name || tenantId.slice(0, 8) + '...';
  };

  const createDocument = useMutation({
    mutationFn: (data: CreateDocumentRequest) =>
      api.post<Document, CreateDocumentRequest>('/api/documents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUpload(false);
      setIsUploading(false);
    },
    onError: () => {
      setIsUploading(false);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleFileSelect = async (file: File, tenantId: string) => {
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;

      await createDocument.mutateAsync({
        tenantId,
        name: file.name,
        source: 'upload',
        content,
        metadata: { name: file.name, type: file.type },
      });
    };
    reader.readAsText(file);
  };

  const handleEdit = (doc: Document) => {
    // TODO: Implement edit modal
  };

  const handleDelete = (id: string) => {
    if (confirm(t('documents.actions.confirmDelete'))) {
      deleteDocument.mutate(id);
    }
  };

  const documents = documentsQuery.data || [];
  const hasDocuments = documents.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t('documents.title')}
        </h1>
        <p className="text-muted-foreground">{t('documents.subtitle')}</p>
      </div>

      {/* Upload Section */}
      {showUpload ? (
        <DocumentUpload
          onFileSelect={handleFileSelect}
          onCancel={() => setShowUpload(false)}
          isUploading={isUploading}
          selectedTenantId={selectedTenantId}
          onTenantChange={setSelectedTenantId}
        />
      ) : (
        <div className="mb-6">
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('documents.uploadButton')}
          </Button>
        </div>
      )}

      {/* Documents List/Table */}
      {documentsQuery.isLoading ? (
        <div className="space-y-3">
          {/* Desktop skeleton */}
          <Card className="hidden md:block p-6">
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full" />
          </Card>
          {/* Mobile skeletons */}
          <div className="md:hidden space-y-3">
            <Card className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
            <Card className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
            <Card className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          </div>
        </div>
      ) : hasDocuments ? (
        <>
          {/* Desktop: Table */}
          <DocumentTable
            documents={documents}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getTenantName={getTenantName}
          />

          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onEdit={handleEdit}
                onDelete={handleDelete}
                getTenantName={getTenantName}
              />
            ))}
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-lg">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('documents.noDocuments')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('documents.noDocumentsDescription')}
          </p>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('documents.uploadButton')}
          </Button>
        </div>
      )}
    </div>
  );
}
