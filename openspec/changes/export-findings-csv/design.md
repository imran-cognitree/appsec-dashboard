# Design: Export Filtered Findings to CSV

## Context

See `proposal.md` for motivation. In [`FindingsList.tsx`](frontend/src/components/dashboard/FindingsList.tsx), vulnerability findings are retrieved in pages via `useInfiniteFindings` and filtered in memory to compute `displayedFindings`. The dashboard uses React 19, TypeScript, Vitest, Lucide React icons, and scoped CSS.

## Goals / Non-Goals

**Goals:**
- Create a pure, zero-dependency serialization module in `frontend/src/utils/csvExport.ts`.
- Adhere strictly to RFC-4180 CSV escaping rules (handling commas, double quotes, and newlines).
- Trigger immediate browser downloads using native `Blob` and `URL.createObjectURL`.
- Integrate seamlessly into the findings toolbar next to the item count indicator.

**Non-Goals:**
- Server-side streaming or API endpoints.
- Asynchronous task queuing or SSE streaming (which is handled separately by `ReportGenerator`).
- Excel binary (.xlsx) or PDF export formats.

## Decisions

### 1. Pure Client-Side Serialization
- **Choice:** Serialize `displayedFindings` directly in browser memory.
- **Rationale:** Zero network roundtrip, instantaneous download, and strictly reflects whatever search queries and filters the user currently sees.
- **Alternative Considered:** Calling a backend endpoint with filter parameters. Rejected because it introduces network latency, requires backend route changes, and cannot reflect client-only search terms.

### 2. Native Browser File Download
- **Choice:** Standard DOM anchor trigger via `URL.createObjectURL(blob)` and immediate cleanup with `URL.revokeObjectURL(url)`.
- **Rationale:** Native browser API supported universally, requiring no external file-saver dependencies.

### 3. Toolbar Placement
- **Choice:** Group the export button inside a new `.findings__actions` wrapper alongside `.findings__count`.
- **Rationale:** Keeps primary action buttons visually associated with the result count.

## Risks / Trade-offs

* **[Risk: Partially Loaded Infinite Scroll]** Users might expect non-loaded pages to be exported.
  * *Mitigation:* The button title / tooltip explicitly displays the exact count (`Export X findings to CSV`), aligning with the visible `Showing X of Y findings` label.
* **[Risk: Special characters in CVE descriptions]** Vulnerability descriptions often contain quotes, code snippets, and commas.
  * *Mitigation:* Strict RFC-4180 escaping wraps problematic fields in quotes and doubles internal quotation marks (`""`).
