'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  console.log("🔒 Dashboard Layout:", { user: user?.email, isLoading, authChecked });

  useEffect(() => {
    // Only check once when loading completes
    if (!isLoading && !authChecked) {
      setAuthChecked(true);
      console.log("✅ Dashboard Layout: Auth check complete", { 
        hasUser: !!user, 
        userEmail: user?.email 
      });
      // Middleware handles redirects - we just need to verify user exists
      if (!user) {
        console.log("❌ Dashboard Layout: No authenticated user found");
      }
    }
  }, [isLoading, authChecked, user]);

  // Show loading spinner during initial load or when auth is being checked
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bamboo-light p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-backpack-orange rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If auth check is complete and no user, show a brief loading state before redirect
  if (!user && authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bamboo-light p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-backpack-orange rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If we don't have a user and haven't checked auth yet, show loading
  if (!user && !authChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bamboo-light p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-backpack-orange rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
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
                  src="/images/po/emotions/happy.png" 
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
                className={`px-3 py-2 text-gray-700 hover:text-backpack-orange transition-colors ${
                  pathname === '/trips' ? 'text-backpack-orange font-medium' : ''
                }`}
              >
                My Trips
              </Link>
              
              {/* Enhanced Account Menu with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    if (pathname === '/account') {
                      // If already on account page, toggle dropdown or navigate back to trips
                      if (accountDropdownOpen) {
                        setAccountDropdownOpen(false);
                        router.push('/trips');
                      } else {
                        setAccountDropdownOpen(true);
                      }
                    } else {
                      // If not on account page, navigate there and open dropdown
                      router.push('/account');
                      setAccountDropdownOpen(true);
                    }
                  }}
                  className={`px-3 py-2 text-gray-700 hover:text-backpack-orange transition-colors flex items-center ${
                    pathname === '/account' ? 'text-backpack-orange font-medium' : ''
                  }`}
                  type="button"
                >
                  Account
                  <svg 
                    className={`ml-1 h-4 w-4 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Account Dropdown */}
                {accountDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setAccountDropdownOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <Link
                      href="/account/preferences"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setAccountDropdownOpen(false)}
                    >
                      Preferences
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        if (confirm('Are you sure you want to sign out?')) {
                          signOut();
                        }
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      type="button"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
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
                className={`block px-4 py-2 text-gray-700 hover:bg-gray-100 ${
                  pathname === '/trips' ? 'text-backpack-orange font-medium bg-gray-50' : ''
                }`}
                onClick={() => setMenuOpen(false)}
              >
                My Trips
              </Link>
              
              {/* Mobile Account Menu */}
              <div>
                <button
                  onClick={() => {
                    if (pathname === '/account') {
                      setAccountDropdownOpen(!accountDropdownOpen);
                    } else {
                      router.push('/account');
                      setAccountDropdownOpen(true);
                      setMenuOpen(false);
                    }
                  }}
                  className={`block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 flex items-center justify-between ${
                    pathname === '/account' ? 'text-backpack-orange font-medium bg-gray-50' : ''
                  }`}
                  type="button"
                >
                  Account
                  <svg 
                    className={`h-4 w-4 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Mobile Account Submenu */}
                {accountDropdownOpen && (
                  <div className="bg-gray-50 border-l-4 border-backpack-orange">
                    <Link
                      href="/account"
                      className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-backpack-orange"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        setMenuOpen(false);
                      }}
                    >
                      Profile Settings
                    </Link>
                    <Link
                      href="/account/preferences"
                      className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-backpack-orange"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        setMenuOpen(false);
                      }}
                    >
                      Preferences
                    </Link>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to sign out?')) {
                    signOut();
                  }
                }}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-red-600"
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
