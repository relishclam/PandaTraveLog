'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  console.log("🔒 Dashboard Layout: Rendering", { hasUser: !!user, isLoading });
  
  // Set a timeout to prevent infinite loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.log("⏱️ Dashboard Layout: Loading timeout reached");
        if (typeof window !== 'undefined') {
          // Check if we're stuck loading
          const authState = localStorage.getItem('debug_auth_success');
          if (authState) {
            console.log("🔑 Dashboard Layout: Found auth success in localStorage, but still loading");
            // Force a reload to try to fix the state
            window.location.reload();
          }
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  // Check authentication
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("🔒 Dashboard Layout: No user, redirecting to login");
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [user, isLoading]);
  
  // Show loading only during initial auth check
  if (isLoading) {
    console.log("⏳ Dashboard Layout: Showing loading state");
    return (
      <div className="flex items-center justify-center h-screen bg-bamboo-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-backpack-orange rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Loading your adventures...</p>
        </div>
      </div>
    );
  }
  
  // If no user after loading finished, we're redirecting
  if (!user) {
    console.log("🔄 Dashboard Layout: No user after loading, returning empty for redirect");
    return null;
  }
  
  console.log("✅ Dashboard Layout: User authenticated, rendering content");
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Navbar */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/trips" className="flex items-center">
                <Image 
                  src="/images/po/happy.png" 
                  alt="PandaTraveLog" 
                  width={36} 
                  height={36}
                  className="mr-2"
                />
                <span className="font-bold text-xl text-gray-800">PandaTraveLog</span>
              </Link>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                href="/trips" 
                className="px-3 py-2 text-gray-700 hover:text-backpack-orange"
              >
                My Trips
              </Link>
              <Link 
                href="/account" 
                className="px-3 py-2 text-gray-700 hover:text-backpack-orange"
              >
                Account
              </Link>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to sign out?')) {
                    signOut();
                  }
                }}
                className="px-3 py-2 text-gray-700 hover:text-red-600"
                type="button"
              >
                Sign Out
              </button>
            </div>
            
            <div className="md:hidden">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-gray-700 focus:outline-none"
                type="button"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden py-2 pb-4 border-t">
              <Link 
                href="/trips" 
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                My Trips
              </Link>
              <Link 
                href="/account" 
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Account
              </Link>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to sign out?')) {
                    signOut();
                  }
                }}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                type="button"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>
      
      <main className="py-6">
        {children}
      </main>
    </div>
  );
}