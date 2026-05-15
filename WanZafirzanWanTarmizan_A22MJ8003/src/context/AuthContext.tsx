/**
 * Auth Context
 * Provides authentication state to the entire application
 * Wraps the app in a provider to make auth state available everywhere
 */

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { UserProfile } from '../types';

// Interface for auth context value
interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  userId: string | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Authentication methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: UserProfile['role']) => Promise<boolean>;
}

/**
 * Create the Auth Context
 * Default value is undefined - will be provided by AuthProvider
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * Wraps your application to provide auth context
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // Get auth state from hook
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuthContext Hook
 * Custom hook to access auth context from any component
 * @returns Auth context value
 */
export function useAuthContext() {
  // Get context
  const context = useContext(AuthContext);

  // Check if context is defined
  if (context === undefined) {
    throw new Error(
      'useAuthContext must be used within an AuthProvider. ' +
      'Make sure your component is wrapped with <AuthProvider>.'
    );
  }

  // Return context value
  return context;
}
