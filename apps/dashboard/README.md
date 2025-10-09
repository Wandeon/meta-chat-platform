# Meta Chat Admin Dashboard

React-based admin dashboard for managing the Meta Chat Platform.

## Features

- 🔐 **Admin Authentication**: Secure login with admin API keys
- 👥 **Tenant Management**: Create and manage tenant workspaces  
- 📊 **Health Monitoring**: Real-time system health status
- 🎨 **Modern UI**: Built with React, TypeScript, and Vite
- ⚡ **Fast**: Instant hot module replacement
- 🔄 **Real-time**: Auto-refreshing data with React Query

## Development

### Prerequisites

- Node.js 18+
- Admin API key

### Setup

```bash
# From project root
pnpm install
cd apps/dashboard
pnpm dev
```

Dashboard runs at http://localhost:5173

### Environment Variables

Create `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## API Integration

- **Auth**: `x-admin-key` header
- **Base URL**: `VITE_API_BASE_URL`
- **Response**: Auto-unwraps `{ success, data }` format

## Production Build

```bash
pnpm build
# Output: dist/
```

## Deployment

Served by Nginx alongside the API:

```nginx
location /dashboard/ {
  alias /var/www/metachat/dashboard/;
  try_files $uri $uri/ /dashboard/index.html;
}
```

## Security

- Never commit API keys
- Use HTTPS in production
- Rotate keys regularly
- Admin keys start with `adm_`
