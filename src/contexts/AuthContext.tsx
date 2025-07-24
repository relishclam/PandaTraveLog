'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Initialize Supabase client for client components
const supabase = createClientComponentClient();

type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  isPhoneVerified?: boolean;
  country?: string; // Add country of origin
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // This flag helps us avoid hydration mismatches
  const [mounted, setMounted] = useState(false);

  // Helper function to update user state from Supabase user
  const updateUserState = async (supabaseUser: any) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      name: profile?.name || '',
      phone: profile?.phone || '',
      isPhoneVerified: profile?.is_phone_verified || false,
      country: profile?.country || ''
    });
    
    console.log("👤 AuthContext: User set", {
      email: supabaseUser.email,
      hasName: !!profile?.name,
      hasPhone: !!profile?.phone
    });
    
    setIsLoading(false);
  };

  // This ensures we're only running this code on the client side
  useEffect(() => {
    const initAuth = async () => {
      setMounted(true);
      
      // ✅ ONLY use the auth listener - removed manual fetchSession
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        console.log("🔄 AuthContext: Auth state changed", event);
        if (session?.user) {
          await updateUserState(session.user);
        } else {
          setUser(null);
          setIsLoading(false); // ✅ Make sure to set loading false
        }
      });
      
      // ✅ Get initial session ONCE using the listener pattern
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
        if (session?.user) {
          updateUserState(session.user);
        } else {
          setIsLoading(false);
        }
      });
      
      return authListener;
    };
    
    // Start the auth initialization process
    let authListenerCleanup: any;
    
    initAuth().then(listener => {
      authListenerCleanup = listener;
    });
    
    return () => {
      // Clean up the auth listener when the component unmounts
      if (authListenerCleanup) {
        authListenerCleanup.subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("🔐 AuthContext: signIn called with email:", email);
    setIsLoading(true);
    try {
      console.log("📡 AuthContext: Calling Supabase auth...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("❌ AuthContext: Sign in error", error);
        throw error;
      }
      
      if (data.session) {
        const { session }: { session: any } = data;
        console.log("✅ AuthContext: Sign in successful");
        
        // Update user state first to ensure UI updates properly
        await updateUserState(data.user);
        
        // Use Next.js router for navigation instead of emergency navigation
        console.log("🔄 AuthContext: Redirecting to trips page");
        router.push('/trips');
        
        return;
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
  // We use the mounted flag just for client-side effects, not for altering the API
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};