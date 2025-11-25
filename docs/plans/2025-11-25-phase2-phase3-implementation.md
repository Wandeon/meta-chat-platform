# Meta Chat Platform - Phase 2 & 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete UX redesign by building the setup wizard (Phase 2) and admin dashboard (Phase 3) for the Meta Chat Platform.

**Architecture:** 
- Setup wizard uses Tenant.settings JSON to track completion (`setupCompleted: boolean`)
- Admin dashboard uses separate AdminUser authentication with JWT type `admin`
- Both dashboards share the same React app with conditional routing

**Tech Stack:** React 18, TypeScript, React Query, React Router, Prisma, Express

---

## Phase 2: Setup Wizard

### Task 1: Add Setup Tracking to Tenant Settings

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/api/src/routes/tenants.ts`

**Step 1: Add endpoint to mark setup complete**

In `apps/api/src/routes/tenants.ts`, add after the existing PATCH route:

```typescript
// Mark setup as complete
router.post(
  '/setup-complete',
  asyncHandler(async (req, res) => {
    const tenantId = req.tenantUser!.tenantId;
    
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: {
          ...(await prisma.tenant.findUnique({ where: { id: tenantId } }))?.settings as object,
          setupCompleted: true,
          setupCompletedAt: new Date().toISOString(),
        },
      },
    });
    
    respondSuccess(res, { setupCompleted: true });
  }),
);
```

**Step 2: Run API build to verify**

Run: `ssh admin@vps-00 "cd /home/deploy/meta-chat-platform && npm run build --workspace=apps/api"`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/api/src/routes/tenants.ts
git commit -m "feat(api): add setup-complete endpoint"
```

---

### Task 2: Create SetupWizard Component

**Files:**
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/components/SetupWizard.tsx`

**Step 1: Create the wizard component**

```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';

interface SetupWizardProps {
  onComplete: () => void;
}

type Step = 'knowledge' | 'instructions' | 'test' | 'deploy';

