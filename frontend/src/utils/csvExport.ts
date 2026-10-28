import type { Finding } from '../store/types';

/**
 * RFC-4180 compliant escaping for a single CSV field value.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const HEADERS = [
  'ID',
  'Project',
  'Scan Type',
  'Vulnerability ID',
  'Package',
  'Version',
  'Severity',
  'Status',
  'Scanner',
  'Location',
  'Detected At',
  'Description',
];

/**
 * Generates an RFC-4180 compliant CSV string from an array of findings.
 */
export function generateCsvContent(findings: Finding[]): string {
  const headerLine = HEADERS.map(escapeCsvField).join(',');
  const rowLines = findings.map((f) => {
    const row = [
      f.id,
      f.project,
      f.type,
      f.vulnerability_id,
      f.package_name,
      f.installed_version,
      f.severity,
      f.status,
      f.scanner,
      f.location,
      f.detected_at,
      f.description,
    ];
    return row.map(escapeCsvField).join(',');
  });

  return [headerLine, ...rowLines].join('\n');
}

/**
 * Triggers a browser download of the given findings formatted as a CSV file.
 */
export function exportFindingsToCsv(findings: Finding[], filename = 'findings.csv'): void {
  const csvContent = generateCsvContent(findings);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
