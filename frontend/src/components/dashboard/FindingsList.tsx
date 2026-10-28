import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, Loader2, ArrowUp, ArrowDown, Trash2, Pencil, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { useInfiniteFindings, useDeleteFinding, useUpdateFinding } from '../../hooks/useFindings';
import { useDashboardStore } from '../../store/dashboardStore';
import { SeverityBadge } from '../ui/SeverityBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { FilterDropdown } from '../ui/FilterDropdown';
import { SearchInput } from '../ui/SearchInput';
import { FindingDetailPanel } from './FindingDetailPanel';
import { Modal } from '../ui/Modal';
import { exportFindingsToCsv } from '../../utils/csvExport';
import type { ScanType, Finding } from '../../store/types';
import './FindingsList.css';

interface Props {
  scanType: ScanType | 'all';
  onBack: () => void;
  isAdmin?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'Open', label: 'Open' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
];

const SEVERITY_OPTIONS = [
  { value: 'all',      label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High',     label: 'High' },
  { value: 'Medium',   label: 'Medium' },
  { value: 'Low',      label: 'Low' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '10',  label: '10 rows' },
  { value: '25',  label: '25 rows' },
  { value: '50',  label: '50 rows' },
  { value: '100', label: '100 rows' },
];

const SCANNER_NAMES: Record<ScanType | 'all', string> = {
  SCA: 'Trivy + Grype',
  SAST: 'Semgrep + SonarQube',
  DAST: 'Wapiti + OWASP ZAP',
  all: 'All Scanners',
};

// ── Row skeleton ──────────────────────────────────────────────────────────────
function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <tr className="findings__row findings__row--skeleton" aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div className="skeleton skeleton--cell" />
        </td>
      ))}
    </tr>
  );
}

const STATUS_CHOICES = ['Open', 'In Progress', 'Resolved'] as const;

