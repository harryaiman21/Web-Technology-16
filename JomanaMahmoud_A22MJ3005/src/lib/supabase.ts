import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const authOptions = {
  persistSession: true,
  detectSessionInUrl: true,
  autoRefreshToken: true,
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
};

// We assign it to a global variable to prevent double-instantiation during hot reloads
const globalForSupabase = global as unknown as { supabase: any };

export const supabase =
  globalForSupabase.supabase || createClient(supabaseUrl, supabaseAnonKey, { auth: authOptions });

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
}
