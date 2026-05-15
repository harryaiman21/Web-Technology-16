"use client";
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const router = useRouter();

 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    // 1. Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { full_name: formData.fullName },
      },
    });

    if (error) {
      alert("Sign up error: " + error.message);
    } else {
      // 2. SUCCESS! The user is now automatically logged in (if email confirmation is off)
      // Check if session exists to be safe
      if (data.session) {
        router.push('/dashboard'); 
      } else {
        // This usually happens if you have "Email Confirmation" turned ON
        alert("Success! Please check your email to confirm your account.");
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* DHL Branding Strip */}
        <div className="h-2 bg-[#FFCC00]" />
        
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
            <p className="text-sm text-gray-500 mt-1">Access the DHL Incident Automation Portal</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-gray-700">Full Name</label>
              <input 
                type="text" 
                required 
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D40511] outline-none text-black" // Added text-black here
                placeholder="Enter your name"
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Email Address</label>
              <input 
                type="email" 
                required 
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D40511] outline-none  text-black"
                placeholder="name@dhl.com"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <input 
                type="password" 
                required 
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D40511] outline-none  text-black"
                placeholder="••••••••"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Confirm Password</label>
              <input 
                type="password" 
                required 
                className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#D40511] outline-none  text-black"
                placeholder="••••••••"
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3 mt-4 text-white bg-[#D40511] rounded-md hover:bg-red-700 transition-colors font-bold shadow-md"
            >
              Get Started
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#D40511] font-bold hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}