const STEPS: { id: Step; title: string; description: string }[] = [
  { id: 'knowledge', title: 'Add Knowledge', description: 'Upload documents or paste text for your chatbot' },
  { id: 'instructions', title: 'Set Instructions', description: 'Tell your bot how to behave' },
  { id: 'test', title: 'Test Your Bot', description: 'Try a conversation before going live' },
  { id: 'deploy', title: 'Deploy', description: 'Connect to your website or messaging app' },
];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('knowledge');
  const api = useApi();
  const queryClient = useQueryClient();

  const completeSetup = useMutation({
    mutationFn: () => api.post('/api/tenants/setup-complete', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      onComplete();
    },
  });

  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isLastStep = currentIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      completeSetup.mutate();
    } else {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleSkip = () => {
    if (isLastStep) {
      completeSetup.mutate();
    } else {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        {/* Progress bar */}
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {STEPS.map((step, i) => (
              <div
                key={step.id}
                style={{
                  flex: 1,
                  height: '4px',
                  borderRadius: '2px',
                  background: i <= currentIndex ? '#4f46e5' : '#e2e8f0',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
            Step {currentIndex + 1} of {STEPS.length}
          </div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>{STEPS[currentIndex].title}</h2>
          <p style={{ margin: 0, color: '#64748b' }}>{STEPS[currentIndex].description}</p>
        </div>

        {/* Step content */}
        <div style={{ padding: '24px' }}>
          {currentStep === 'knowledge' && <KnowledgeStep />}
          {currentStep === 'instructions' && <InstructionsStep />}
          {currentStep === 'test' && <TestStep />}
          {currentStep === 'deploy' && <DeployStep />}
        </div>

        {/* Navigation */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={handleBack}
            disabled={currentIndex === 0}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: currentIndex === 0 ? 0.5 : 1,
            }}
          >
            Back
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSkip}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              disabled={completeSetup.isPending}
              style={{
                padding: '10px 24px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isLastStep ? (completeSetup.isPending ? 'Finishing...' : 'Finish Setup') : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step components (simplified versions)
function KnowledgeStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
      <p style={{ color: '#64748b' }}>
        Upload documents or paste text to teach your chatbot about your business.
        You can do this now or later from the Knowledge Base page.
      </p>
    </div>
  );
}

function InstructionsStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
      <p style={{ color: '#64748b' }}>
        Tell your chatbot how to behave - its personality, tone, and any special rules.
        You can customize this anytime from Settings.
      </p>
    </div>
  );
}

function TestStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧪</div>
      <p style={{ color: '#64748b' }}>
        Try chatting with your bot to see how it responds.
        Use the Test page anytime to refine its behavior.
      </p>
    </div>
  );
}

function DeployStep() {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
      <p style={{ color: '#64748b' }}>
        Ready to go live? Deploy your chatbot to your website, WhatsApp, or Facebook Messenger.
        Visit the Deploy page to get started.
      </p>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `ssh admin@vps-00 "cd /home/deploy/meta-chat-platform/apps/dashboard && npx tsc --noEmit"`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/dashboard/src/components/SetupWizard.tsx
git commit -m "feat(dashboard): add SetupWizard component"
```

---

### Task 3: Integrate Wizard into App.tsx

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/App.tsx`

**Step 1: Add wizard state and query**

Update App.tsx imports and add wizard logic:

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './routes/AuthProvider';
import { useApi } from './api/client';
import { DashboardLayout } from './components/DashboardLayout';
import { SetupWizard } from './components/SetupWizard';
// ... other imports

export function App() {
  const { apiKey, getUser } = useAuth();
  const api = useApi();
  const user = getUser();
  const [wizardDismissed, setWizardDismissed] = useState(false);

  // Fetch tenant to check setup status
  const tenantQuery = useQuery({
    queryKey: ['tenant-settings', user?.tenantId],
    queryFn: () => api.get(`/api/tenants/${user?.tenantId}`),
    enabled: !!apiKey && !!user?.tenantId,
  });

  const setupCompleted = (tenantQuery.data?.settings as any)?.setupCompleted === true;
  const showWizard = apiKey && !setupCompleted && !wizardDismissed && !tenantQuery.isLoading;

  if (!apiKey) {
    return (
      <Routes>
        {/* ... unauthenticated routes ... */}
      </Routes>
    );
  }

  return (
    <>
      {showWizard && <SetupWizard onComplete={() => setWizardDismissed(true)} />}
      <Routes>
        {/* ... authenticated routes ... */}
      </Routes>
    </>
  );
}
```

**Step 2: Build dashboard**

Run: `ssh admin@vps-00 "cd /home/deploy/meta-chat-platform && npm run build --workspace=apps/dashboard"`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/dashboard/src/App.tsx
git commit -m "feat(dashboard): integrate SetupWizard for first-time users"
```

---

## Phase 3: Admin Dashboard

### Task 4: Create Admin Login API

**Files:**
- Create: `/home/deploy/meta-chat-platform/apps/api/src/routes/auth/admin-login.ts`
- Modify: `/home/deploy/meta-chat-platform/apps/api/src/routes/auth/index.ts`

**Step 1: Create admin login route**

```typescript
// apps/api/src/routes/auth/admin-login.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '@meta-chat/database';
import { verifyPassword } from '../../utils/password';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = getPrismaClient();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/admin-login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin || !admin.password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role, type: 'admin' },
      process.env.ADMIN_JWT_SECRET!,
      { expiresIn: '7d', issuer: 'meta-chat-platform' }
    );

    res.json({
      success: true,
      token,
      user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

export default router;
```

**Step 2: Register route in auth/index.ts**

Add to `apps/api/src/routes/auth/index.ts`:

```typescript
import adminLoginRouter from './admin-login';
// ... in router setup:
router.use('/', adminLoginRouter);
```

**Step 3: Commit**

```bash
git add apps/api/src/routes/auth/admin-login.ts apps/api/src/routes/auth/index.ts
git commit -m "feat(api): add admin login endpoint"
```

---

### Task 5: Create Admin Dashboard Layout

**Files:**
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/components/AdminDashboardLayout.tsx`

**Step 1: Create admin layout component**

```typescript
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../routes/AuthProvider';
import { clsx } from 'clsx';
import '../styles/dashboard.css';

const ADMIN_NAV_LINKS = [
  { to: '/admin/clients', label: 'Clients', icon: '👥' },
  { to: '/admin/models', label: 'Models', icon: '🤖' },
  { to: '/admin/billing', label: 'Billing', icon: '💳' },
  { to: '/admin/system', label: 'System', icon: '⚙️' },
];

export function AdminDashboardLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar" style={{ background: '#1e1b4b' }}>
        <div className="dashboard-brand">
          <span className="dot" style={{ background: '#f97316' }} /> Admin Dashboard
        </div>
        <nav>
          <ul>
            {ADMIN_NAV_LINKS.map((link) => {
              const active = location.pathname.startsWith(link.to);
              return (
                <li key={link.to}>
                  <Link className={clsx({ active })} to={link.to}>
                    <span style={{ marginRight: '8px' }}>{link.icon}</span>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button className="logout" onClick={logout} type="button">
          Log out
        </button>
      </aside>
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/dashboard/src/components/AdminDashboardLayout.tsx
git commit -m "feat(dashboard): add AdminDashboardLayout component"
```

---

### Task 6: Create Admin Pages - Clients

**Files:**
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/admin/AdminClientsPage.tsx`

**Step 1: Create clients page**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../api/client';

interface TenantWithUser {
  id: string;
  name: string;
  subscriptionStatus: string;
  createdAt: string;
  users: { email: string; name: string }[];
  settings: { llm?: { provider?: string; model?: string } };
}

export function AdminClientsPage() {
  const api = useApi();
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => api.get<TenantWithUser[]>('/api/admin/tenants'),
  });

  const updateTenant = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/api/admin/tenants/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }),
  });

  return (
    <section className="dashboard-section">
      <h1>Clients</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Manage all client accounts and their AI model assignments.
      </p>

      {tenantsQuery.isLoading && <p>Loading clients...</p>}

      {tenantsQuery.data && (
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Owner</th>
              <th>Plan</th>
              <th>Model</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenantsQuery.data.map((tenant) => (
              <tr key={tenant.id}>
                <td><strong>{tenant.name}</strong></td>
                <td>{tenant.users[0]?.email || 'N/A'}</td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    background: tenant.subscriptionStatus === 'active' ? '#d1fae5' : '#f1f5f9',
                    color: tenant.subscriptionStatus === 'active' ? '#065f46' : '#64748b',
                  }}>
                    {tenant.subscriptionStatus}
                  </span>
                </td>
                <td>{tenant.settings?.llm?.model || 'ollama/default'}</td>
                <td>{new Date(tenant.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="secondary-button" style={{ fontSize: '13px', padding: '6px 12px' }}>
                    Configure
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add apps/dashboard/src/pages/admin/AdminClientsPage.tsx
git commit -m "feat(dashboard): add AdminClientsPage"
```

---

### Task 7: Create Admin Pages - Models

**Files:**
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/admin/AdminModelsPage.tsx`

**Step 1: Create models page**

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../../api/client';

export function AdminModelsPage() {
  const api = useApi();
  const [ollamaUrl, setOllamaUrl] = useState('http://100.64.0.1:11434');
  const [openaiKey, setOpenaiKey] = useState('');

  const ollamaModels = useQuery({
    queryKey: ['ollama-models', ollamaUrl],
    queryFn: () => api.get(`/api/ollama/models?baseUrl=${encodeURIComponent(ollamaUrl)}`),
    enabled: !!ollamaUrl,
  });

  return (
    <section className="dashboard-section">
      <h1>AI Models</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Configure AI model providers and endpoints.
      </p>

      <div className="settings-section" style={{ marginBottom: '24px' }}>
        <h2>Ollama (Self-Hosted)</h2>
        <div className="form-grid">
          <label>
            Ollama URL
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://gpu-01:11434"
            />
            <small style={{ color: '#64748b' }}>Tailscale IP of GPU-01</small>
          </label>
        </div>
        {ollamaModels.data && (
          <div style={{ marginTop: '16px' }}>
            <strong>Available Models:</strong>
            <ul style={{ marginTop: '8px' }}>
              {(ollamaModels.data as any).models?.map((m: any) => (
                <li key={m.name}>{m.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h2>OpenAI</h2>
        <div className="form-grid">
          <label>
            API Key
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
          </label>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add apps/dashboard/src/pages/admin/AdminModelsPage.tsx
git commit -m "feat(dashboard): add AdminModelsPage"
```

---

### Task 8: Create Admin Pages - System

**Files:**
- Create: `/home/deploy/meta-chat-platform/apps/dashboard/src/pages/admin/AdminSystemPage.tsx`

**Step 1: Create system page**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useApi } from '../../api/client';

export function AdminSystemPage() {
  const api = useApi();

  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: () => api.get('/api/health'),
    refetchInterval: 30000,
  });

  return (
    <section className="dashboard-section">
      <h1>System Health</h1>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>
        Monitor system status and services.
      </p>

      {healthQuery.isLoading && <p>Checking health...</p>}

      {healthQuery.data && (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <StatusCard title="API" status={(healthQuery.data as any).status} />
          <StatusCard title="Database" status={(healthQuery.data as any).database} />
          <StatusCard title="Redis" status={(healthQuery.data as any).redis} />
          <StatusCard title="Worker" status={(healthQuery.data as any).worker} />
        </div>
      )}
    </section>
  );
}

function StatusCard({ title, status }: { title: string; status: string }) {
  const isHealthy = status === 'ok' || status === 'healthy';
  return (
    <div style={{
      padding: '20px',
      background: isHealthy ? '#d1fae5' : '#fee2e2',
      borderRadius: '12px',
    }}>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: isHealthy ? '#065f46' : '#991b1b' }}>
        {isHealthy ? '✅ Healthy' : '❌ ' + status}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/dashboard/src/pages/admin/AdminSystemPage.tsx
git commit -m "feat(dashboard): add AdminSystemPage"
```

---

### Task 9: Create Admin API Routes

**Files:**
- Create: `/home/deploy/meta-chat-platform/apps/api/src/routes/admin/index.ts`
- Create: `/home/deploy/meta-chat-platform/apps/api/src/routes/admin/tenants.ts`
- Modify: `/home/deploy/meta-chat-platform/apps/api/src/index.ts`

**Step 1: Create admin tenants route**

```typescript
// apps/api/src/routes/admin/tenants.ts
import { Router } from 'express';
import { getPrismaClient } from '@meta-chat/database';
import { asyncHandler, respondSuccess } from '../../utils/http';

const prisma = getPrismaClient();
const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tenants = await prisma.tenant.findMany({
      include: {
        users: {
          select: { email: true, name: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    respondSuccess(res, tenants);
  }),
);

router.patch(
  '/:tenantId',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: req.body,
    });
    respondSuccess(res, tenant);
  }),
);

export default router;
```

**Step 2: Create admin index**

```typescript
// apps/api/src/routes/admin/index.ts
import { Router } from 'express';
import tenantsRouter from './tenants';
import { authenticateAdmin } from '../../middleware/authenticateAdmin';

const router = Router();

// All admin routes require admin authentication
router.use(authenticateAdmin);

router.use('/tenants', tenantsRouter);

export default router;
```

**Step 3: Create admin auth middleware**

```typescript
// apps/api/src/middleware/authenticateAdmin.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET!) as any;
    if (payload.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    (req as any).adminUser = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

**Step 4: Register admin routes in main index.ts**

Add to `apps/api/src/index.ts`:

```typescript
import adminRouter from './routes/admin';
// ... in route setup:
app.use('/api/admin', adminRouter);
```

**Step 5: Commit**

```bash
git add apps/api/src/routes/admin apps/api/src/middleware/authenticateAdmin.ts apps/api/src/index.ts
git commit -m "feat(api): add admin routes and middleware"
```

---

### Task 10: Integrate Admin Routes in Dashboard

**Files:**
- Modify: `/home/deploy/meta-chat-platform/apps/dashboard/src/App.tsx`

**Step 1: Add admin routes**

Update App.tsx to include admin routing:

```typescript
// Add imports
import { AdminDashboardLayout } from './components/AdminDashboardLayout';
import { AdminClientsPage } from './pages/admin/AdminClientsPage';
import { AdminModelsPage } from './pages/admin/AdminModelsPage';
import { AdminSystemPage } from './pages/admin/AdminSystemPage';

// In the Routes, add admin section:
{/* Admin Dashboard Routes */}
<Route path="/admin" element={<AdminDashboardLayout />}>
  <Route index element={<Navigate to="/admin/clients" replace />} />
  <Route path="clients" element={<AdminClientsPage />} />
  <Route path="models" element={<AdminModelsPage />} />
  <Route path="billing" element={<BillingPage />} />
  <Route path="system" element={<AdminSystemPage />} />
</Route>
```

**Step 2: Build and verify**

Run: `ssh admin@vps-00 "cd /home/deploy/meta-chat-platform && npm run build"`
Expected: Build succeeds

**Step 3: Restart API**

Run: `ssh admin@vps-00 "pm2 restart meta-chat-api"`

**Step 4: Commit all Phase 2 & 3**

```bash
git add .
git commit -m "feat: complete Phase 2 (wizard) and Phase 3 (admin dashboard)"
```

---

## Verification Checklist

After all tasks:

1. [ ] New users see setup wizard on first login
2. [ ] Setup wizard can be skipped or completed
3. [ ] Wizard doesn't appear after completion
4. [ ] Admin can login at /admin-login
5. [ ] Admin dashboard shows all clients
6. [ ] Admin can view models and system health
7. [ ] All pages are mobile responsive
