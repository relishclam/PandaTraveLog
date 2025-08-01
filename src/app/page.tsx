'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MapPin, Calendar, Users, Star, ArrowRight, Plane, Camera, Map } from "lucide-react";
import UnifiedPOAssistant from '@/components/po/UnifiedPOAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Handle direct navigation using Next.js router
  const handleNavigation = useCallback((path: string) => {
    console.log('🔄 Navigation requested to:', path);
    try {
      router.push(path);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback to window.location if router fails
      window.location.href = path;
    }
  }, [router]);
  return (
    <div className="min-h-screen flex flex-col bg-bamboo-light">
      {/* PO Logo at Top */}
      <div className="w-full flex justify-center pt-10 pb-2">
        <div className="relative" style={{ width: '320px', height: '320px' }}>
          <Image
            src="/images/logo/logo-icon.png"
            alt="Meet PO the Travel Panda"
            width={320}
            height={320}
            className="w-full h-full object-contain drop-shadow-lg"
            priority
            unoptimized
          />
        </div>
      </div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-2 md:py-6 flex flex-col md:flex-row items-center justify-between">
          {/* Hero Text */}
          <div className="md:w-1/2 mb-10 md:mb-0 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-panda-black">
              Plan Your Adventure with <span className="text-backpack-orange">PO</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-gray-700">
              Your friendly travel panda helps you create perfect itineraries, discover hidden gems, and make your travel dreams come true!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Start Planning button clicked');
                  handleNavigation('/register');
                }} 
                className="inline-flex items-center justify-center rounded-md text-sm font-bold h-11 px-8 bg-backpack-orange hover:bg-backpack-orange/90 text-white cursor-pointer"
                type="button"
              >
                Start Planning
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Sign In button clicked');
                  handleNavigation('/login');
                }} 
                className="inline-flex items-center justify-center rounded-md text-sm font-medium h-11 px-8 border border-backpack-orange text-backpack-orange hover:bg-accent hover:text-accent-foreground cursor-pointer"
                type="button"
              >
                Sign In
              </button>
            </div>
          </div>
          
          {/* Hero Image - Removed to fix loading issues */}
          <div className="md:w-1/2 flex justify-center md:justify-end">
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">How PO Helps You Travel Better</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-bamboo-light p-6 rounded-xl">
              <div className="bg-backpack-orange w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Itineraries</h3>
              <p className="text-gray-700">PO creates personalized day-by-day itineraries based on your preferences and travel style.</p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-bamboo-light p-6 rounded-xl">
              <div className="bg-backpack-orange w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Discover Hidden Gems</h3>
              <p className="text-gray-700">Find amazing places that most tourists miss with PO's local knowledge and recommendations.</p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-bamboo-light p-6 rounded-xl">
              <div className="bg-backpack-orange w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Travel Together</h3>
              <p className="text-gray-700">Plan trips with friends and family, keeping everyone on the same page with shared itineraries.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-panda-black text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Plan Your Next Adventure?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">Let PO the Travel Panda help you create unforgettable travel experiences with personalized itineraries.</p>
          <button 
            onClick={(e) => {
              e.preventDefault();
              console.log('Start Planning for Free button clicked');
              handleNavigation('/register');
            }} 
            className="inline-flex items-center justify-center rounded-md text-sm font-bold h-11 px-8 bg-backpack-orange hover:bg-backpack-orange/90 text-white cursor-pointer"
            type="button"
          >
            Start Planning for Free
          </button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image
                src="/images/po/emotions/happy.png"
                alt="PO the Travel Panda"
                width={40}
                height={40}
                className="mr-2"
              />
              <span className="font-bold text-panda-black">PandaTraveLog</span>
            </div>
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} PandaTraveLog. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* GitHub Actions test: Clean environment variables configured and deleted workflow files*/}
    </div>
  );
}
