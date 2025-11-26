# Phase 2: Page Redesigns Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign all 5 dashboard pages to match the new design system with proper responsive layouts, shadcn/ui components, and polished UX.

**Architecture:** Each page will be refactored to use shadcn/ui components (Button, Input, Card, Badge, Table, Dialog) with Tailwind utility classes. Desktop layouts use two-column or table views, mobile layouts stack vertically or use card-based lists. All pages follow the design system tokens for colors, spacing, and typography.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, lucide-react icons

---

## Task 1: Redesign Documents Page (Knowledge Base)

**Goal:** Transform the Documents page into a polished document management interface with drag-drop upload, responsive table/cards, and status badges.

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/DocumentsPage.tsx`
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/components/documents/DocumentUpload.tsx`
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/components/documents/DocumentTable.tsx`
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/components/documents/DocumentCard.tsx`
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/lib/i18n/locales/en.json`
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/lib/i18n/locales/hr.json`
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/lib/i18n/locales/de.json`

### Step 1: Add translation keys for Documents page

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/lib/i18n/locales/en.json`

Add to the JSON:

```json
{
  "nav": { /* existing */ },
  "documents": {
    "title": "Knowledge Base",
    "subtitle": "Manage documents your chatbot uses to answer questions",
    "uploadButton": "Upload Document",
    "noDocuments": "No documents yet",
    "noDocumentsDescription": "Upload your first document to get started",
    "uploadPrompt": "Drag and drop files here, or click to browse",
    "uploadSupported": "Supported: PDF, TXT, MD, DOCX (max 10MB)",
    "table": {
      "name": "Name",
      "tenant": "Tenant",
      "status": "Status",
      "uploadedAt": "Uploaded",
      "actions": "Actions"
    },
    "status": {
      "processing": "Processing",
      "ready": "Ready",
      "failed": "Failed"
    },
    "actions": {
      "view": "View",
      "edit": "Edit",
      "delete": "Delete",
      "confirmDelete": "Are you sure you want to delete this document?"
    }
  }
}
```

Croatian translation (hr.json):

```json
{
  "documents": {
    "title": "Baza Znanja",
    "subtitle": "Upravljajte dokumentima koje vaš chatbot koristi za odgovore",
    "uploadButton": "Učitaj Dokument",
    "noDocuments": "Još nema dokumenata",
    "noDocumentsDescription": "Učitajte svoj prvi dokument za početak",
    "uploadPrompt": "Povucite i ispustite datoteke ovdje ili kliknite za pregled",
    "uploadSupported": "Podržano: PDF, TXT, MD, DOCX (maks 10MB)",
    "table": {
      "name": "Naziv",
      "tenant": "Stanar",
      "status": "Status",
      "uploadedAt": "Učitano",
      "actions": "Akcije"
    },
    "status": {
      "processing": "Obrada",
      "ready": "Spremno",
      "failed": "Nije uspjelo"
    },
    "actions": {
      "view": "Pregledaj",
      "edit": "Uredi",
      "delete": "Izbriši",
      "confirmDelete": "Jeste li sigurni da želite izbrisati ovaj dokument?"
    }
  }
}
```

German translation (de.json):

```json
{
  "documents": {
    "title": "Wissensbasis",
    "subtitle": "Verwalten Sie Dokumente, die Ihr Chatbot für Antworten verwendet",
    "uploadButton": "Dokument Hochladen",
    "noDocuments": "Noch keine Dokumente",
    "noDocumentsDescription": "Laden Sie Ihr erstes Dokument hoch, um zu beginnen",
    "uploadPrompt": "Dateien hier ablegen oder zum Durchsuchen klicken",
    "uploadSupported": "Unterstützt: PDF, TXT, MD, DOCX (max 10MB)",
    "table": {
      "name": "Name",
      "tenant": "Mieter",
      "status": "Status",
      "uploadedAt": "Hochgeladen",
      "actions": "Aktionen"
    },
    "status": {
      "processing": "Verarbeitung",
      "ready": "Bereit",
      "failed": "Fehlgeschlagen"
    },
    "actions": {
      "view": "Ansehen",
      "edit": "Bearbeiten",
      "delete": "Löschen",
      "confirmDelete": "Möchten Sie dieses Dokument wirklich löschen?"
    }
  }
}
```

### Step 2: Install additional shadcn/ui components needed

Run:

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npx shadcn-ui@latest add table dialog alert
```

Expected output: Components installed successfully

### Step 3: Create DocumentUpload component

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/components/documents/DocumentUpload.tsx`

