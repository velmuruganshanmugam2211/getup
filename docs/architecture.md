# Architecture & Design Guide

## Architectural Layers
Getup Management follows a strict 4-layer dependency model:

```
[ UI Component / Page ]
         │
         ▼
[ Feature Hook (e.g. useClients, useDashboardData) ]
         │
         ▼
[ Service Repository (e.g. clientService, financeService) ]
         │
         ▼
[ Backend Adapter (Mock in Phase 1 -> Supabase in Phase 8) ]
```

### 1. Component Layer (`src/components/`, `src/features/<feature>/pages/`, `components/`)
- Components **only render** visual UI and handle user events.
- Zero direct fetching or `fetch`/`supabase` calls inside components.
- Props are strictly typed as `ComponentNameProps`.

### 2. Feature Hook Layer (`src/features/<feature>/hooks/`)
- Encapsulates TanStack Query hooks and mutations.
- Uses centralized query key factories (e.g., `clientKeys.list(filters)`).
- Derive values via `useMemo` or selectors; never duplicate remote state into local `useState`.

### 3. Service Layer (`src/services/`, `src/features/<feature>/services/`)
- Defines typed interfaces (`IClientService`, `IFinanceService`, etc.) in `src/services/types.ts`.
- Exposes clean domain methods returning resolved entities.
- Abstracted from browser storage or remote APIs.

### 4. Adapter Layer (`src/services/mock/` and `src/services/supabase/`)
- In Phase 1, mock adapters operate over realistic in-memory & localStorage data.
- In Phase 8, Supabase adapters fulfill the exact same service interfaces without changing a single line of component code.

---

## The Master Hooks Rules

1. **Rendering Isolation**: Components render only. Data fetching lives exclusively in feature hooks (`useClients()`, `useCreateClient()`) which wrap TanStack Query.
2. **Layer Awareness**: A layer knows only the layer immediately below it.
3. **Query Key Factories**: Every feature defines a query key factory (e.g., `clientKeys.list(filters)`), making cache invalidation predictable.
4. **Shared Generic Hooks**: Reusable hooks reside in `src/hooks`:
   - `useDebounce`: For search inputs and autosaving
   - `useDisclosure`: For dialogs, drawers, and popovers
   - `usePermission`: For declarative role checks
   - `useMonthRange`: For date navigation across months
   - `useLocalStorage`: For persistent local preferences
   - `useMediaQuery`: For responsive viewport changes
5. **Clean Side Effects**: `useEffect` is reserved exclusively for true external side effects (timers, event listeners, subscriptions).
6. **Judicious Memoization**: `useMemo` and `useCallback` are used where a memoized child component or intensive recalculation justifies them.
7. **Single Source for Permissions**: All role authorizations run through `usePermission(permission)` and the `<Can>` component. Never scatter string checks like `if (role === 'admin')` across UI components.
8. **Strict Types**: Every hook and form is typed end-to-end with TypeScript and Zod schemas (`z.infer<typeof schema>`). Zero `any`.
