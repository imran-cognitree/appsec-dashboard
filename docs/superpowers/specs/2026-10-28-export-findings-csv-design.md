# Export Filtered Findings to CSV - Design Document

**Date:** 2026-10-28  
**Topic:** Export Filtered Findings to CSV  
**Status:** Approved  

## 1. Intent & Why
Users reviewing vulnerability findings in the dashboard need a direct way to export their currently filtered and searched findings into a CSV format. This enables offline audit sharing, ticketing handoffs, and custom reporting without relying on external report generation pipelines.

## 2. Goals & Non-Goals
* **Goals:**
  * Clean, pure TypeScript utility `exportFindingsToCsv(findings: Finding[], filename?: string)` that formats finding records into sanitized RFC-4180 compliant CSV.
  * Robust CSV escaping for descriptions containing commas, quotes (`"` doubled to `""`), and newlines.
  * Automatic browser file download using `Blob` and temporary object URL.
  * Direct UI integration into the [`FindingsList.tsx`](frontend/src/components/dashboard/FindingsList.tsx) toolbar next to existing controls.
  * Full unit test coverage in Vitest (`csvExport.test.ts`).
* **Non-Goals:**
  * Triggering asynchronous backend report generation (already provided by `ReportGenerator`).
  * Server-side PDF or Excel conversions.

## 3. Approaches Considered
* **Approach 1 (Selected): Pure Client-Side Blob Export**
  * *How it works:* Takes the current `displayedFindings` array from the component state, generates CSV text in memory, and triggers an anchor download.
  * *Trade-offs:* Instant, zero network dependency, exactly matches what the user sees on screen. Limited to findings currently loaded into client state.
* **Approach 2: Background API Export**
  * *How it works:* Hits a backend endpoint passing current filter params to generate and stream a full CSV.
  * *Trade-offs:* Captures non-loaded pages, but requires backend changes and network roundtrip, violating the lightweight nature of this task.

## 4. Interfaces & Specifications
* **Utility Signature:**
  ```typescript
  export function generateCsvContent(findings: Finding[]): string;
  export function exportFindingsToCsv(findings: Finding[], filename?: string): void;
  ```
* **Columns Included:**
  `ID, Project, Type, Vulnerability ID, Package, Installed Version, Severity, Status, Scanner, Detected At, Description`
* **Filename Pattern:**
  `findings-<scanType>-<YYYY-MM-DD>.csv` (defaults to `findings-all-<date>.csv`)
* **UI Placement:**
  Toolbar in `FindingsList.tsx`, alongside the item count and status/severity filters.
