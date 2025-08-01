'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Initialize Supabase client for client components
const supabase = createClient();

import type { User as SupabaseUser } from '@supabase/supabase-js';

type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  isPhoneVerified?: boolean;
  country?: string;
};

// Helper to convert Supabase User to our User type
function convertSupabaseUser(supabaseUser: SupabaseUser): User {
  if (!supabaseUser.email) {
    throw new Error('User must have an email');
  }
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
  };
}

// Proper authentication validation function
async function validateAuthentication() {
  try {
    // 1. Check for valid session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.log('❌ No valid session found');
      return false;
    }
    
    // 2. Verify session hasn't expired
    if (session.expires_at && new Date(session.expires_at * 1000) <= new Date()) {
      console.log('❌ Session has expired');
      return false;
    }
    
    // 3. Verify user exists and is active
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ User validation failed:', userError?.message);
      return false;
    }
    
    // 4. Verify user profile exists in database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      console.log('❌ User profile not found in database');
      return false;
    }
    
    console.log('✅ Authentication validation successful');
    return { user, session, profile };
  } catch (error) {
    console.error('❌ Authentication validation failed:', error);
    return false;
  }
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ id: string }>;
  signOut: () => Promise<void>;
  updateUserPhone: (userId: string, phoneNumber: string, isVerified: boolean) => Promise<void>;
  updateUserCountry: (userId: string, country: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Add useAuth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  
  // Use a ref to track initialization status instead of state to prevent re-renders
  const isInitialized = useRef(false);
  
  // Circuit breaker configuration
  const MAX_RETRIES = 3;
  const CIRCUIT_BREAKER_TIMEOUT = 5000; // 5 seconds
  const [retryCount, setRetryCount] = useState(0);
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);
  const [lastFailureTime, setLastFailureTime] = useState(0);

  // Function to check and reset circuit breaker
  const checkCircuitBreaker = () => {
    if (circuitBreakerOpen && Date.now() - lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
      setCircuitBreakerOpen(false);
      setRetryCount(0);
      return true;
    }
    return !circuitBreakerOpen;
  };

  // Enhanced error handling with circuit breaker
  const handleAuthError = (error: Error) => {
    setAuthError(error);
    setRetryCount(prev => {
      const newCount = prev + 1;
      if (newCount >= MAX_RETRIES) {
        setCircuitBreakerOpen(true);
        setLastFailureTime(Date.now());
        console.error("Circuit breaker opened due to repeated failures:", error);
      }
      return newCount;
    });
  };

  // Unified user state update function
  const updateUserState = async (supabaseUser: SupabaseUser | null) => {
    if (!supabaseUser) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (!checkCircuitBreaker()) {
      console.warn("Circuit breaker is open, skipping user state update");
      setIsLoading(false);
      return;
    }

    let userInfo: User;
    try {
      userInfo = convertSupabaseUser(supabaseUser);
    } catch (error) {
      console.error("Invalid user data:", error);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch additional profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userInfo.id)
        .single();
      
      // If profile exists, update with profile data
      const updatedUser: User = {
        ...userInfo,
        name: profile?.name || '',
        phone: profile?.phone || '',
        isPhoneVerified: profile?.is_phone_verified || false,
        country: profile?.country || ''
      };
      
      setUser(updatedUser);
      setAuthError(null);
      setRetryCount(0);
    } catch (error) {
      console.error("Error updating user state:", error);
      // Fall back to basic user info if profile fetch fails
      setUser(userInfo);
      handleAuthError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup auth state change listener
  useEffect(() => {
    // Only setup once
    if (typeof window === 'undefined') return;
    
    let broadcastChannel: BroadcastChannel | null = null;
    let channel: any = null;

    try {
      broadcastChannel = new BroadcastChannel('auth-sync');
      channel = supabase.channel('auth-sync');

      // Listen for auth changes from Supabase
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔄 Auth state change:', event);
          
          if (event === 'SIGNED_OUT') {
            setUser(null);
            // Only handle state update, signOut function handles navigation
          } else if (event === 'SIGNED_IN' && session) {
            // Just update the user state, signIn function handles navigation
            await updateUserState(session.user);
          }
          
          // Broadcast auth state change to other tabs
          if (broadcastChannel) {
            broadcastChannel.postMessage({ event, session });
          }
        }
      );

      // Listen for auth changes from other tabs
      if (broadcastChannel) {
        broadcastChannel.onmessage = (event) => {
          if (event.data.event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event.data.event === 'SIGNED_IN' && event.data.session) {
            updateUserState(event.data.session.user);
          }
        };
      }

      return () => {
        subscription.unsubscribe();
        if (broadcastChannel) {
          broadcastChannel.close();
        }
        if (channel) {
          channel.unsubscribe();
        }
      };
    } catch (error) {
      console.error('Error setting up auth listeners:', error);
      return () => {}; // Return empty cleanup function
    }
  }, []); // Remove router dependency to prevent re-initialization

  // Initialize auth once on component mount
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitialized.current || typeof window === 'undefined') return;
    
    const initAuth = async () => {
  try {
    // Mark as initialized immediately to prevent duplicate calls
    isInitialized.current = true;
    
    // First check if we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      setUser(null);
      setIsLoading(false);
      return;
    }

    if (session?.user) {
      // ONLY update user state if we have a VALID session with expiry check
      const isSessionValid = !session.expires_at || new Date(session.expires_at * 1000) > new Date();
      if (isSessionValid) {
        console.log("✅ Valid session found, updating user state");
        await updateUserState(session.user);
      } else {
        console.log("❌ Session has expired, clearing auth state");
        setUser(null);
        setIsLoading(false);
      }
    } else {
      // NO SESSION - Do NOT try to get user, this creates false authentication
      console.log("❌ No session found - user is not authenticated");
      setUser(null);
      setIsLoading(false);
    }
  } catch (err) {
    console.error("Exception in initAuth:", err);
    setUser(null);
    setIsLoading(false);
  }
};

    initAuth();
  }, []); // Empty dependency array ensures this runs once

  const signIn = async (email: string, password: string) => {
  setIsLoading(true);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    if (data.session && data.user) {
      console.log('🔐 Sign in successful, updating user state');
      await updateUserState(data.user);
      
      // DON'T automatically redirect - let the calling component handle navigation
      console.log('✅ Authentication successful - user state updated');
      return;
    } else {
      throw new Error("No session data returned from authentication");
    }
  } catch (error: any) {
    console.error('Error signing in:', error);
    throw error;
  } finally {
    setIsLoading(false);
  }
};

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: name,
            phone: phone || ''
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('User creation failed');
      
      // Redirect to login with email confirmation message
      setTimeout(() => {
        router.push('/login?message=check_email');
      }, 500);
      
      return { id: data.user.id };
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserPhone = async (userId: string, phoneNumber: string, isVerified: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumber,
          is_phone_verified: isVerified,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Update local user state if the current user is the one being updated
      if (user && user.id === userId) {
        setUser({
          ...user,
          phone: phoneNumber,
          isPhoneVerified: isVerified
        });
      }
    } catch (error) {
      console.error('Error updating user phone:', error);
      throw error;
    }
  };
  
  const updateUserCountry = async (userId: string, country: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          country: country,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (error) throw error;
      
      // Update local user state if the current user is the one being updated
      if (user && user.id === userId) {
        setUser({
          ...user,
          country: country
        });
      }
    } catch (error) {
      console.error('Error updating user country:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      // Use window.location for consistent navigation behavior
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if sign out fails, clear user state and redirect
      setUser(null);
      window.location.href = '/login';
    } finally {
      setIsLoading(false);
    }
  };

  // Wait for client-side hydration before rendering
  const [hydrated, setHydrated] = useState(false);
  
  // Handle hydration
  useEffect(() => {
    setHydrated(true);
  }, []);
  
  // Provide consistent context value
  const value = {
    user: user,
    isLoading: !hydrated || isLoading, // Show loading until hydrated and auth ready
    signIn, 
    signUp, 
    signOut, 
    updateUserPhone, 
    updateUserCountry,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};