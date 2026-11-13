## Server-Sent Events (NEW)
1. We click the Generate Report button, and the below hook gets invoked
    - [useGenerateReport hook](/frontend/src/hooks/useReports.ts)
2. Keeps the taskId in localstorage and sets the query key with taskId and status. Which in turn invokes the below hook, which opens up the SSE connection
    - [useReportStatus hook](/frontend/src/hooks/useReports.ts)
3. After server pushes the final status, we update things accordingly and close the SSE connection.

### SSE Tests
[ReportGenerator Test](frontend/src/components/dashboard/ReportGenerator.test.tsx)

## Testing Pipeling
- Pre-commit hooks
- PR Gates
- Post-merge smoke tests

### Pre-commit Hooks
- **Tools:** Husky, Lint-staged, oxlint, Vitest.

### Workflow:
After running `git commit`
1. **Husky** intercepts the commit.
2. **Lint-staged** looks the modified files and runs **oxlint** to check for strict TypeScript/React errors.
3. If linting passes, **Vitest** runs the Unit and Integration tests (like our `rbac.test.tsx` file). 
4. If any step fails, the commit is aborted, forcing the developer to fix the issue locally.

[Pre-commit](.husky/pre-commit)  
[RBAC Test](frontend/src/rbac.test.tsx)

## PR Gates
- **Tools:** GitHub Actions, Playwright.

### Workflow:
When a developer opens a Pull Request against the `main` branch, GitHub Actions provisions an Ubuntu server.
1. It downloads the code and restores `node_modules`
2. It runs `oxlint` and `vitest` again, ensuring the developer didn't bypass the pre-commit hooks.
3. It builds the production React app (`pnpm run build`) and starts a local web server (`pnpm run preview`).
4. It runs **Playwright** End-to-End (E2E) tests.  APIs are mocked.

[GitHub Actions workflow](.github/workflows/frontend-ci.yml)  
[Playwright config](frontend/playwright.config.ts)  
[e2e](frontend/e2e)

## Post-Merge Tests (Live E2E)
**Tools:** GitHub Actions (with Services), Docker (MongoDB), FastAPI, Playwright.

### Workflow:
When code is successfully merged into `main` (or triggered manually)
1. GitHub Actions uses Docker to instantly boot a blank **MongoDB** database container.
2. It installs Python, downloads the backend dependencies, and starts the **FastAPI** backend, connecting it to the fresh MongoDB instance.
3. It builds and starts the frontend.
4. It runs Playwright, but **only** targets tests tagged with `@live` (using `--grep "@live"`).

[Workflow file](.github/workflows/full-stack-integration.yml)  
[login test](frontend/e2e/smoke.spec.ts)
