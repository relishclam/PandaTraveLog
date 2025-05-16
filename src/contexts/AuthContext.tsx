'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

type User = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  isPhoneVerified?: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ id: string }>;
  signOut: () => Promise<void>;
  updateUserPhone: (userId: string, phoneNumber: string, isVerified: boolean) => Promise<void>;
  resetPassword: (email: string) => Promise<void>; // Added resetPassword function
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      console.log("🔄 AuthContext: Fetching session");
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ AuthContext: Error fetching session:', error);
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        console.log("✅ AuthContext: Session found");
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: profile?.name || '',
          phone: profile?.phone || '',
          isPhoneVerified: profile?.is_phone_verified || false
        });
        console.log("👤 AuthContext: User set", {
          hasEmail: !!session.user.email,
          hasName: !!profile?.name,
          hasPhone: !!profile?.phone
        });
      } else {
        console.log("❗ AuthContext: No session found");
        setUser(null);
      }

      setIsLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.log("🔄 AuthContext: Auth state changed", event);
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: profile?.name || '',
          phone: profile?.phone || '',
          isPhoneVerified: profile?.is_phone_verified || false
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("🔐 AuthContext: signIn called");
    setIsLoading(true);
    try {
      console.log("📡 AuthContext: Calling Supabase auth...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("📥 AuthContext: Supabase response received", { 
        success: !error,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        errorMessage: error?.message
      });

      if (error) {
        console.error("❌ AuthContext: Auth error", error);
        throw error;
      }

      console.log("✅ AuthContext: Authentication successful");
      
      // Try both navigation methods
      try {
        console.log("🔄 AuthContext: Refreshing router...");
        router.refresh();
        
        console.log("➡️ AuthContext: Pushing to /trips...");
        router.push('/trips');
        
        // As a fallback, try window.location after a short delay
        setTimeout(() => {
          console.log("⏱️ AuthContext: Navigation timeout, trying direct location change");
          window.location.href = '/trips';
        }, 1000);
        
      } catch (navError) {
        console.error("❌ AuthContext: Navigation error", navError);
        // Force navigation
        window.location.href = '/trips';
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Error signing in:', error);
      throw error;
    } finally {
      setIsLoading(false);
      console.log("🏁 AuthContext: signIn process completed");
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    console.log("📝 AuthContext: signUp called");
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error("❌ AuthContext: SignUp error", error);
        throw error;
      }

      if (!data.user) {
        throw new Error('User creation failed');
      }

      console.log("✅ AuthContext: User created, creating profile");
      // Create profile entry
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email,
        name: name,
        is_phone_verified: false,
        updated_at: new Date().toISOString(),
      });
      
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

  // New resetPassword function
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
      router.push('/');
    } catch (error) {
      console.error('❌ AuthContext: Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, updateUserPhone, resetPassword }}>
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