/**
 * useAuth Custom Hook
 * Provides easy access to authentication state and methods
 * Handles user session, login, logout, and auth state management
 */

import { useEffect, useState } from 'react';
import * as authService from '../services/authService';
import type { UserProfile } from '../types';

// Interface for auth state
interface AuthState {
  // Whether user is authenticated
  isAuthenticated: boolean;
  
  // Current user ID
  userId: string | null;
  
  // Current user profile
  userProfile: UserProfile | null;
  
  // Loading state during auth operations
  isLoading: boolean;
  
  // Error message if auth operation failed
  error: string | null;
}

/**
 * useAuth Hook
 * Provides authentication state and methods throughout the app
 * @returns Auth state and methods
 */
export function useAuth() {
  // State management
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    userProfile: null,
    isLoading: true,
    error: null,
  });

  /**
   * Initialize auth state on component mount
   * Checks if user is already authenticated
   */
  useEffect(() => {
    // Initialize authentication
    const initializeAuth = async () => {
      try {
        // Get current user
        const user = await authService.getCurrentUser();

        if (user) {
          // User is authenticated, fetch their profile
          const profile = await authService.getUserProfile(user.id);

          setAuthState({
            isAuthenticated: true,
            userId: user.id,
            userProfile: profile,
            isLoading: false,
            error: null,
          });
        } else {
          // User is not authenticated
          setAuthState({
            isAuthenticated: false,
            userId: null,
            userProfile: null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        // Silently fail initialization - this is expected when user isn't logged in
        // Don't show error to user, just proceed to login page
        console.debug('Auth initialization check:', error);
        setAuthState({
          isAuthenticated: false,
          userId: null,
          userProfile: null,
          isLoading: false,
          error: null,
        });
      }
    };

    // Call initialize function
    initializeAuth();

    // Subscribe to auth state changes
    const unsubscribe = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User just signed in
        const user = session.user;
        authService
          .getUserProfile(user.id)
          .then((profile) => {
            setAuthState({
              isAuthenticated: true,
              userId: user.id,
              userProfile: profile,
              isLoading: false,
              error: null,
            });
          });
      } else if (event === 'SIGNED_OUT') {
        // User just signed out
        setAuthState({
          isAuthenticated: false,
          userId: null,
          userProfile: null,
          isLoading: false,
          error: null,
        });
      }
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /**
   * Sign in user with email and password
   * @param email - User email
   * @param password - User password
   */
  const login = async (email: string, password: string) => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Call sign in service
      const session = await authService.signIn(email, password);

      if (session.user) {
        // Fetch user profile
        const profile = await authService.getUserProfile(session.user.id);

        setAuthState({
          isAuthenticated: true,
          userId: session.user.id,
          userProfile: profile,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to sign in',
      }));
      throw error;
    }
  };

  /**
   * Sign out current user
   */
  const logout = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Call sign out service
      await authService.signOut();

      // Clear auth state
      setAuthState({
        isAuthenticated: false,
        userId: null,
        userProfile: null,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to sign out',
      }));
      throw error;
    }
  };

  /**
   * Check if user has specific role
   * @param role - Role to check for
   * @returns True if user has the role
   */
  const hasRole = async (role: UserProfile['role']): Promise<boolean> => {
    if (!authState.userId) return false;
    return authService.hasRole(authState.userId, role);
  };

  // Return auth state and methods
  return {
    ...authState,
    login,
    logout,
    hasRole,
  };
}
