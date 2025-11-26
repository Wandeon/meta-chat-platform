# Design System Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Tailwind CSS, shadcn/ui, theme system, i18n, and responsive navigation shell

**Architecture:** Modern React + Vite dashboard with Tailwind CSS for styling, shadcn/ui for accessible components, CSS variables for theming, and react-i18next for translations. Mobile-first responsive with desktop sidebar and mobile bottom nav.

**Tech Stack:**
- Tailwind CSS 3.4+ (utility-first CSS)
- shadcn/ui (Radix UI-based components)
- react-i18next (internationalization)
- CSS variables (theming)
- React 18 + TypeScript + Vite (existing)

**Current State:**
- Dashboard at `/home/deploy/meta-chat-platform/apps/dashboard/`
- Using inline styles and custom CSS in `src/styles/dashboard.css`
- No design system, inconsistent sizing, poor mobile UX

---

## Task 1: Install and Configure Tailwind CSS

**Files:**
- Create: `apps/dashboard/tailwind.config.js`
- Create: `apps/dashboard/postcss.config.js`
- Modify: `apps/dashboard/package.json`
- Modify: `apps/dashboard/src/styles/globals.css` (rename from dashboard.css)
- Modify: `apps/dashboard/src/main.tsx`

**Step 1: Install Tailwind CSS dependencies**

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npm install -D tailwindcss@^3.4.0 postcss@^8.4.0 autoprefixer@^10.4.0
```

Expected output: Dependencies installed successfully

**Step 2: Initialize Tailwind configuration**

```bash
npx tailwindcss init -p
```

Expected output: Created `tailwind.config.js` and `postcss.config.js`

**Step 3: Configure Tailwind with content paths**

Edit `apps/dashboard/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
```

**Step 4: Rename and update global CSS file**

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard/src/styles
mv dashboard.css globals.css
```

**Step 5: Add Tailwind directives to globals.css**

Prepend to `apps/dashboard/src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 98%;
    --secondary: 189 94% 43%;
    --secondary-foreground: 0 0% 98%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 239 84% 67%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 7%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 7%;
    --popover-foreground: 0 0% 98%;
    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 98%;
    --secondary: 189 94% 43%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 239 84% 67%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

/* Keep existing custom CSS below this line */
```

**Step 6: Update main.tsx import**

Edit `apps/dashboard/src/main.tsx` - change CSS import:

```typescript
import './styles/globals.css'  // Changed from './styles/dashboard.css'
```

**Step 7: Test Tailwind is working**

```bash
cd /home/deploy/meta-chat-platform
npm run build
```

Expected: Build succeeds, no CSS errors

**Step 8: Commit Tailwind setup**

```bash
git add apps/dashboard/tailwind.config.js apps/dashboard/postcss.config.js apps/dashboard/package.json apps/dashboard/src/styles/globals.css apps/dashboard/src/main.tsx
git commit -m "feat: install and configure Tailwind CSS

- Add Tailwind CSS 3.4+ with PostCSS
- Configure content paths for React components
- Set up CSS variables for theme system
- Add base layer with light/dark mode variables
- Rename dashboard.css to globals.css
- Add Tailwind directives to globals.css"
```

---

## Task 2: Install and Configure shadcn/ui

**Files:**
- Create: `apps/dashboard/components.json`
- Create: `apps/dashboard/src/lib/utils.ts`
- Modify: `apps/dashboard/package.json`
- Modify: `apps/dashboard/tsconfig.json`
- Create: `apps/dashboard/src/components/ui/` directory

**Step 1: Install shadcn/ui dependencies**

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npm install class-variance-authority clsx tailwind-merge
npm install -D @types/node
```

**Step 2: Create components.json configuration**

Create `apps/dashboard/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Step 3: Update tsconfig.json with path aliases**

Edit `apps/dashboard/tsconfig.json` - add to `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Step 4: Create utils helper**

Create `apps/dashboard/src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 5: Create ui components directory**

```bash
mkdir -p /home/deploy/meta-chat-platform/apps/dashboard/src/components/ui
```

