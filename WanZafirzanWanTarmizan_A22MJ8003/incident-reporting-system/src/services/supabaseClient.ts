/**
 * Supabase Client Configuration
 * Initializes the Supabase client with authentication and real-time capabilities
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables for Supabase connection
// These should be defined in .env.local file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Please check .env.local file'
  );
}

/**
 * Initialize Supabase client
 * - supabaseUrl: Your Supabase project URL
 * - supabaseAnonKey: Your Supabase anonymous API key
 * - persistSession: Enable session persistence in localStorage
 * - auth.autoRefreshToken: Automatically refresh expired tokens
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Configuration for authentication
  auth: {
    // Automatically refresh tokens when they expire
    autoRefreshToken: true,
    
    // Persist session data in localStorage
    persistSession: true,
    
    // Detect session changes from other tabs
    detectSessionInUrl: true,
  },
  
  // Global settings
  global: {
    // Headers to send with all requests
    headers: {
      'X-Client-Version': '1.0.0',
    },
  },
});

// Export Supabase client for use throughout the app
export default supabase;
