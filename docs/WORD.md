## State Management

We use **Zustand** to hold global UI state that needs to survive a page refresh or be shared across components without prop-drilling.

### How we use it

The dashboard store (`dashboardStore.ts`) holds filters, pagination, and the report task ID. We wrap the store with `persist` middleware so selected filters and the `reportTaskId` survive a browser reload (they're serialised to `localStorage` via `partialize`).

### Tools
- Zustand
- `zustand/middleware` → `persist`

### Files
- [dashboardStore.ts](frontend/src/store/dashboardStore.ts) — store definition, `persist` config, and `computeSeverityCounts` helper
- [FindingsList.tsx](frontend/src/components/dashboard/FindingsList.tsx) — reads filters from the store with selector functions (avoids unnecessary re-renders)
- [ReportGenerator.tsx](frontend/src/components/dashboard/ReportGenerator.tsx) — reads/writes `reportTaskId` from the store (branch: `feat/sse`)

---

## Data Fetching Patterns and Pagination

We use **TanStack Query (React Query)** for all server state. There are two pagination patterns in the app.

### How we use it

**Infinite scroll (findings list)**  
The findings table loads the first page on mount and fetches the next page whenever a sentinel `<div>` at the bottom of the table enters the viewport (`IntersectionObserver`). `useInfiniteQuery` manages the page cursor — `getNextPageParam` returns `undefined` when there are no more pages, which stops the observer from triggering further fetches.

1. Component mounts → `useInfiniteFindings` fires with `page = 1`
    - [useInfiniteFindings hook](frontend/src/hooks/useFindings.ts)
2. User scrolls to the bottom → `IntersectionObserver` fires → `fetchNextPage()`
    - [FindingsList.tsx](frontend/src/components/dashboard/FindingsList.tsx)

**Standard polling (report status)**  
When the user generates a report the backend returns a `task_id` immediately. We then poll `GET /api/reports/{taskId}` every 5 seconds using `refetchInterval`. The interval returns `false` once the status leaves `PENDING`, so polling stops on its own.

1. User clicks Generate → `useGenerateReport` mutation fires → `task_id` stored in Zustand + localStorage
    - [useGenerateReport hook](frontend/src/hooks/useReports.ts)
2. `useReportStatus` picks up the `taskId` and starts polling
    - [useReportStatus hook](frontend/src/hooks/useReports.ts)

### Tools
- TanStack Query (`useInfiniteQuery`, `useQuery`, `useMutation`)
- `IntersectionObserver` (browser API, no library needed)

### Files (branch: `feat/sse`)
- [useFindings.ts](frontend/src/hooks/useFindings.ts) — `useInfiniteFindings`, `useFindings`, `useFindingDetail`, `useDeleteFinding`, `useUpdateFinding`
- [useReports.ts](frontend/src/hooks/useReports.ts) — `useGenerateReport` (mutation), `useReportStatus` (polling query)
- [FindingsList.tsx](frontend/src/components/dashboard/FindingsList.tsx) — sentinel div + `IntersectionObserver` wiring
- [api.ts](frontend/src/lib/api.ts) — `getFindings`, `generateReport`, `getReportStatus`
- [reports_routes.py](backend/app/routes/reports_routes.py) — FastAPI background task that simulates the 30 s report job

---

## SSE and Polling

Both patterns solve the same problem — tracking a long-running background task — just differently.

### Polling (branch: `feat/async`)

The simpler approach. The client repeatedly asks the server "are you done yet?" every 5 seconds. TanStack Query's `refetchInterval` handles the timer; when the task leaves `PENDING` the interval drops to `false` and the requests stop.

**Flow:**
1. `useGenerateReport` mutation → backend returns `task_id` (202 Accepted)
    - [useGenerateReport hook](frontend/src/hooks/useReports.ts)
2. `useReportStatus` polls `GET /api/reports/{taskId}` every 5 s while `status === 'PENDING'`
    - [useReportStatus hook](frontend/src/hooks/useReports.ts)
3. Terminal status received → `refetchInterval` returns `false` → polling stops

### Files
- [useReports.ts](frontend/src/hooks/useReports.ts)
- [ReportGenerator.tsx](frontend/src/components/dashboard/ReportGenerator.tsx)
- [reports_routes.py](backend/app/routes/reports_routes.py)

### Server-Sent Events (branch: `feat/sse`)

The upgraded approach. Instead of the client asking repeatedly, the server pushes an event when the job is done. We open an `EventSource` connection; the backend streams status updates over it and closes the stream when a terminal state is reached.

The key difference from polling: the browser holds one persistent HTTP connection open — no repeated round-trips, no wasted requests while the job is still running.

**Flow:**
1. `useGenerateReport` mutation fires, `task_id` saved to Zustand store (persisted to `localStorage`)
    - [useGenerateReport hook](frontend/src/hooks/useReports.ts)
2. `useReportStatus` opens an `EventSource` to the status endpoint, which streams events
    - [useReportStatus hook](frontend/src/hooks/useReports.ts)
3. Server pushes final status → `EventSource` closes → UI updates

### Tools
- TanStack Query (`refetchInterval` for polling)
- `EventSource` browser API (for SSE)
- FastAPI `BackgroundTasks` + `StreamingResponse` (server side)

### Files (branch: `feat/sse`)
- [useReports.ts](frontend/src/hooks/useReports.ts) — both hooks live here; `useReportStatus` is the one that changed between polling and SSE
- [ReportGenerator.tsx](frontend/src/components/dashboard/ReportGenerator.tsx) — UI that drives both hooks; reads `reportTaskId` from Zustand
- [reports_routes.py](backend/app/routes/reports_routes.py) — backend endpoint; polling version uses `GET /reports/{id}`, SSE version streams from the same route
- [api.ts](frontend/src/lib/api.ts) — `generateReport` and `getReportStatus` wrappers

### SSE Tests (branch: `feat/sse`)
- [ReportGenerator.test.tsx](frontend/src/components/dashboard/ReportGenerator.test.tsx)