**Step 6: Install Button component**

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npx shadcn-ui@latest add button
```

Expected: Button component added to `src/components/ui/button.tsx`

**Step 7: Install Input component**

```bash
npx shadcn-ui@latest add input
```

Expected: Input component added to `src/components/ui/input.tsx`

**Step 8: Install Card component**

```bash
npx shadcn-ui@latest add card
```

Expected: Card component added to `src/components/ui/card.tsx`

**Step 9: Install Badge component**

```bash
npx shadcn-ui@latest add badge
```

Expected: Badge component added to `src/components/ui/badge.tsx`

**Step 10: Test components are importable**

Create temporary test file `apps/dashboard/src/test-shadcn.tsx`:

```typescript
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function TestShadcn() {
  return (
    <Card className="p-4">
      <Badge>Test</Badge>
      <Input placeholder="Test input" />
      <Button>Test Button</Button>
    </Card>
  )
}
```

**Step 11: Build to verify no errors**

```bash
cd /home/deploy/meta-chat-platform
npm run build
```

Expected: Build succeeds

**Step 12: Remove test file**

```bash
rm /home/deploy/meta-chat-platform/apps/dashboard/src/test-shadcn.tsx
```

**Step 13: Commit shadcn/ui setup**

```bash
git add apps/dashboard/components.json apps/dashboard/tsconfig.json apps/dashboard/src/lib/utils.ts apps/dashboard/src/components/ui/ apps/dashboard/package.json
git commit -m "feat: install and configure shadcn/ui

- Add shadcn/ui with Button, Input, Card, Badge components
- Configure component paths and aliases
- Add cn() utility for class merging
- Set up components.json for shadcn CLI"
```

---

## Task 3: Set Up Theme Toggle

**Files:**
- Create: `apps/dashboard/src/components/shared/ThemeToggle.tsx`
- Create: `apps/dashboard/src/hooks/useTheme.ts`
- Modify: `apps/dashboard/src/components/DashboardLayout.tsx`

**Step 1: Create useTheme hook**

Create `apps/dashboard/src/hooks/useTheme.ts`:

```typescript
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) return stored

    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }

    return 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return { theme, toggleTheme, setTheme }
}
```

**Step 2: Install lucide-react for icons**

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npm install lucide-react
```

**Step 3: Create ThemeToggle component**

Create `apps/dashboard/src/components/shared/ThemeToggle.tsx`:

```typescript
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  )
}
```

**Step 4: Add ThemeToggle to DashboardLayout**

Edit `apps/dashboard/src/components/DashboardLayout.tsx` - add theme toggle to header:

```typescript
import { ThemeToggle } from './shared/ThemeToggle'

// In the dashboard-brand div or header area, add:
<div className="dashboard-header flex items-center justify-between p-4">
  <div className="dashboard-brand">
    <span className="dot" /> {brandName}
  </div>
  <ThemeToggle />
</div>
```

**Step 5: Test theme toggle**

```bash
cd /home/deploy/meta-chat-platform
npm run build
npm run dev
```

Open browser, verify:
1. Theme toggle button appears in header
2. Clicking toggles between light/dark mode
3. Theme persists on page reload

**Step 6: Commit theme toggle**

```bash
git add apps/dashboard/src/hooks/useTheme.ts apps/dashboard/src/components/shared/ThemeToggle.tsx apps/dashboard/src/components/DashboardLayout.tsx apps/dashboard/package.json
git commit -m "feat: add theme toggle with light/dark mode

- Create useTheme hook with localStorage persistence
- Add ThemeToggle component with sun/moon icons
- Integrate theme toggle into dashboard header
- Respect system preference on first load"
```

---

## Task 4: Set Up Internationalization (i18n)

**Files:**
- Create: `apps/dashboard/src/lib/i18n/index.ts`
- Create: `apps/dashboard/src/lib/i18n/locales/en.json`
- Create: `apps/dashboard/src/lib/i18n/locales/hr.json`
- Create: `apps/dashboard/src/lib/i18n/locales/de.json`
- Create: `apps/dashboard/src/components/shared/LanguagePicker.tsx`
- Modify: `apps/dashboard/src/main.tsx`
- Modify: `apps/dashboard/src/components/DashboardLayout.tsx`
- Modify: `apps/dashboard/package.json`

