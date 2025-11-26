import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TenantSelector } from '../TenantSelector';

interface DocumentUploadProps {
  onFileSelect: (file: File, tenantId: string) => void;
  onCancel: () => void;
  isUploading?: boolean;
  selectedTenantId: string;
  onTenantChange: (id: string) => void;
}

export function DocumentUpload({
  onFileSelect,
  onCancel,
  isUploading,
  selectedTenantId,
  onTenantChange
}: DocumentUploadProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file, selectedTenantId);
    }
  }, [onFileSelect, selectedTenantId]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file, selectedTenantId);
    }
  }, [onFileSelect, selectedTenantId]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('documents.uploadButton')}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tenant Selection */}
      <div className="mb-4">
        <label className="text-sm font-medium mb-2 block">Select Tenant</label>
        <TenantSelector
          value={selectedTenantId}
          onChange={onTenantChange}
        />
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm text-foreground mb-2">{t('documents.uploadPrompt')}</p>
        <p className="text-xs text-muted-foreground mb-4">
          {t('documents.uploadSupported')}
        </p>

        <label>
          <input
            type="file"
            accept=".pdf,.txt,.md,.docx"
            onChange={handleFileInput}
            disabled={isUploading || !selectedTenantId}
            className="hidden"
          />
          <Button asChild disabled={isUploading || !selectedTenantId}>
            <span>{isUploading ? 'Uploading...' : 'Browse Files'}</span>
          </Button>
        </label>
      </div>
    </Card>
  );
}