```typescript
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DocumentUploadProps {
  onFileSelect: (file: File) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export function DocumentUpload({ onFileSelect, onCancel, isUploading }: DocumentUploadProps) {
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
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('documents.uploadButton')}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
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
            disabled={isUploading}
            className="hidden"
          />
          <Button asChild disabled={isUploading}>
            <span>{isUploading ? 'Uploading...' : 'Browse Files'}</span>
          </Button>
        </label>
      </div>
    </Card>
  );
}
```

### Step 4: Create DocumentTable component

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/components/documents/DocumentTable.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Document } from '@/api/types';

interface DocumentTableProps {
  documents: Document[];
  onEdit: (doc: Document) => void;
  onDelete: (id: string) => void;
  getTenantName: (id: string) => string;
}

export function DocumentTable({ documents, onEdit, onDelete, getTenantName }: DocumentTableProps) {
  const { t } = useTranslation();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ready: 'default',
      processing: 'secondary',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {t(`documents.status.${status}` as any)}
      </Badge>
    );
  };

  return (
    <div className="hidden md:block border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('documents.table.name')}</TableHead>
            <TableHead>{t('documents.table.tenant')}</TableHead>
            <TableHead>{t('documents.table.status')}</TableHead>
            <TableHead>{t('documents.table.uploadedAt')}</TableHead>
            <TableHead className="text-right">{t('documents.table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                {(doc.metadata as any)?.name || doc.filename || 'Untitled'}
              </TableCell>
              <TableCell>{getTenantName(doc.tenantId)}</TableCell>
              <TableCell>{getStatusBadge(doc.status || 'ready')}</TableCell>
              <TableCell>
                {new Date(doc.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(doc)}>
                      <Edit className="mr-2 h-4 w-4" />
                      {t('documents.actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(doc.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('documents.actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Step 5: Create DocumentCard component for mobile

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/components/documents/DocumentCard.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Document } from '@/api/types';

interface DocumentCardProps {
  document: Document;
  onEdit: (doc: Document) => void;
  onDelete: (id: string) => void;
  getTenantName: (id: string) => string;
}

export function DocumentCard({ document, onEdit, onDelete, getTenantName }: DocumentCardProps) {
  const { t } = useTranslation();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ready: 'default',
      processing: 'secondary',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {t(`documents.status.${status}` as any)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-medium text-foreground">
              {(document.metadata as any)?.name || document.filename || 'Untitled'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {getTenantName(document.tenantId)}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(document)}>
                <Edit className="mr-2 h-4 w-4" />
                {t('documents.actions.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(document.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('documents.actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between mt-3">
          {getStatusBadge(document.status || 'ready')}
          <span className="text-xs text-muted-foreground">
            {new Date(document.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 6: Refactor DocumentsPage to use new components

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/DocumentsPage.tsx`

Replace entire file contents:

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, FileText } from 'lucide-react';
import { useApi } from '../api/client';
import { Button } from '@/components/ui/button';
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

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;

      // Get first tenant as default (you may want to add tenant selection)
      const defaultTenantId = tenantsQuery.data?.[0]?.id || '';

      await createDocument.mutateAsync({
        tenantId: defaultTenantId,
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
    console.log('Edit document:', doc);
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
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
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
```

### Step 7: Verify build

Run:

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npm run build
```

Expected output: Build succeeds with no errors

### Step 8: Commit Task 1

Run:

```bash
cd /home/deploy/meta-chat-platform
git add -A
git commit -m "feat(dashboard): redesign Documents/Knowledge Base page

- Add translation keys for documents page (EN/HR/DE)
- Install Table, Dialog, Alert shadcn components
- Create DocumentUpload component with drag-drop
- Create DocumentTable component for desktop
- Create DocumentCard component for mobile
- Refactor DocumentsPage with new design system
- Add empty state with helpful CTA
- Responsive: table on desktop, cards on mobile

Phase 2 Task 1 complete"
```

---

## Task 2: Redesign Testing Page (Test Chat)

**Goal:** Transform the Testing page into a polished chat interface with message bubbles, metadata sidebar, and proper responsive layout.

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/TestingPage.tsx`
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/components/testing/ChatMessage.tsx`
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/components/testing/ChatInput.tsx`
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/components/testing/MetadataSidebar.tsx`
- Modify: Translation files

### Step 1: Add translation keys for Testing page

Add to all locale files:

```json
{
  "testing": {
    "title": "Test Your Chatbot",
    "subtitle": "Have a conversation to see how it responds",
    "selectTenant": "Select a tenant to start testing",
    "startConversation": "Start a conversation",
    "typeMessage": "Type a message to test how your chatbot responds",
    "tryExample": "Try asking about content from your Knowledge Base!",
    "placeholder": "Type your message...",
    "send": "Send",
    "newConversation": "Start New Conversation",
    "metadata": {
      "title": "Response Info",
      "model": "Model",
      "latency": "Latency",
      "tokens": "Tokens",
      "ragEnabled": "RAG Enabled",
      "mcpEnabled": "MCP Enabled"
    }
  }
}
```

Croatian (hr.json):

```json
{
  "testing": {
    "title": "Testirajte Svoj Chatbot",
    "subtitle": "Razgovarajte da vidite kako reagira",
    "selectTenant": "Odaberite stanara za početak testiranja",
    "startConversation": "Započni razgovor",
    "typeMessage": "Upišite poruku da testirate kako vaš chatbot reagira",
    "tryExample": "Pokušajte pitati o sadržaju iz vaše Baze Znanja!",
    "placeholder": "Upišite vašu poruku...",
    "send": "Pošalji",
    "newConversation": "Započni Novi Razgovor",
    "metadata": {
      "title": "Info o Odgovoru",
      "model": "Model",
      "latency": "Kašnjenje",
      "tokens": "Tokeni",
      "ragEnabled": "RAG Omogućen",
      "mcpEnabled": "MCP Omogućen"
    }
  }
}
```

German (de.json):

```json
{
  "testing": {
    "title": "Testen Sie Ihren Chatbot",
    "subtitle": "Führen Sie ein Gespräch, um zu sehen, wie er antwortet",
    "selectTenant": "Wählen Sie einen Mieter aus, um mit dem Testen zu beginnen",
    "startConversation": "Gespräch beginnen",
    "typeMessage": "Geben Sie eine Nachricht ein, um zu testen, wie Ihr Chatbot antwortet",
    "tryExample": "Versuchen Sie, nach Inhalten aus Ihrer Wissensbasis zu fragen!",
    "placeholder": "Geben Sie Ihre Nachricht ein...",
    "send": "Senden",
    "newConversation": "Neues Gespräch Beginnen",
    "metadata": {
      "title": "Antwort-Info",
      "model": "Modell",
      "latency": "Latenz",
      "tokens": "Token",
      "ragEnabled": "RAG Aktiviert",
      "mcpEnabled": "MCP Aktiviert"
    }
  }
}
```

### Step 2: Create ChatMessage component

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/components/testing/ChatMessage.tsx`

```typescript
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn("flex mb-4", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-2",
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-foreground"
      )}>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
        <p className={cn(
          "text-xs mt-1",
          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
```

### Step 3: Create ChatInput component

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/components/testing/ChatInput.tsx`

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('testing.placeholder')}
        disabled={disabled || isLoading}
        className="min-h-[60px] max-h-[200px] resize-none"
      />
      <Button
        type="submit"
        disabled={disabled || isLoading || !message.trim()}
        size="icon"
        className="h-[60px] w-[60px] shrink-0"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
```

### Step 4: Install Textarea component

Run:

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npx shadcn-ui@latest add textarea
```

### Step 5: Create MetadataSidebar component

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/components/testing/MetadataSidebar.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MetadataSidebarProps {
  metadata: {
    model?: string;
    latency?: number;
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    ragEnabled?: boolean;
    mcpEnabled?: boolean;
  } | null;
}

export function MetadataSidebar({ metadata }: MetadataSidebarProps) {
  const { t } = useTranslation();

  if (!metadata) {
    return null;
  }

  return (
    <Card className="hidden lg:block lg:w-80 shrink-0">
      <CardHeader>
        <CardTitle className="text-lg">{t('testing.metadata.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metadata.model && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('testing.metadata.model')}
            </p>
            <p className="text-sm">{metadata.model}</p>
          </div>
        )}

        {metadata.latency && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('testing.metadata.latency')}
            </p>
            <p className="text-sm">{metadata.latency}ms</p>
          </div>
        )}

        {metadata.tokens && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {t('testing.metadata.tokens')}
            </p>
            <p className="text-sm">
              Total: {metadata.tokens.total || 0}
              {metadata.tokens.prompt && ` (${metadata.tokens.prompt} + ${metadata.tokens.completion})`}
            </p>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {metadata.ragEnabled && (
            <Badge variant="default">{t('testing.metadata.ragEnabled')}</Badge>
          )}
          {metadata.mcpEnabled && (
            <Badge variant="secondary">{t('testing.metadata.mcpEnabled')}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 6: Refactor TestingPage

**File:** `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/TestingPage.tsx`

Replace entire file:

```typescript
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatMessage } from '@/components/testing/ChatMessage';
import { ChatInput } from '@/components/testing/ChatInput';
import { MetadataSidebar } from '@/components/testing/MetadataSidebar';
import type { Tenant } from '../api/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  message: string;
  conversationId?: string;
  metadata?: any;
}

export function TestingPage() {
  const { t } = useTranslation();
  const api = useApi();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMetadata, setLastMetadata] = useState<any>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!selectedTenantId) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      const response = await api.post<ChatResponse, any>('/api/chat', {
        message: content,
        conversationId,
        tenantId: selectedTenantId,
      });
      const latency = Date.now() - startTime;

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message || 'No response',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      setLastMetadata({
        ...response.metadata,
        latency,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setLastMetadata(null);
    setError(null);
  };

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('testing.title')}
          </h1>
          <p className="text-muted-foreground mb-4">{t('testing.subtitle')}</p>

          <div className="flex gap-2 items-center">
            <div className="flex-1 max-w-xs">
              <TenantSelector
                value={selectedTenantId}
                onChange={setSelectedTenantId}
              />
            </div>
            {messages.length > 0 && (
              <Button variant="outline" onClick={handleNewConversation}>
                {t('testing.newConversation')}
              </Button>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        {!selectedTenantId ? (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('testing.selectTenant')}</p>
            </div>
          </Card>
        ) : messages.length === 0 ? (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center p-8 max-w-md">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('testing.startConversation')}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {t('testing.typeMessage')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('testing.tryExample')}
              </p>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} {...msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Input Area */}
        <div className="mt-4">
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            disabled={!selectedTenantId}
          />
        </div>
      </div>

      {/* Metadata Sidebar (Desktop Only) */}
      <MetadataSidebar metadata={lastMetadata} />
    </div>
  );
}
```

### Step 7: Verify build

Run:

```bash
npm run build
```

Expected output: Build succeeds

### Step 8: Commit Task 2

Run:

```bash
git add -A
git commit -m "feat(dashboard): redesign Testing/Test Chat page

- Add translation keys for testing page (EN/HR/DE)
- Install Textarea shadcn component
- Create ChatMessage component with role-based styling
- Create ChatInput component with send button
- Create MetadataSidebar for response info (desktop only)
- Refactor TestingPage with chat interface design
- Add empty state and tenant selection
- Responsive: sidebar hidden on mobile, full-width chat

Phase 2 Task 2 complete"
```

---

## Task 3: Redesign Widget Page (Deploy Page)

*(Due to context limits, I'll create a condensed version of the remaining tasks)*

**Goal:** Transform the Widget/Deploy page with widget customization, live preview, and code snippet with copy button.

**Key Steps:**
1. Add translation keys for widget page
2. Create WidgetPreview component
3. Create WidgetCustomizer component with form
4. Create CodeSnippet component with copy button
5. Refactor WidgetPage with two-column layout (desktop) / stacked (mobile)
6. Add installation instructions
7. Commit changes

---

## Task 4: Redesign Conversations Page

**Goal:** Transform Conversations page with list view, filters, and message preview cards.

**Key Steps:**
1. Add translation keys for conversations
2. Create ConversationCard component
3. Create ConversationFilters component
4. Refactor ConversationsPage with list layout
5. Add empty state
6. Commit changes

---

## Task 5: Polish Pass

**Goal:** Review all pages for consistency, fix issues, and ensure responsive behavior.

**Key Steps:**
1. Test all pages on mobile (375px, 768px, 1024px, 1440px)
2. Fix any spacing/alignment issues
3. Add missing loading states (skeletons where needed)
4. Verify all translations work
5. Test dark mode on all pages
6. Verify no horizontal scroll anywhere
7. Final commit

---

## Verification

After all tasks complete:

1. Run build: `npm run build` - Should succeed with no errors
2. Test responsive: Resize browser from 375px to 1440px - No horizontal scroll
3. Test dark mode: Toggle theme on all pages - Proper colors
4. Test i18n: Switch languages on all pages - All text translates
5. Test interactions: Click all buttons, forms, dropdowns - Everything works

---

## Notes

- All pages follow the design system (Tailwind + shadcn/ui)
- Mobile-first responsive design throughout
- Consistent spacing using design tokens (p-6, gap-4, etc.)
- All text uses translation keys
- Empty states are helpful and actionable
- Loading states prevent janky UX
- Dark mode works on all components
