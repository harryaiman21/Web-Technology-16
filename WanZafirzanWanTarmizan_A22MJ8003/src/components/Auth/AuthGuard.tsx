/**
 * AuthGuard Component
 * Protects routes by checking if user is authenticated
 * Redirects to login page if user is not authenticated
 * Shows loading state while checking authentication
 */

import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import './AuthGuard.css';

/**
 * Interface for AuthGuard props
 */
interface AuthGuardProps {
  // Child components to render if authenticated
  children: ReactNode;
  
  // Required role (optional) - only show if user has this role
  requiredRole?: 'editor' | 'reviewer' | 'admin';
}

/**
 * AuthGuard Component
 * Wraps protected routes and components
 */
export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  // Get auth state from context
  const { isAuthenticated, isLoading, userProfile } = useAuthContext();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="auth-guard-loading">
        {/* Loading container */}
        <div className="loading-spinner-container">
          {/* Spinner animation */}
          <div className="loading-spinner"></div>

          {/* Loading text */}
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is not authenticated
  if (!isAuthenticated) {
    // Redirect to login page
    return <Navigate to="/auth/login" replace />;
  }

  // Check if requiredRole is specified and user doesn't have it
  if (requiredRole && userProfile?.role !== requiredRole && userProfile?.role !== 'admin') {
    // Redirect to unauthorized page (will show 403 Forbidden)
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authenticated and authorized, render children
  return <>{children}</>;
}

// Export component as default
export default AuthGuard;
