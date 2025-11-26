import {
  Users,
  Activity,
  Server,
  Hash,
  FileText,
  MessageSquare,
  Webhook,
  Rocket,
  Settings,
  CreditCard
} from 'lucide-react';

// Admin-only navigation items
export const ADMIN_NAV_LINKS = [
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

// Client navigation items (no tenants, mcp-servers, channels)
export const CLIENT_NAV_LINKS = [
  { path: '/documents', labelKey: 'nav.documents', icon: FileText },
  { path: '/conversations', labelKey: 'nav.conversations', icon: MessageSquare },
  { path: '/testing', labelKey: 'nav.testing', icon: Rocket },
  { path: '/analytics', labelKey: 'nav.analytics', icon: Activity },
  { path: '/webhooks', labelKey: 'nav.webhooks', icon: Webhook },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
  { path: '/billing', labelKey: 'nav.billing', icon: CreditCard },
];

// Legacy export for compatibility
export const NAV_LINKS = ADMIN_NAV_LINKS;

// Admin mobile navigation
export const ADMIN_MOBILE_NAV = [
  { path: '/tenants', icon: Users, labelKey: 'nav.tenants' },
  { path: '/documents', icon: FileText, labelKey: 'nav.documents' },
  { path: '/conversations', icon: MessageSquare, labelKey: 'nav.conversations' },
  { path: '/testing', icon: Rocket, labelKey: 'nav.testing' },
  { path: '/health', icon: Activity, labelKey: 'nav.health' },
];

// Client mobile navigation
export const CLIENT_MOBILE_NAV = [
  { path: '/documents', icon: FileText, labelKey: 'nav.documents' },
  { path: '/conversations', icon: MessageSquare, labelKey: 'nav.conversations' },
  { path: '/testing', icon: Rocket, labelKey: 'nav.testing' },
  { path: '/analytics', icon: Activity, labelKey: 'nav.analytics' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

// Legacy export
export const MOBILE_NAV_ITEMS = ADMIN_MOBILE_NAV;
