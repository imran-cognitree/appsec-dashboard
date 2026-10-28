import { useState, useEffect, lazy, Suspense } from 'react';
import { Shield, LayoutDashboard, SquareTerminal, Zap, List, Cable, LogOut } from 'lucide-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useDashboardStore } from './store/dashboardStore';
import { VulnerabilityOverview } from './components/dashboard/VulnerabilityOverview';
import { FindingsList } from './components/dashboard/FindingsList';
import { LoginPage } from './pages/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';
import { isLoggedIn, clearToken, isAdmin } from './lib/api';
import type { ScanType, Severity } from './store/types';
import './styles/index.css';
import './App.css';

const AdminView = lazy(() =>
  import('./pages/AdminView').then((m) => ({ default: m.AdminView }))
);

type View = 'overview' | ScanType | 'all' | 'admin';

function AppContent() {

  const setSeverityFilter = useDashboardStore((s) => s.setSeverityFilter);
  const [activeView, setActiveView] = useState<View>('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(isLoggedIn());
  const [isAdminUser, setIsAdminUser] = useState(isAdmin());

  useEffect(() => {
    setIsAuthenticated(isLoggedIn());
    setIsAdminUser(isAdmin());
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setIsAdminUser(isAdmin());
  };

  const handleLogout = () => {
    clearToken();
    setIsAuthenticated(false);
    setIsAdminUser(false);
    setActiveView('overview');
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  /**
   * Navigate to the findings view for a given scan type ('all' shows every finding).
   * Optionally pre-apply a severity filter (e.g. when clicking a metric number).
   */
  const handleViewFindings = (type: ScanType | 'all', severity?: Severity) => {
    setSeverityFilter(severity ?? 'all');
    setActiveView(type);
  };

  const handleBack = () => {
    setSeverityFilter('all');
    setActiveView('overview');
  };

  const handleAdminView = () => {
    setActiveView('admin');
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar__brand">
          <Shield size={22} className="sidebar__brand-icon" />
          <div>
            <span className="sidebar__brand-name">Cognitree</span>
            <span className="sidebar__brand-category">APPSEC</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {isAdminUser && (
            <button
              className={`sidebar__nav-item ${activeView === 'admin' ? 'sidebar__nav-item--active' : ''}`}
              onClick={handleAdminView}
              id="nav-admin"
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>
          )}
          <button
            className={`sidebar__nav-item ${activeView === 'overview' ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => handleBack()}
            id="nav-dashboard"
          >
            <LayoutDashboard size={16} />
            <span>Dashboardddd</span>
          </button>
          <button
            className={`sidebar__nav-item ${activeView === 'all' ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => handleViewFindings('all')}
            id="nav-all-findings"
          >
            <List size={16} />
            <span>All Findings</span>
          </button>
          <button
            className={`sidebar__nav-item ${activeView === 'SCA' ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => handleViewFindings('SCA')}
            id="nav-sca"
          >
            <Cable size={16} />
            <span>SCA</span>
          </button>
          <button
            className={`sidebar__nav-item ${activeView === 'SAST' ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => handleViewFindings('SAST')}
            id="nav-sast"
          >
            <SquareTerminal size={16} />
            <span>SAST</span>
          </button>
          <button
            className={`sidebar__nav-item ${activeView === 'DAST' ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => handleViewFindings('DAST')}
            id="nav-dast"
          >
            <Zap size={16} />
            <span>DAST</span>
          </button>
        </nav>

        {/* Breadcrumb & Logout */}
        <div className="sidebar__breadcrumb">
          <span>/</span>
          <span>
            {activeView === 'overview'
              ? 'Vulnerability Overview'
              : activeView === 'all'
                ? 'All Findings'
                : activeView === 'admin'
                  ? 'Admin Control Panel'
                  : `Vulnerability Findings — ${activeView}`}
          </span>
        </div>

        {/* Logout button at bottom */}
        <button
          className="sidebar__logout"
          onClick={handleLogout}
          id="logout-btn"
          title="Sign out and return to login"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main content */}
      <main className="main" id="main-content">
        <div className="main__inner">
          {activeView === 'overview' ? (
            <VulnerabilityOverview onViewFindings={handleViewFindings} />
          ) : activeView === 'admin' ? (
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>Loading Admin Control Panel…</div>}>
              <AdminView />
            </Suspense>
          ) : (
            <FindingsList scanType={activeView} onBack={handleBack} isAdmin={isAdminUser} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
