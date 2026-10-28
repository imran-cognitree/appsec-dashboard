# Proposal: Export Filtered Findings to CSV

## Why

Users triaging vulnerability findings in the dashboard frequently need to share, document, or analyze their filtered findings in spreadsheet tools or external audit records. Today, there is no direct client-side mechanism to export the currently active, searched, or filtered findings list into a CSV format. Adding this capability provides immediate, zero-latency data portability.

## What Changes

* **New CSV Export Utility**: Provide an RFC-4180 compliant utility module that maps `Finding` objects to formatted, properly escaped CSV text and triggers a browser file download.
* **FindingsList Toolbar Export Action**: Add an "Export CSV" action button with download icon to the toolbar in `FindingsList.tsx` that exports the active `displayedFindings`.
* **Disabled State**: Disable the export action with clear tooltip feedback when no findings match the current filter criteria.
* **Automated Test Suite**: Unit tests verifying header row generation, comma/quote escaping, multiline description formatting, and download link triggering.

## Capabilities

### New Capabilities
- `findings-export`: Defines requirements for serializing vulnerability findings into standard delimited formats (CSV) and delivering them as client-side downloads.

### Modified Capabilities
*(None - existing capabilities remain unchanged)*

## Impact

* **Frontend Codebase**:
  * New utility: `frontend/src/utils/csvExport.ts`
  * New tests: `frontend/src/utils/csvExport.test.ts`
  * UI Component: `frontend/src/components/dashboard/FindingsList.tsx`
  * Styles: `frontend/src/components/dashboard/FindingsList.css`
* **Dependencies**: None. Uses native browser `Blob`, `URL.createObjectURL`, and standard DOM APIs.
* **APIs / Backend**: No server changes or network calls required.
