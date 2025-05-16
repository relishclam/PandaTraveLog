'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  console.log("🔒 Dashboard Layout:", { user: user?.email, isLoading, authChecked });

  useEffect(() => {
    // Only check once when loading completes
    if (!isLoading && !authChecked) {
      setAuthChecked(true);
      
      if (!user) {
        console.log("⚠️ Dashboard: No user detected, redirecting to login");
        // Add a small delay before redirecting
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      } else {
        console.log("✅ Dashboard: User authenticated:", user.email);
      }
    }
  }, [user, isLoading, authChecked]);

  // Show loading spinner during initial load
  if (isLoading || (!user && !authChecked)) {
    return (
      <div className="flex items-center justify-center h-screen bg-bamboo-light">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-backpack-orange rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect is happening in useEffect
  if (!user) {
    return null;
  }

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