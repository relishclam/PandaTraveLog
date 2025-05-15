'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  
  const navLinks = [
    { href: '/trips', label: 'My Trips' },
    { href: '/trips/new', label: 'Create Trip' },
    { href: '/account', label: 'Account' },
  ];
  
  return (
    <div className="min-h-screen bg-bamboo-light flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/trips" className="flex items-center">
            <Image
              src="/images/po/happy.png"
              alt="PO the Travel Panda"
              width={40}
              height={40}
              className="mr-2"
            />
            <span className="font-bold text-lg text-panda-black">PandaTraveLog</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-backpack-orange ${
                  pathname === link.href ? 'text-backpack-orange' : 'text-gray-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            <Button 
              onClick={() => signOut()}
              variant="ghost"
              className="text-gray-600 hover:text-backpack-orange"
            >
              Sign Out
            </Button>
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-gray-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="container mx-auto px-4 py-2 space-y-2">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`block py-2 text-sm font-medium ${
                    pathname === link.href ? 'text-backpack-orange' : 'text-gray-600'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              <button 
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="block w-full text-left py-2 text-sm font-medium text-gray-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white py-4 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} PandaTraveLog. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