**Step 1: Install i18next dependencies**

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npm install i18next react-i18next
```

**Step 2: Create English translations**

Create `apps/dashboard/src/lib/i18n/locales/en.json`:

```json
{
  "nav": {
    "knowledgeBase": "Knowledge Base",
    "settings": "Settings",
    "test": "Test",
    "deploy": "Deploy",
    "conversations": "Conversations",
    "logout": "Log out"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "kb": {
    "title": "Knowledge Base",
    "subtitle": "Your chatbot uses this to answer questions",
    "upload": "Upload",
    "write": "Write",
    "noDocuments": "No documents yet",
    "uploadFirst": "Upload your first document"
  },
  "settings": {
    "title": "Settings",
    "subtitle": "Configure how your chatbot behaves and responds to visitors",
    "botIdentity": "Bot Identity",
    "botName": "Bot Name",
    "welcomeMessage": "Welcome Message",
    "botInstructions": "Bot Instructions",
    "saveChanges": "Save Changes",
    "unsaved": "No unsaved changes"
  },
  "test": {
    "title": "Test Your Chatbot",
    "subtitle": "Have a conversation with your chatbot to see how it responds to questions",
    "startConversation": "Start a conversation",
    "typeMessage": "Type a message below to test how your chatbot responds",
    "send": "Send",
    "newConversation": "Start New Conversation"
  }
}
```

**Step 3: Create Croatian translations (placeholder)**

Create `apps/dashboard/src/lib/i18n/locales/hr.json`:

```json
{
  "nav": {
    "knowledgeBase": "Baza znanja",
    "settings": "Postavke",
    "test": "Test",
    "deploy": "Objavi",
    "conversations": "Razgovori",
    "logout": "Odjava"
  },
  "common": {
    "save": "Spremi",
    "cancel": "Odustani",
    "delete": "Obriši",
    "loading": "Učitavanje...",
    "error": "Greška",
    "success": "Uspjeh"
  }
}
```

**Step 4: Create German translations (placeholder)**

Create `apps/dashboard/src/lib/i18n/locales/de.json`:

```json
{
  "nav": {
    "knowledgeBase": "Wissensdatenbank",
    "settings": "Einstellungen",
    "test": "Test",
    "deploy": "Bereitstellen",
    "conversations": "Gespräche",
    "logout": "Abmelden"
  },
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "loading": "Wird geladen...",
    "error": "Fehler",
    "success": "Erfolg"
  }
}
```

**Step 5: Create i18n configuration**

Create `apps/dashboard/src/lib/i18n/index.ts`:

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import hr from './locales/hr.json'
import de from './locales/de.json'

const resources = {
  en: { translation: en },
  hr: { translation: hr },
  de: { translation: de },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
```

**Step 6: Initialize i18n in main.tsx**

Edit `apps/dashboard/src/main.tsx` - add import before rendering:

```typescript
import './lib/i18n'  // Add this line
```

**Step 7: Install flag icons package**

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npm install country-flag-icons
```

**Step 8: Create LanguagePicker component**

Create `apps/dashboard/src/components/shared/LanguagePicker.tsx`:

```typescript
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GB, HR, DE } from 'country-flag-icons/react/3x2'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const languages = [
  { code: 'en', name: 'English', Flag: GB },
  { code: 'hr', name: 'Hrvatski', Flag: HR },
  { code: 'de', name: 'Deutsch', Flag: DE },
]

