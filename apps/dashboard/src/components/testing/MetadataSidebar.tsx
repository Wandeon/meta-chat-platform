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
