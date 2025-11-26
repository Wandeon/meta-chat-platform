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