export function LanguagePicker() {
  const { i18n } = useTranslation()
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('language', code)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Select language">
          <currentLang.Flag className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map(({ code, name, Flag }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => changeLanguage(code)}
            className="flex items-center gap-2"
          >
            <Flag className="h-4 w-4" />
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 9: Install dropdown-menu component**

```bash
cd /home/deploy/meta-chat-platform/apps/dashboard
npx shadcn-ui@latest add dropdown-menu
```

**Step 10: Add LanguagePicker to header**

Edit `apps/dashboard/src/components/DashboardLayout.tsx`:

```typescript
import { LanguagePicker } from './shared/LanguagePicker'

// In header, next to ThemeToggle:
<div className="flex items-center gap-2">
  <LanguagePicker />
  <ThemeToggle />
</div>
```

**Step 11: Update navigation to use translations**

Edit `apps/dashboard/src/components/DashboardLayout.tsx`:

```typescript
import { useTranslation } from 'react-i18next'

export function DashboardLayout() {
  const { t } = useTranslation()

  // Update nav links:
  const CLIENT_NAV_LINKS: NavLink[] = [
    { to: '/knowledge-base', label: t('nav.knowledgeBase'), icon: '📚' },
    { to: '/settings', label: t('nav.settings'), icon: '⚙️' },
    { to: '/test', label: t('nav.test'), icon: '🧪' },
    { to: '/deploy', label: t('nav.deploy'), icon: '🚀' },
    { to: '/conversations', label: t('nav.conversations'), icon: '💬' },
  ]

  // Update logout button:
  <button className="logout" onClick={logout} type="button">
    {t('nav.logout')}
  </button>
}
```

**Step 12: Test i18n**

```bash
cd /home/deploy/meta-chat-platform
npm run build
npm run dev
```

Verify:
1. Language picker appears in header
2. Switching language changes navigation labels
3. Language persists on reload

**Step 13: Commit i18n setup**

```bash
git add apps/dashboard/src/lib/i18n/ apps/dashboard/src/components/shared/LanguagePicker.tsx apps/dashboard/src/main.tsx apps/dashboard/src/components/DashboardLayout.tsx apps/dashboard/package.json apps/dashboard/src/components/ui/dropdown-menu.tsx
git commit -m "feat: add internationalization with EN/HR/DE support

- Set up react-i18next with language switching
- Add English translations for all UI text
- Add Croatian and German translation placeholders
- Create LanguagePicker with flag icons
- Update navigation to use translation keys
- Persist language preference in localStorage"
```

---

## Task 5: Create Responsive Navigation Shell

**Files:**
- Modify: `apps/dashboard/src/components/DashboardLayout.tsx`
- Modify: `apps/dashboard/src/styles/globals.css`
- Create: `apps/dashboard/src/components/shared/MobileNav.tsx`
- Create: `apps/dashboard/src/components/shared/DesktopSidebar.tsx`

**Step 1: Extract DesktopSidebar component**

Create `apps/dashboard/src/components/shared/DesktopSidebar.tsx`:

```typescript
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../routes/AuthProvider'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface NavLink {
  to: string
  label: string
  icon?: string
}

const CLIENT_NAV_LINKS: NavLink[] = [
  { to: '/knowledge-base', label: 'nav.knowledgeBase', icon: '📚' },
  { to: '/settings', label: 'nav.settings', icon: '⚙️' },
  { to: '/test', label: 'nav.test', icon: '🧪' },
  { to: '/deploy', label: 'nav.deploy', icon: '🚀' },
  { to: '/conversations', label: 'nav.conversations', icon: '💬' },
]

export function DesktopSidebar() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const location = useLocation()

  return (
    <aside className="hidden md:flex w-60 flex-col border-r bg-card">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-semibold text-lg">Meta Chat</span>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {CLIENT_NAV_LINKS.map((link) => {
            const active = location.pathname.startsWith(link.to)
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {link.icon && <span className="text-lg">{link.icon}</span>}
                  <span>{t(link.label)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={logout}
        >
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  )
}
```

**Step 2: Create MobileNav component**

Create `apps/dashboard/src/components/shared/MobileNav.tsx`:

```typescript
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface NavLink {
  to: string
  label: string
  icon: string
}

const CLIENT_NAV_LINKS: NavLink[] = [
  { to: '/knowledge-base', label: 'nav.knowledgeBase', icon: '📚' },
  { to: '/settings', label: 'nav.settings', icon: '⚙️' },
  { to: '/test', label: 'nav.test', icon: '🧪' },
  { to: '/deploy', label: 'nav.deploy', icon: '🚀' },
  { to: '/conversations', label: 'nav.conversations', icon: '💬' },
]

export function MobileNav() {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card z-50 pb-safe">
      <ul className="flex items-center justify-around h-16">
        {CLIENT_NAV_LINKS.map((link) => {
          const active = location.pathname.startsWith(link.to)
          return (
            <li key={link.to} className="flex-1">
              <Link
                to={link.to}
                className={cn(
                  "flex flex-col items-center justify-center h-full gap-1 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
                aria-label={t(link.label)}
              >
                <span className="text-2xl">{link.icon}</span>
                {active && (
                  <div className="w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

**Step 3: Update DashboardLayout to use new components**

Edit `apps/dashboard/src/components/DashboardLayout.tsx`:

```typescript
import { Outlet } from 'react-router-dom'
import { DesktopSidebar } from './shared/DesktopSidebar'
import { MobileNav } from './shared/MobileNav'
import { ThemeToggle } from './shared/ThemeToggle'
import { LanguagePicker } from './shared/LanguagePicker'

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-semibold">Meta Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguagePicker />
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex items-center justify-end gap-2 p-4 border-b bg-card">
          <LanguagePicker />
          <ThemeToggle />
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0 bg-background">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
```

**Step 4: Add mobile-specific styles to globals.css**

Append to `apps/dashboard/src/styles/globals.css`:

```css
/* Mobile safe area padding */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Ensure mobile nav doesn't overlap content */
@media (max-width: 768px) {
  main {
    padding-bottom: 4rem; /* 64px for nav bar */
  }
}
```

**Step 5: Remove old dashboard CSS**

Edit `apps/dashboard/src/styles/globals.css` - remove old dashboard-specific styles (keep Tailwind directives and CSS variables):

- Remove `.dashboard-shell`, `.dashboard-sidebar`, `.dashboard-content` styles
- Remove old navigation styles
- Keep only Tailwind directives, CSS variables, and new mobile styles

**Step 6: Test responsive navigation**

```bash
cd /home/deploy/meta-chat-platform
npm run build
npm run dev
```

Test:
1. Desktop (>768px): Sidebar visible on left, nav items with labels
2. Mobile (<768px): Bottom nav with icons only, no labels
3. Active states work on both
4. No horizontal scroll
5. Theme toggle and language picker in header

**Step 7: Test mobile viewport**

Use browser DevTools:
- iPhone 12 Pro (390×844): All 5 nav items visible, evenly spaced
- iPad (768×1024): Sidebar shows (desktop mode)
- Tap targets feel comfortable (minimum 44px)

**Step 8: Commit responsive navigation**

```bash
git add apps/dashboard/src/components/shared/DesktopSidebar.tsx apps/dashboard/src/components/shared/MobileNav.tsx apps/dashboard/src/components/DashboardLayout.tsx apps/dashboard/src/styles/globals.css
git commit -m "feat: create responsive navigation shell

- Extract DesktopSidebar with vertical nav for >768px
- Create MobileNav with bottom tab bar for <768px
- Mobile shows icons only, desktop shows icons + labels
- Add safe area padding for notched phones
- Update DashboardLayout with responsive headers
- Remove old CSS, use Tailwind utilities
- All 5 nav items visible on mobile, no horizontal scroll"
```

---

## Verification & Next Steps

**Phase 1 Complete! Verify everything works:**

1. **Tailwind CSS**:
   - Build succeeds without CSS errors
   - Utility classes work in components

2. **shadcn/ui**:
   - Button, Input, Card, Badge components available
   - Components render correctly
   - No import errors

3. **Theme Toggle**:
   - Light/dark mode switches
   - Persists on reload
   - Respects system preference

4. **i18n**:
   - Language picker shows EN/HR/DE
   - Switching languages updates UI
   - Translations persist on reload

5. **Responsive Navigation**:
   - Desktop: Sidebar with labels visible
   - Mobile: Bottom nav with icons only
   - Active states work
   - No horizontal scroll
   - All 5 items accessible

**Final verification commands:**

```bash
cd /home/deploy/meta-chat-platform
npm run build
npm run dev
```

Test in browser:
- Resize window to test responsive breakpoints
- Toggle theme and language
- Navigate between all 5 pages
- Verify no console errors

**Push to remote:**

```bash
git push origin master
```

**Next Phase:** Phase 2 - Page Redesigns (Knowledge Base, Settings, Test Chat, Deploy, Conversations)

Use **@superpowers:subagent-driven-development** or **@superpowers:executing-plans** to continue with Phase 2.
