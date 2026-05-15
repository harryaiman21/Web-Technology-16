/**
 * App Component
 * Root component of the application
 * Handles routing, authentication context, and layout
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { AuthGuard } from './components/Auth/AuthGuard';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { UploadConsole } from './components/UploadConsole/UploadConsole';
import { Navigation } from './components/Navigation/Navigation';
import { TopBar } from './components/Navigation/TopBar';
import { IncidentListPage } from './components/Incidents/IncidentListPage';
import { IncidentReviewPage } from './components/Incidents/IncidentReviewPage';
import './styles/App.css';

/**
 * Protected Layout Component
 * Wrapper for authenticated pages with navigation
 */
interface ProtectedLayoutProps {
  children: React.ReactNode;
}

function ProtectedLayout({ children }: ProtectedLayoutProps) {
  // JSX render
  return (
    <div className="protected-layout">
      {/* Navigation bar */}
      <Navigation />

      {/* Main content */}
      <div className="protected-content">
        <TopBar />
        {children}
      </div>
    </div>
  );
}

/**
 * Unauthorized component
 * Shows when user tries to access a page without required role
 */
function Unauthorized() {
  // JSX render
  return (
    <div className="unauthorized-container">
      {/* Error heading */}
      <h1>403 - Unauthorized</h1>

      {/* Error message */}
      <p>You don't have permission to access this page.</p>

      {/* Back to dashboard link */}
      <a href="/" className="back-link">
        Back to Dashboard
      </a>
    </div>
  );
}

/**
 * Not Found component
 * Shows when user visits non-existent route
 */
function NotFound() {
  // JSX render
  return (
    <div className="not-found-container">
      {/* Error heading */}
      <h1>404 - Page Not Found</h1>

      {/* Error message */}
      <p>The page you're looking for doesn't exist.</p>

      {/* Back to home link */}
      <a href="/" className="back-link">
        Back to Dashboard
      </a>
    </div>
  );
}

/**
 * App Component
 * Main application entry point with routing
 */
function App() {
  // JSX render
  return (
    // Browser router for client-side routing
    <Router>
      {/* Auth provider wrapper */}
      <AuthProvider>
        {/* Routes configuration */}
        <Routes>
          {/* Login route - public, no authentication required */}
          <Route path="/auth/login" element={<LoginForm />} />

          {/* Dashboard route - protected, main admin dashboard */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <ProtectedLayout>
                  <AdminDashboard />
                </ProtectedLayout>
              </AuthGuard>
            }
          />

          {/* Upload route - protected, file upload page */}
          <Route
            path="/upload"
            element={
              <AuthGuard>
                <ProtectedLayout>
                  <UploadConsole />
                </ProtectedLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/incidents"
            element={
              <AuthGuard>
                <ProtectedLayout>
                  <IncidentListPage
                    view="all"
                    title="Incident Overview"
                    subtitle="All incidents in one place"
                  />
                </ProtectedLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/incidents/submitted"
            element={
              <AuthGuard>
                <ProtectedLayout>
                  <IncidentListPage
                    view="submitted"
                    title="Submitted Incidents"
                    subtitle="Incidents waiting for review or already submitted"
                  />
                </ProtectedLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/incidents/draft"
            element={
              <AuthGuard>
                <ProtectedLayout>
                  <IncidentListPage
                    view="draft"
                    title="Draft Incidents"
                    subtitle="Incidents still being prepared"
                  />
                </ProtectedLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/incidents/resolved"
            element={
              <AuthGuard>
                <ProtectedLayout>
                  <IncidentListPage
                    view="resolved"
                    title="Resolved Incidents"
                    subtitle="Closed and published incidents"
                  />
                </ProtectedLayout>
              </AuthGuard>
            }
          />

          <Route
            path="/incidents/review/:incidentId"
            element={
              <AuthGuard>
                <ProtectedLayout>
                  <IncidentReviewPage />
                </ProtectedLayout>
              </AuthGuard>
            }
          />

          {/* Unauthorized route - shown when user lacks required role */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Legacy dashboard redirect */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Catch-all route - 404 page not found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Export component as default
export default App;
