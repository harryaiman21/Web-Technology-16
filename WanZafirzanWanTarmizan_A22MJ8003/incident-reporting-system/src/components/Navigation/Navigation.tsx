/**
 * Navigation Component
 * Left sidebar navigation for the admin dashboard
 */

import { useNavigate } from 'react-router-dom';
import './Navigation.css';

export function Navigation() {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleViewNavigation = (view?: string) => {
    if (!view || view === 'all') {
      navigate('/incidents');
      return;
    }

    navigate(`/incidents/${view}`);
  };

  const dashboardIcon = (
    <svg className="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 11.5L12 4l9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21V12h14v9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const uploadIcon = (
    <svg className="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 21h16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const overviewIcon = (
    <svg className="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M6 4h12v16H6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 8h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 16h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );

  const draftIcon = (
    <svg className="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M7 4h7l4 4v12H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9 15h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );

  const resolvedIcon = (
    <svg className="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M6 12l4 4L18 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );

  return (
    <aside className="navigation-sidebar">
      <div className="sidebar-brand">
        <img src="/dhl-logo.png" alt="DHL logo" className="dhl-logo" />
        <div>
          <h1 className="sidebar-title">DHL Incident System</h1>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button className="sidebar-item" onClick={() => handleNavigation('/')} title="Dashboard">
          {dashboardIcon}
          <span className="sidebar-label">Dashboard</span>
        </button>

        <button className="sidebar-item" onClick={() => handleNavigation('/upload')} title="Upload Incident">
          {uploadIcon}
          <span className="sidebar-label">Upload Incident</span>
        </button>
      </nav>

      <div className="sidebar-module-group">
        <p className="sidebar-module-title">Incident Views</p>
        <button className="sidebar-item sidebar-module-item" onClick={() => handleViewNavigation('all')} title="All incidents">
          {overviewIcon}
          <span className="sidebar-module-label">Incident Overview</span>
        </button>
        <button className="sidebar-item sidebar-module-item" onClick={() => handleViewNavigation('submitted')} title="Submitted incidents">
          {overviewIcon}
          <span className="sidebar-module-label">Submitted Incidents</span>
        </button>
        <button className="sidebar-item sidebar-module-item" onClick={() => handleViewNavigation('draft')} title="Draft incidents">
          {draftIcon}
          <span className="sidebar-module-label">Draft</span>
        </button>
        <button className="sidebar-item sidebar-module-item" onClick={() => handleViewNavigation('resolved')} title="Resolved incidents">
          {resolvedIcon}
          <span className="sidebar-module-label">Resolved</span>
        </button>
      </div>
    </aside>
  );
}