// ── Main component ────────────────────────────────────────────────────────────
export function FindingsList({ scanType, onBack, isAdmin = false }: Props) {
  const deleteFinding  = useDeleteFinding();
  const updateFinding  = useUpdateFinding();

  // Modal state
  const [deleteTarget, setDeleteTarget] = useState<Finding | null>(null);
  const [editTarget,   setEditTarget]   = useState<Finding | null>(null);
  const [editStatus,   setEditStatus]   = useState<string>('');

  const selectedProject  = useDashboardStore((s) => s.selectedProject);
  const selectedStatus   = useDashboardStore((s) => s.selectedStatus);
  const selectedSeverity = useDashboardStore((s) => s.selectedSeverity);
  const selectedTool     = useDashboardStore((s) => s.selectedTool);
  const searchQuery      = useDashboardStore((s) => s.searchQuery);
  const sortOrder        = useDashboardStore((s) => s.sortOrder);
  const pageSize         = useDashboardStore((s) => s.pageSize);
  const setProject       = useDashboardStore((s) => s.setProjectFilter);
  const setStatus        = useDashboardStore((s) => s.setStatusFilter);
  const setSeverity      = useDashboardStore((s) => s.setSeverityFilter);
  const setScanType      = useDashboardStore((s) => s.setScanTypeFilter);
  const setTool          = useDashboardStore((s) => s.setToolFilter);
  const setSearchQuery   = useDashboardStore((s) => s.setSearchQuery);
  const setSortOrder     = useDashboardStore((s) => s.setSortOrder);
  const setPageSize      = useDashboardStore((s) => s.setPageSize);

  // Selected finding for detail panel (stores just the id; panel fetches full detail)
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Sentinel ref for IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset scan type filter on mount / when scanType prop changes
  useEffect(() => {
    setScanType(scanType);
    setTool('all');
    setSearchQuery('');
    return () => {
      setScanType('all');
      setTool('all');
      setSearchQuery('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanType]);

  // ── Infinite query ─────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
  } = useInfiniteFindings({
    project:  selectedProject  !== 'all' ? selectedProject  : undefined,
    type:     scanType         !== 'all' ? scanType         : undefined,
    severity: selectedSeverity !== 'all' ? selectedSeverity : undefined,
    status:   selectedStatus   !== 'all' ? selectedStatus   : undefined,
    scanner:  selectedTool     !== 'all' ? selectedTool     : undefined,
    limit:    pageSize,
  });

  // Flatten all pages into one array then apply client-side search + sort
  const SEVERITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

  const allFindings: Finding[] = useMemo(() => {
    const pages = data?.pages ?? [];
    return pages.flatMap((p) => p.findings as Finding[]);
  }, [data]);

  const query = searchQuery.trim().toLowerCase();

  const displayedFindings = useMemo(() => {
    const filtered = allFindings.filter((f) => {
      if (selectedTool !== 'all' && f.scanner !== selectedTool) return false;
      if (!query) return true;
      return (
        f.id.toLowerCase().includes(query) ||
        f.vulnerability_id.toLowerCase().includes(query) ||
        f.package_name.toLowerCase().includes(query) ||
        f.vulnerability_type.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query) ||
        f.scanner.toLowerCase().includes(query)
      );
    });
    return [...filtered].sort((a, b) => {
      const diff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
      return sortOrder === 'severity-desc' ? diff : -diff;
    });
  }, [allFindings, query, selectedTool, sortOrder]);

  // Tool options derived from fetched data
  const toolOptions = useMemo(() => {
    const tools = Array.from(new Set(allFindings.map((f) => f.scanner))).sort();
    return [
      { value: 'all', label: 'All Tools' },
      ...tools.map((t) => ({ value: t, label: t })),
    ];
  }, [allFindings]);

  // Projects from first page metadata
  const metadata = data?.pages[0]?.metadata;
  const projectOptions = useMemo(() => [
    { value: 'all', label: 'All Projects' },
    ...(metadata?.projects ?? []).map((p) => ({
      value: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
    })),
  ], [metadata]);

  // Total from backend
  const totalCount = data?.pages[0]?.total ?? 0;

  // IntersectionObserver — triggers fetchNextPage
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: '200px',
      threshold: 0.1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersection]);

  const handleExportCsv = useCallback(() => {
    if (displayedFindings.length === 0) return;
    const date = new Date().toISOString().split('T')[0];
    exportFindingsToCsv(displayedFindings, `findings-${scanType}-${date}.csv`);
  }, [displayedFindings, scanType]);

  const colCount = scanType === 'all' ? (isAdmin ? 11 : 10) : (isAdmin ? 10 : 9);

  return (
    <>
      <section className="findings" aria-label={`${scanType} Vulnerability Findings`}>
        {/* Header */}
        <div className="findings__header">
          <button className="findings__back-btn" onClick={onBack} id="back-to-overview">
            <ChevronLeft size={14} />
            Back to Overview
          </button>
          <div className="findings__title-group">
            <span className="findings__scanner-pill">{scanType === 'all' ? 'ALL' : scanType} · {SCANNER_NAMES[scanType]}</span>
            <h2 className="findings__title">Vulnerability Findings — {scanType === 'all' ? 'All Types' : scanType}</h2>
          </div>
        </div>

        {/* Toolbar */}
        <div className="findings__toolbar">
          <div className="findings__filters">
            <SearchInput
              id="findings-search"
              label="Search"
              value={searchQuery}
              placeholder="Search ID, CVE, package, description…"
              onChange={setSearchQuery}
            />
            <FilterDropdown
              id="findings-project-filter"
              label="Project"
              value={selectedProject}
              options={projectOptions}
              onChange={setProject}
            />
            <FilterDropdown
              id="findings-tool-filter"
              label="Tool"
              value={selectedTool}
              options={toolOptions}
              onChange={setTool}
            />
            <FilterDropdown
              id="findings-severity-filter"
              label="Severity"
              value={selectedSeverity}
              options={SEVERITY_OPTIONS}
              onChange={setSeverity}
            />
            <FilterDropdown
              id="findings-status-filter"
              label="Status"
              value={selectedStatus}
              options={STATUS_OPTIONS}
              onChange={setStatus}
            />
            <FilterDropdown
              id="findings-page-size"
              label="Rows per Page"
              value={String(pageSize)}
              options={PAGE_SIZE_OPTIONS}
              onChange={(v) => setPageSize(Number(v))}
            />
          </div>
          <div className="findings__actions">
            <span className="findings__count">
              Showing <strong>{displayedFindings.length}</strong> of <strong>{totalCount}</strong> findings
            </span>
            <button
              id="findings-export-csv"
              type="button"
              className="findings__export-btn"
              onClick={handleExportCsv}
              disabled={displayedFindings.length === 0}
              title={displayedFindings.length === 0 ? 'No findings to export' : `Export ${displayedFindings.length} findings to CSV`}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <div className="findings__error" role="alert">
            <AlertCircle size={16} />
            <span>Failed to load findings.</span>
            <button className="findings__retry-btn" onClick={() => refetch()}>
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="findings__table-wrap">
          <table className="findings__table" aria-label="Vulnerability findings table">
            <thead>
              <tr>
                <th>
                  <span className="findings__severity-header">
                    SEVERITY
                    <button
                      className="findings__sort-toggle"
                      onClick={() => setSortOrder(sortOrder === 'severity-desc' ? 'severity-asc' : 'severity-desc')}
                      title="Toggle severity sort order"
                      aria-label={`Sort by severity, currently ${sortOrder === 'severity-desc' ? 'high to low' : 'low to high'}`}
                      id="severity-sort-toggle"
                    >
                      {sortOrder === 'severity-desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                    </button>
                  </span>
                </th>
                {scanType === 'all' && <th>CATEGORY</th>}
                <th>ID / CVE</th>
                <th>SCANNER</th>
                <th>PACKAGE</th>
                <th>VERSION</th>
                <th>FIXED IN</th>
                <th>TYPE</th>
                <th>DESCRIPTION</th>
                <th>STATUS</th>
                {isAdmin && <th>ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {/* Initial loading skeletons */}
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={colCount} />
                ))
              ) : displayedFindings.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="findings__empty">
                    {isError
                      ? 'Could not load findings. Please retry.'
                      : 'No vulnerabilities found for the selected filters.'}
                  </td>
                </tr>
              ) : (
                displayedFindings.map((finding) => (
                  <tr
                    key={finding.id}
                    className={`findings__row findings__row--${finding.severity.toLowerCase()}${selectedFindingId === finding.id ? ' findings__row--selected' : ''}`}
                    id={`finding-row-${finding.id}`}
                    onClick={() => setSelectedFindingId(finding.id)}
                    title="Click to view full details"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedFindingId(finding.id)}
                    role="button"
                    aria-pressed={selectedFindingId === finding.id}
                  >
                    <td><SeverityBadge severity={finding.severity} showDot /></td>
                    {scanType === 'all' && (
                      <td>
                        <span className={`findings__category-pill findings__category-pill--${finding.type.toLowerCase()}`}>
                          {finding.type}
                        </span>
                      </td>
                    )}
                    <td>
                      <div className="findings__id-cell">
                        <span className="findings__custom-id">{finding.id}</span>
                        <span className="findings__cve">{finding.vulnerability_id}</span>
                      </div>
                    </td>
                    <td><span className="findings__scanner-tag">{finding.scanner}</span></td>
                    <td><span className="findings__package">{finding.package_name}</span></td>
                    <td><span className="findings__version">{finding.installed_version}</span></td>
                    <td><span className="findings__fixed-version">{finding.fixed_version}</span></td>
                    <td><span className="findings__type">{finding.vulnerability_type}</span></td>
                    <td className="findings__description-cell">
                      <span className="findings__description" title={finding.description}>{finding.description}</span>
                      <span className="findings__location" title={finding.location}>{finding.location}</span>
                    </td>
                    <td><StatusBadge status={finding.status} /></td>
                    {isAdmin && (
                      <td>
                        <div className="findings__actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="findings__action-btn"
                            title="Edit status"
                            aria-label={`Edit ${finding.id}`}
                            disabled={updateFinding.isPending}
                            onClick={() => {
                              setEditTarget(finding);
                              setEditStatus(finding.status);
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="findings__action-btn findings__action-btn--danger"
                            title="Delete finding"
                            aria-label={`Delete ${finding.id}`}
                            disabled={deleteFinding.isPending}
                            onClick={() => setDeleteTarget(finding)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Invisible sentinel — triggers next page load */}
        <div ref={sentinelRef} className="findings__scroll-sentinel" aria-hidden="true" />

        {isFetchingNextPage && (
          <div className="findings__loading-more">
            <Loader2 size={18} className="findings__spinner" />
            <span>Loading more…</span>
          </div>
        )}

        {!hasNextPage && displayedFindings.length > 0 && !isLoading && (
          <div className="findings__end-of-list">
            All {totalCount} findings loaded
          </div>
        )}
      </section>

      {/* Detail panel — outside section so it can be fixed-positioned */}
      <FindingDetailPanel
        findingId={selectedFindingId}
        onClose={() => setSelectedFindingId(null)}
      />

      {/* ── Delete confirmation modal ── */}
      <Modal
        isOpen={!!deleteTarget}
        title="Delete Finding"
        onClose={() => setDeleteTarget(null)}
        actions={{
          confirm: {
            label: deleteFinding.isPending ? 'Deleting…' : 'Delete',
            variant: 'danger',
            disabled: deleteFinding.isPending,
            onClick: () => {
              if (!deleteTarget) return;
              deleteFinding.mutate(deleteTarget.id, {
                onSuccess: () => setDeleteTarget(null),
              });
            },
          },
        }}
      >
        <span className="modal__finding-id">{deleteTarget?.id}</span>
        <p>
          Are you sure you want to permanently delete{' '}
          <span className="modal__danger-text">{deleteTarget?.vulnerability_id}</span>?
          This action cannot be undone.
        </p>
      </Modal>

      {/* ── Edit status modal ── */}
      <Modal
        isOpen={!!editTarget}
        title="Update Finding Status"
        onClose={() => setEditTarget(null)}
        actions={{
          confirm: {
            label: updateFinding.isPending ? 'Saving…' : 'Save',
            variant: 'primary',
            disabled: updateFinding.isPending || editStatus === editTarget?.status,
            onClick: () => {
              if (!editTarget) return;
              updateFinding.mutate(
                { id: editTarget.id, update: { status: editStatus } },
                { onSuccess: () => setEditTarget(null) },
              );
            },
          },
        }}
      >
        <span className="modal__finding-id">{editTarget?.id}</span>
        <div className="modal__field-group">
          <label className="modal__field-label" htmlFor="edit-status-select">
            Status
          </label>
          <select
            id="edit-status-select"
            className="modal__select"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            disabled={updateFinding.isPending}
          >
            {STATUS_CHOICES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </Modal>
    </>
  );
}
