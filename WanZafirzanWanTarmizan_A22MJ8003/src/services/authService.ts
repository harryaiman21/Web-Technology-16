/**
 * Authentication Service
 * Handles user login, logout, registration, and session management
 * Uses Supabase Auth with email/password authentication
 */

import { supabase } from './supabaseClient';
import type { UserProfile } from '../types';

/**
 * Sign up a new user with email and password
 * @param email - User email address
 * @param password - User password
 * @param fullName - User's full name
 * @returns User session data
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string
) {
  try {
    // Create user account with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Send confirmation email
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // Check for errors
    if (error) throw error;

    // Create user profile in the database
    if (data.user) {
      await createUserProfile(data.user.id, email, fullName);
    }

    return data;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

/**
 * Sign in user with email and password
 * @param email - User email address
 * @param password - User password
 * @returns User session data
 */
export async function signIn(email: string, password: string) {
  try {
    // Authenticate user with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Check for errors
    if (error) throw error;

    // Return session data
    return data;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 * Clears session and removes JWT token
 */
export async function signOut() {
  try {
    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();

    // Check for errors
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get current user session
 * @returns Current user session or null if not authenticated
 */
export async function getCurrentSession() {
  try {
    // Get the current session
    const { data, error } = await supabase.auth.getSession();

    // Check for errors
    if (error) throw error;

    // Return the session
    return data.session;
  } catch (error) {
    console.error('Error getting current session:', error);
    throw error;
  }
}

/**
 * Get current authenticated user
 * @returns Current user data or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    // Get the current user
    const { data, error } = await supabase.auth.getUser();

    // Check for errors
    if (error) throw error;

    // Return the user
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    throw error;
  }
}

/**
 * Create a user profile in the database
 * Called after user signs up
 * @param userId - Supabase Auth user ID
 * @param email - User email
 * @param fullName - User's full name
 * @param role - User role (default: editor)
 */
async function createUserProfile(
  userId: string,
  email: string,
  fullName: string,
  role: UserProfile['role'] = 'editor'
) {
  try {
    // Insert user profile into database
    const { error } = await supabase
      .from('user_profiles')
      .insert([
        {
          id: userId,
          email,
          full_name: fullName,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

    // Check for errors
    if (error) throw error;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * Get user profile from database
 * @param userId - Supabase Auth user ID
 * @returns User profile data
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  try {
    // Query user profile
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Check for errors
    if (error) throw error;

    // Return user profile
    return data as UserProfile;
  } catch (error) {
    console.error(`Error getting user profile for ${userId}:`, error);
    throw error;
  }
}

/**
 * Update user password
 * @param newPassword - The new password
 * @returns Success/error response
 */
export async function updatePassword(newPassword: string) {
  try {
    // Update user password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    // Check for errors
    if (error) throw error;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

/**
 * Send password reset email
 * @param email - User email address
 */
export async function resetPassword(email: string) {
  try {
    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    // Check for errors
    if (error) throw error;
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

/**
 * Listen to authentication state changes
 * Useful for updating UI when user logs in/out
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  // Subscribe to auth state changes
  const unsubscribe = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  ).data?.subscription?.unsubscribe;

  // Return unsubscribe function
  return unsubscribe;
}

/**
 * Check if user has specific role
 * @param userId - User ID
 * @param requiredRole - Role to check for
 * @returns True if user has the role
 */
export async function hasRole(
  userId: string,
  requiredRole: UserProfile['role']
): Promise<boolean> {
  try {
    // Get user profile
    const profile = await getUserProfile(userId);

    // Check if user has the required role or is admin
    return profile.role === requiredRole || profile.role === 'admin';
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
}
