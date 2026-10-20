# Getup Management — Agency Control Panel

Internal executive control panel for digital marketing agencies managing video shoots, deliverables (videos, posters, reels), clients, finance, meetings, and team workflows.

## Technology Stack
- **Framework**: Vite + React 18 + TypeScript (strict mode, no `any`)
- **Routing**: React Router v6 with lazy-loaded routes and role guards
- **Server Data**: TanStack Query (React Query)
- **UI State**: Zustand for sidebar, command palette, and quick modal stores
- **Forms**: React Hook Form + Zod schema validation
- **Styling**: Tailwind CSS driven by CSS variable design tokens (`src/styles/tokens.css`), Radix UI accessible primitives, Lucide React icons
- **Data Display**: TanStack Table, Recharts, `date-fns`, and `Intl.NumberFormat` for INR
- **Testing**: Vitest + React Testing Library + jsdom

---

## Roles & Permissions Matrix
Access is enforced at the UI level (`usePermission`, `<Can>`) and at the route level (`RoleRoute`):
- **Super Admin (`super_admin`)**: Full agency access including finance, salaries, clients, shoots, deliverables, settings, team invites, and audit logs.
- **Admin (`admin`)**: Operations management: clients, content planning, shoots, tasks, meetings. No access to finance or settings.
- **Worker (`worker`)**: Specialized "My Work" dashboard: assigned tasks, assigned deliverables, assigned shoots, time tracking. Strictly forbidden from finance, settings, and unauthorized client data.

---

## Setup & Running Locally

### 1. Installation
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Run Typecheck & Tests
```bash
# Typecheck
npm run typecheck

# Run unit and integration tests
npm run test

# Production build validation
npm run build
```

---

## Key Routes
- `/login`: Agency authentication with one-click demo credentials for Super Admin, Admin, and Worker.
- `/dashboard`: Role-adaptive control view (Executive overview or Worker "My Work").
- `/clients`: Clients directory, package details, and Add Client slide-over drawer.
- `/clients/:id`: Client dossier with overview, content, shoots, payments, and meetings.
- `/content`: Deliverables calendar and production pipeline (videos, reels, posters).
- `/shoots`: Production shoots log, crew assignments, and costs.
- `/finance`: Invoices, payments, operating expenses, and net profit (Super Admin).
- `/meetings`: Client meeting appointments with automated 1d and 2h reminders.
- `/tasks`: Workload board and time logger.
- `/team`: Agency team directory, workload, and roles.
- `/reports`: Monthly financial and delivery summaries with PDF/CSV export.
- `/settings`: Agency profile and audit activity log.
- `/design-system`: Interactive showcase displaying every UI primitive and widget in every state.

---

## Quick Shortcuts
- **⌘K / Ctrl+K**: Open global Command Palette to search clients, navigate pages, trigger quick actions, and test roles instantly.
- **Quick Add Meeting**: Accessible on every screen in the top header.
