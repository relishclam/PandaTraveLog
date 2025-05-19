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
  country?: string; // Add country of origin
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ id: string }>;
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

  // This ensures we're only running this code on the client side
  useEffect(() => {
    const initAuth = async () => {
      setMounted(true);
      
      // Fetch the initial session
      await fetchSession();
      
      // Set up auth listener
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("🔄 AuthContext: Auth state changed", event);
        if (session?.user) {
          await updateUserState(session.user);
        } else {
          setUser(null);
        }
      });
      
      // Store the listener for cleanup
      return authListener;
    };
    
    // Function to fetch the current session
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
        await updateUserState(session.user);
      } else {
        console.log("❗ AuthContext: No session found");
        setUser(null);
        setIsLoading(false);
      }
    };
    
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
        isPhoneVerified: profile?.is_phone_verified || false
      });
      
      console.log("👤 AuthContext: User set", {
        email: supabaseUser.email,
        hasName: !!profile?.name,
        hasPhone: !!profile?.phone
      });
      
      setIsLoading(false);
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

      console.log("📥 AuthContext: Supabase response:", { 
        success: !error,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userId: data?.user?.id
      });

      if (error) {
        console.error("❌ AuthContext: Auth error", error);
        throw error;
      }

      console.log("✅ AuthContext: Authentication successful");
      
      // Add a delay to allow the session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local user state immediately
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        setUser({
          id: data.user.id,
          email: data.user.email!,
          name: profile?.name || '',
          phone: profile?.phone || '',
          isPhoneVerified: profile?.is_phone_verified || false
        });
      }
      
      // Force a complete page reload to prevent SPA navigation issues
      console.log("🔄 AuthContext: Redirecting to trips page");
      router.push('/trips');
      router.refresh();
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
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('❌ AuthContext: Error signing out:', error);
      throw error;
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