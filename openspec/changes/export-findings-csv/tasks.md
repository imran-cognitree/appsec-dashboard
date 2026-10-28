# Tasks

## 1. CSV Utility Implementation & Unit Testing

- [x] 1.1 Implement `escapeCsvField`, `generateCsvContent`, and `exportFindingsToCsv` in `frontend/src/utils/csvExport.ts`
- [x] 1.2 Write unit tests in `frontend/src/utils/csvExport.test.ts` covering header formatting, quote/newline escaping, and verify with `npm test -- src/utils/csvExport.test.ts --run`

## 2. FindingsList Toolbar Integration

- [x] 2.1 Add "Export CSV" button with `Download` icon and click handler to `frontend/src/components/dashboard/FindingsList.tsx`
- [x] 2.2 Add CSS styling for `.findings__actions` and `.findings__export-btn` in `frontend/src/components/dashboard/FindingsList.css`
- [x] 2.3 Verify the export button is disabled when `displayedFindings.length === 0` and enabled when findings are loaded

## 3. Verification

- [x] 3.1 Run complete test suite and linter (`cd frontend && npm test -- --run && npx oxlint`) to ensure clean verification

## Workflow follow-up

- Archive the change after verification via `openspec archive export-findings-csv`.
