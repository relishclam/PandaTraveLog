'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import { useAuth } from '@/contexts/AuthContext';

export default function AccountPage() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('happy');
  const [pandaMessage, setPandaMessage] = useState('Here\'s your account information!');
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading account information...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log("👤 Account: No user found, redirecting to login");
      router.push('/login');
    } else if (user) {
      console.log("👤 Account: User found", { 
        email: user.email,
        hasName: !!user.name,
        hasPhone: !!user.phone
      });
    }
  }, [user, isLoading, router]);
  
  // Loading check is handled above
  
  if (!user) {
    return null; // Will redirect in the useEffect
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-backpack-orange rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">My Account</h1>
          </div>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Profile Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{user.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone Verification</p>
                    <p className={`font-medium ${user.isPhoneVerified ? 'text-green-600' : 'text-amber-600'}`}>
                      {user.isPhoneVerified ? 'Verified' : 'Not Verified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-2">Account Settings</h2>
              <div className="space-y-4">
                <Button
                  onClick={() => {
                    setPandaEmotion('thinking');
                    setPandaMessage('This feature is coming soon!');
                  }}
                  className="w-full md:w-auto bg-white hover:bg-gray-50 text-gray-800 border border-gray-300"
                >
                  Change Password
                </Button>
                
                <Button
                  onClick={() => {
                    setPandaEmotion('thinking');
                    setPandaMessage('This feature is coming soon!');
                  }}
                  className="w-full md:w-auto bg-white hover:bg-gray-50 text-gray-800 border border-gray-300"
                >
                  Update Profile
                </Button>
                
                <Button
                  onClick={() => {
                    setPandaEmotion('confused');
                    setPandaMessage('Are you sure you want to sign out?');
                    
                    if (confirm('Are you sure you want to sign out?')) {
                      console.log("🚪 Account: User confirmed sign out");
                      signOut();
                    }
                  }}
                  className="w-full md:w-auto bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-bamboo-light rounded-xl p-6 border border-backpack-orange/20">
          <div className="flex items-center mb-4">
            <Image
              src="/images/po/happy.png"
              alt="PO"
              width={40}
              height={40}
              className="mr-3"
            />
            <h2 className="text-lg font-semibold">Travel Preferences</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Set your travel preferences to get personalized recommendations from PO!
          </p>
          <Button
            onClick={() => {
              setPandaEmotion('excited');
              setPandaMessage('Setting up your travel preferences will make planning even easier!');
            }}
            className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
          >
            Set Travel Preferences
          </Button>
        </div>
      </div>
      
      <PandaAssistant
        emotion={pandaEmotion}
        message={pandaMessage}
        position="bottom-right"
        size="md"
      />
    </div>
  );
}