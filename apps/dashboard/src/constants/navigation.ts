import {
  Users,
  Activity,
  Server,
  Hash,
  FileText,
  MessageSquare,
  Webhook,
  Rocket
} from 'lucide-react';

export const NAV_LINKS = [
  { path: '/tenants', labelKey: 'nav.tenants', icon: Users },
  { path: '/analytics', labelKey: 'nav.analytics', icon: Activity },
  { path: '/mcp-servers', labelKey: 'nav.mcpServers', icon: Server },
  { path: '/channels', labelKey: 'nav.channels', icon: Hash },
  { path: '/documents', labelKey: 'nav.documents', icon: FileText },
  { path: '/conversations', labelKey: 'nav.conversations', icon: MessageSquare },
  { path: '/webhooks', labelKey: 'nav.webhooks', icon: Webhook },
  { path: '/testing', labelKey: 'nav.testing', icon: Rocket },
  { path: '/health', labelKey: 'nav.health', icon: Activity },
];

// Mobile shows only 5 most important items
export const MOBILE_NAV_ITEMS = [
  { path: '/documents', icon: FileText, labelKey: 'nav.documents' },
  { path: '/conversations', icon: MessageSquare, labelKey: 'nav.conversations' },
  { path: '/testing', icon: Rocket, labelKey: 'nav.testing' },
  { path: '/health', icon: Activity, labelKey: 'nav.health' },
  { path: '/tenants', icon: Users, labelKey: 'nav.tenants' },
];
