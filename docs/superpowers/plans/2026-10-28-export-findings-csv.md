# Export Filtered Findings to CSV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a client-side CSV export button on the findings list toolbar that downloads the currently filtered findings as an RFC-4180 compliant CSV file.

**Architecture:** Pure client-side data serialization. A dedicated utility module converts `Finding` objects into properly escaped CSV records and triggers a browser download via a temporary Blob URL. The `FindingsList` component consumes this utility and renders an "Export CSV" action button in its toolbar.

**Tech Stack:** React 19, TypeScript, Vitest, Lucide React (`Download` icon).

**Spec:** `docs/superpowers/specs/2026-10-28-export-findings-csv-design.md`

## Global Constraints
- Must adhere to RFC-4180 CSV escaping rules: values containing commas, quotes, or newlines must be enclosed in double quotes, and internal quotes escaped as `""`.
- Must not introduce any external npm packages; use native browser `Blob`, `URL.createObjectURL`, and `HTMLAnchorElement`.
- Must operate cleanly on empty arrays without throwing errors.
- All code changes must pass existing project linting (`oxlint`) and unit tests (`vitest`).

## Review Focus
1. Descriptions with commas and nested quotes: must be escaped so CSV columns do not misalign.
2. Multiline descriptions: newlines inside values must remain within quotes.
3. Empty finding list: clicking export when no findings match filters should safely produce a header-only CSV or be gracefully disabled.
4. Dynamic filename: filename should reflect active scan type and current date (`findings-<scanType>-<date>.csv`).
5. Cleanup: temporary object URLs must be revoked via `URL.revokeObjectURL` after triggering download.

---

### Task 1: Core CSV Generation Utility & Unit Tests (TDD)

**Files:**
- Create: `frontend/src/utils/csvExport.ts`
- Test: `frontend/src/utils/csvExport.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function escapeCsvField(value: unknown): string;
  export function generateCsvContent(findings: Finding[]): string;
  export function exportFindingsToCsv(findings: Finding[], filename?: string): void;
  ```

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/utils/csvExport.test.ts` with test cases covering:
1. Header row generation when findings list is empty.
2. Correct comma-separated values for standard finding rows.
3. Proper quote and newline escaping in text fields (e.g. descriptions with quotes and commas).
4. Calling `exportFindingsToCsv` creates a temporary anchor, triggers download, and revokes the URL.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/utils/csvExport.test.ts --run`
Expected: FAIL ("Cannot find module './csvExport'")

- [ ] **Step 3: Implement `csvExport.ts`**

Implement `frontend/src/utils/csvExport.ts`:
- Define `CSV_COLUMNS` header mapping:
  `['ID', 'Project', 'Scan Type', 'Vulnerability ID', 'Package', 'Version', 'Severity', 'Status', 'Scanner', 'Location', 'Detected At', 'Description']`
- Implement `escapeCsvField(value: unknown): string`:
  - Convert `null` / `undefined` to empty string.
  - If string contains `,`, `"`, `\n`, or `\r`, wrap in quotes and replace `"` with `""`.
- Implement `generateCsvContent(findings: Finding[]): string`.
- Implement `exportFindingsToCsv(findings: Finding[], filename?: string): void` with `Blob`, temporary `<a>` element, `click()`, and `URL.revokeObjectURL`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- src/utils/csvExport.test.ts --run`
Expected: PASS (All test assertions pass)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/csvExport.ts frontend/src/utils/csvExport.test.ts
git commit -m "feat(utils): add csvExport utility with unit tests"
```

---

### Task 2: FindingsList Toolbar Integration

**Files:**
- Modify: `frontend/src/components/dashboard/FindingsList.tsx`
- Modify: `frontend/src/components/dashboard/FindingsList.css`

**Interfaces:**
- Consumes: `exportFindingsToCsv` from `../../utils/csvExport`

- [ ] **Step 1: Add unit test verifying export button render and trigger**

Add test case in `frontend/src/components/dashboard/FindingsList.test.tsx` (or verify integration with existing component tests):
- Asserts "Export CSV" button renders in the toolbar.
- Asserts clicking "Export CSV" invokes `exportFindingsToCsv` with `displayedFindings`.

- [ ] **Step 2: Add Export CSV Button to FindingsList Toolbar**

In `frontend/src/components/dashboard/FindingsList.tsx`:
- Import `Download` icon from `lucide-react`.
- Import `exportFindingsToCsv` from `../../utils/csvExport`.
- Add an "Export CSV" button next to the search/filter controls in the toolbar:
  ```tsx
  <button
    type="button"
    className="btn btn--secondary findings__export-btn"
    onClick={() => {
      const date = new Date().toISOString().split('T')[0];
      exportFindingsToCsv(displayedFindings, `findings-${scanType}-${date}.csv`);
    }}
    disabled={displayedFindings.length === 0}
    title={displayedFindings.length === 0 ? 'No findings to export' : `Export ${displayedFindings.length} findings to CSV`}
  >
    <Download className="icon-sm" />
    <span>Export CSV</span>
  </button>
  ```

- [ ] **Step 3: Add CSS styles for the export button**

In `frontend/src/components/dashboard/FindingsList.css`:
- Add styling for `.findings__export-btn` matching the existing toolbar buttons.

- [ ] **Step 4: Run full test suite & linter**

Run: `cd frontend && npm test -- --run && npm run lint`
Expected: All tests pass, 0 lint errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/FindingsList.tsx frontend/src/components/dashboard/FindingsList.css docs/
git commit -m "feat(ui): add Export CSV button to FindingsList toolbar"
```
