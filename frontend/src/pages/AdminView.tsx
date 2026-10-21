import { Shield } from 'lucide-react';
import { ReportGenerator } from '../components/dashboard/ReportGenerator';
import { DataStreamDemo } from '../components/dashboard/DataStreamDemo';
import './AdminView.css';

export function AdminView() {
  return (
    <div className="admin-view">
      <div className="admin-view__content">
        <div className="admin-view__icon-box">
          <Shield size={40} className="admin-view__icon" />
        </div>
        <h1 className="admin-view__title">Admin Control Panel</h1>
        <p className="admin-view__description">
          RBAC Demo: This page is accessible only to ADMIN users.
          You can manage findings, delete vulnerabilities, and perform administrative tasks.
        </p>
        <div className="admin-view__features">
          <div className="admin-view__feature">
            <span className="admin-view__feature-badge">✓</span>
            <span>Edit findings status and severity</span>
          </div>
          <div className="admin-view__feature">
            <span className="admin-view__feature-badge">✓</span>
            <span>Delete vulnerable findings</span>
          </div>
          <div className="admin-view__feature">
            <span className="admin-view__feature-badge">✓</span>
            <span>View and manage all projects</span>
          </div>
          <div className="admin-view__feature">
            <span className="admin-view__feature-badge">✓</span>
            <span>Access audit logs</span>
          </div>
        </div>

        {/* ── Report Generation Section (SSE Demo) ── */}
        <div className="admin-view__divider" />
        <div className="admin-view__section-label">Server-Sent Events</div>
        <ReportGenerator />

        {/* ── Dataset Streaming Section (HTTP Chunked Stream Demo) ── */}
        <div className="admin-view__divider" />
        <div className="admin-view__section-label">Streaming Response</div>
        <DataStreamDemo />
      </div>
    </div>
  );
}
