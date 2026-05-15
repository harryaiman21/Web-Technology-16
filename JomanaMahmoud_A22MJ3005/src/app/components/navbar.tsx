"use client";
import { useEffect, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';
import DHLLogo from '../images/dhl_logo.png';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase auth session error:', error.message);
          await supabase.auth.signOut();
          setUser(null);
          return;
        }
        setUser(session?.user || null);
      } catch (err) {
        console.warn('Supabase auth session failure:', err);
        setUser(null);
      }
    };
    getSession();

    // 2. Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login'; 
  };

  return (
   // Navbar.tsx
<nav className="flex items-center justify-between p-4 bg-[#FFCC00] text-black shadow-md">
  <Link href="/dashboard">
    <Image src={DHLLogo} alt="DHL Logo" width={120} height={40} className="object-contain" />
  </Link>
  
  <div className="space-x-6">
    {user ? (
      <button 
        onClick={handleLogout} 
        className="bg-black text-white px-4 py-2 rounded font-bold hover:bg-gray-800 transition"
      >
        Logout
      </button>
    ) : (
      // If user is not logged in, they are likely already on the root Login page,
      // so you don't even need to show a "Login" link here.
      <span className="font-medium">Please sign in</span>
    )}
  </div>
</nav>
  );
}