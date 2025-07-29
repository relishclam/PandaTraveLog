'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  country?: string; // Add country of origin
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
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ id: string }>;
  signOut: () => Promise<void>;
  updateUserPhone: (userId: string, phoneNumber: string, isVerified: boolean) => Promise<void>;
  updateUserCountry: (userId: string, country: string) => Promise<void>; // Add function to update user's country
  resetPassword: (email: string) => Promise<void>; // Added resetPassword function
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
  const [mounted, setMounted] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Circuit breaker state
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);
  const [lastFailureTime, setLastFailureTime] = useState(0);
  const CIRCUIT_BREAKER_TIMEOUT = 5000; // 5 seconds

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
    setRetryCount(prev => prev + 1);
    
    if (retryCount >= MAX_RETRIES) {
      setCircuitBreakerOpen(true);
      setLastFailureTime(Date.now());
      console.error("🔌 Circuit breaker opened due to repeated failures:", error);
    }
  };

  // Track auth state changes across tabs with improved sync
  useEffect(() => {
    if (!mounted) return;

    const broadcastChannel = new BroadcastChannel('auth-sync');
    const channel = supabase.channel('auth-sync');

    // Listen for auth changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state change:", event);
        
        // Broadcast auth state change to other tabs
        broadcastChannel.postMessage({ event, session });

        if (event === 'SIGNED_OUT') {
          setUser(null);
          router.push('/login');
        } else if (event === 'SIGNED_IN' && session) {
          await updateUserState(session.user);
        }
      }
    );

    // Listen for auth changes from other tabs
    broadcastChannel.onmessage = (event) => {
      console.log("📡 Received auth sync from another tab:", event.data);
      if (event.data.event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event.data.event === 'SIGNED_IN' && event.data.session) {
        updateUserState(event.data.session.user);
      }
    };

    return () => {
      subscription.unsubscribe();
      broadcastChannel.close();
      channel.unsubscribe();
    };
  }, [mounted, router]);

  // Enhanced user state update with retries and rollback
  const updateUserStateInternal = async (supabaseUser: SupabaseUser) => {
    if (!checkCircuitBreaker()) {
      console.warn("🔌 Circuit breaker is open, skipping operation");
      return;
    }

    // Convert the Supabase user to our User type
    let user: User;
    try {
      user = convertSupabaseUser(supabaseUser);
    } catch (err) {
      console.error("❌ AuthContext: Invalid user data received:", err);
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Store previous state for rollback
    const previousUser = user;
    let retryAttempt = 0;

    try {
      while (retryAttempt < MAX_RETRIES) {
        try {
          // Optimistic update
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email!,
            name: '',
            isPhoneVerified: false
          });

          // Fetch full profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();

          if (profileError) throw profileError;

          // Update with complete profile data
          const updatedUser = {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            name: profile?.name || '',
            phone: profile?.phone || '',
            isPhoneVerified: profile?.is_phone_verified || false,
            country: profile?.country || ''
          };

          setUser(updatedUser);
          setAuthError(null);
          setRetryCount(0);
          console.log("✅ User state updated successfully:", {
            id: updatedUser.id,
            email: updatedUser.email,
            hasProfile: !!profile
          });
          
          return updatedUser;
        } catch (error) {
          retryAttempt++;
          const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
          
          console.warn(`⚠️ Retry attempt ${retryAttempt}/${MAX_RETRIES} in ${delay}ms`, error);
          
          if (retryAttempt === MAX_RETRIES) {
            throw error;
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error("❌ Failed to update user state:", error);
      // Rollback to previous state
      setUser(previousUser);
      handleAuthError(error as Error);
      return previousUser;
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserState = async (supabaseUser: SupabaseUser) => {
    if (!supabaseUser) {
      console.warn("⚠️ AuthContext: No user provided to updateUserState");
      setUser(null);
      setIsLoading(false);
      return;
    }

    let user: User;
    try {
      user = convertSupabaseUser(supabaseUser);
    } catch (error) {
      console.error("❌ AuthContext: Invalid user data:", error);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log("🔄 AuthContext: Updating user state for ID:", user.id);
      
      // Fetch additional profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("❌ AuthContext: Error fetching profile:", error);
        // Continue with basic user info even if profile fetch fails
      }

      // Combine basic user info with profile data
      const updatedUser: User = {
        ...user,
        name: profile?.name || '',
        phone: profile?.phone || '',
        isPhoneVerified: profile?.is_phone_verified || false,
        country: profile?.country || ''
      };
      
      console.log("👤 AuthContext: Setting user state:", {
        id: updatedUser.id,
        email: updatedUser.email,
        hasName: !!updatedUser.name,
        hasPhone: !!updatedUser.phone
      });
      
      setUser(updatedUser);
    } catch (err) {
      console.error("❌ AuthContext: Error in updateUserState:", err);
      setUser(null);
      throw err; // Propagate error to allow proper error handling upstream
    } finally {
      setIsLoading(false);
    }
  };

  // This ensures we're only running this code on the client side
  useEffect(() => {
    const initAuth = async () => {
      try {
        setMounted(true);
        console.log("🔄 AuthContext: Initializing auth...");

        // Get authenticated user instead of session
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error("❌ AuthContext: Error getting authenticated user:", error);
          setIsLoading(false);
          return;
        }
        
        if (authUser) {
          console.log("✅ AuthContext: Authenticated user found");
          await updateUserState(authUser);
        } else {
          console.log("ℹ️ AuthContext: No authenticated user");
          setUser(null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("❌ AuthContext: Exception in initAuth:", err);
        setUser(null);
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      console.log("🔄 AuthContext: Cleaning up auth listener...");
      // Clean up logic if needed
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("🔐 AuthContext: signIn called with email:", email);
    setIsLoading(true);
    
    try {
      console.log("📡 AuthContext: Calling Supabase auth...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("❌ AuthContext: Sign in error", error);
        throw error;
      }
      
      if (data.session) {
        const { session }: { session: any } = data;
        console.log("✅ AuthContext: Sign in successful", { 
          user: data.user?.id,
          session: !!session,
          sessionExpires: session?.expires_at
        });
        
        try {
          // Update user state and wait for it to complete
          await new Promise(async (resolve) => {
            await updateUserState(data.user);
            // Give React a chance to update the state
            setTimeout(resolve, 0);
          });
          
          // Verify the user state after update
          if (!user?.id) {
            console.error("❌ AuthContext: User state not updated properly after sign in");
            throw new Error("Failed to update user state");
          }
          
          // Log successful state update
          console.log("✅ AuthContext: User state successfully updated", { 
            userId: user.id,
            email: user.email
          });
          
          // Use Next.js router for navigation
          console.log("🔄 AuthContext: Redirecting to trips page");
          router.push('/trips');
        } catch (err) {
          console.error("❌ AuthContext: Error in sign in process:", err);
          throw err;
        }
        
        return;
      } else {
        console.error("❌ AuthContext: No session data returned");
        throw new Error("No session data returned from authentication");
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    console.log("📝 AuthContext: signUp called");
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

      if (error) {
        console.error("❌ AuthContext: SignUp error", error);
        throw error;
      }

      if (!data.user) {
        throw new Error('User creation failed');
      }

      console.log("✅ AuthContext: User created, creating profile");
      
      // With email confirmation enabled, user won't have a session immediately
      // The profile will be created via the auth callback after email confirmation
      console.log("📧 AuthContext: Email confirmation required");
      
      // Don't create profile here - it will be created in the auth callback
      // after email confirmation to avoid duplicate entries
      
      // Always redirect to login with a message about email confirmation
      console.log("📧 AuthContext: Redirecting to login with email confirmation message");
      setTimeout(() => {
        router.push('/login?message=check_email');
      }, 500);
      
      // Return the user ID for phone verification
      return { id: data.user.id };
    } catch (error: any) {
      console.error('❌ AuthContext: Error signing up:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateUserPhone = async (userId: string, phoneNumber: string, isVerified: boolean) => {
    console.log("📱 AuthContext: updateUserPhone called");
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: phoneNumber,
          is_phone_verified: isVerified,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (error) {
        console.error("❌ AuthContext: Update phone error", error);
        throw error;
      }
      
      // Update local user state if the current user is the one being updated
      if (user && user.id === userId) {
        setUser({
          ...user,
          phone: phoneNumber,
          isPhoneVerified: isVerified
        });
      }
      console.log("✅ AuthContext: Phone updated successfully");
    } catch (error) {
      console.error('❌ AuthContext: Error updating user phone:', error);
      throw error;
    }
  };
  
  const updateUserCountry = async (userId: string, country: string) => {
    console.log("🌎 AuthContext: updateUserCountry called");
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          country: country,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (error) {
        console.error("❌ AuthContext: Update country error", error);
        throw error;
      }
      
      // Update local user state if the current user is the one being updated
      if (user && user.id === userId) {
        setUser({
          ...user,
          country: country
        });
      }
      console.log("✅ AuthContext: Country updated successfully");
    } catch (error) {
      console.error('❌ AuthContext: Error updating user country:', error);
      throw error;
    }
  };

  // resetPassword function
  const resetPassword = async (email: string) => {
    console.log("🔑 AuthContext: resetPassword called");
    try {
      console.log("📧 AuthContext: Sending reset email to", email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error("❌ AuthContext: Reset password error", error);
        throw error;
      }
      console.log("✅ AuthContext: Reset email sent successfully");
    } catch (error: any) {
      console.error('❌ AuthContext: Error resetting password:', error);
      throw error;
    }
  };

  const signOut = async () => {
    console.log("🚪 AuthContext: signOut called");
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      console.log("✅ AuthContext: Signed out successfully");
      
      // Set user to null to update UI immediately
      setUser(null);
      
      // Use router to navigate to home page
      router.push('/');
    } catch (error) {
      console.error('❌ AuthContext: Error signing out:', error);
      
      // Even if sign out fails, clear user state and redirect
      setUser(null);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  // Pass the real authentication state but prevent hydration mismatches
  const value = {
    user,
    isLoading, 
    signIn, 
    signUp, 
    signOut, 
    updateUserPhone, 
    updateUserCountry,
    resetPassword
  };

  // Don't render children until client-side mount is complete
  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
