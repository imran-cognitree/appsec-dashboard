import { describe, it, expect, vi } from 'vitest';
import { escapeCsvField, generateCsvContent, exportFindingsToCsv } from './csvExport';
import type { Finding } from '../store/types';

describe('csvExport', () => {
  const sampleFinding: Finding = {
    id: 'f-1',
    project: 'Payment Gateway',
    type: 'SCA',
    vulnerability_id: 'CVE-2023-1234',
    package_name: 'axios',
    installed_version: '0.21.1',
    vulnerability_type: 'ReDoS',
    severity: 'High',
    description: 'Vulnerability in axios, causing "ReDoS" crashes.\nRequires patch.',
    fixed_version: '0.21.2',
    status: 'Open',
    scanner: 'Trivy',
    location: 'package.json:14',
    detected_at: '2026-03-01T10:00:00Z',
  };

  describe('escapeCsvField', () => {
    it('returns empty string for null or undefined', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('returns simple string as-is without quotes', () => {
      expect(escapeCsvField('Payment')).toBe('Payment');
      expect(escapeCsvField(123)).toBe('123');
    });

    it('wraps fields containing commas in double quotes', () => {
      expect(escapeCsvField('hello, world')).toBe('"hello, world"');
    });

    it('escapes internal quotes by doubling them', () => {
      expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
    });

    it('wraps fields containing newlines in quotes', () => {
      expect(escapeCsvField("line 1\nline 2")).toBe('"line 1\nline 2"');
    });
  });

  describe('generateCsvContent', () => {
    it('generates headers only when findings list is empty', () => {
      const csv = generateCsvContent([]);
      const lines = csv.split('\n');
      expect(lines.length).toBe(1);
      expect(lines[0]).toBe('ID,Project,Scan Type,Vulnerability ID,Package,Version,Severity,Status,Scanner,Location,Detected At,Description');
    });

    it('formats finding row with correct values and escaping', () => {
      const csv = generateCsvContent([sampleFinding]);
      expect(csv).toContain('ID,Project,Scan Type,Vulnerability ID,Package,Version,Severity,Status,Scanner,Location,Detected At,Description');
      expect(csv).toContain('f-1,Payment Gateway,SCA,CVE-2023-1234,axios,0.21.1,High,Open,Trivy,package.json:14,2026-03-01T10:00:00Z,"Vulnerability in axios, causing ""ReDoS"" crashes.\nRequires patch."');
    });
  });

  describe('exportFindingsToCsv', () => {
    it('creates an object URL, clicks a temporary link, and revokes URL', () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      exportFindingsToCsv([sampleFinding], 'custom-report.csv');

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });
});
