"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

import { useAuth } from "@/contexts/AuthContext";
import { createClient } from '@/utils/supabase/client';

// Initialize Supabase client for this component
const supabase = createClient();

type LoginFormData = {
  email: string;
  password: string;
};

type ResetFormData = {
  email: string;
};

export default function LoginContent() {
  // Track if we're mounted on the client to avoid hydration issues
  const [isMounted, setIsMounted] = useState(false);
  
  // Get auth context (will be handled safely with the isMounted check)
  const { signIn, resetPassword, isLoading: authLoading } = useAuth();
  
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('happy');
  const [pandaMessage, setPandaMessage] = useState('Welcome back! Sign in to continue your adventures.');

  const searchParams = useSearchParams();
  const verified = searchParams?.get('verified') === 'false';
  const message = searchParams?.get('message');
  const showEmailConfirmation = message === 'check_email';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  const { register: registerReset, handleSubmit: handleResetSubmit, formState: { errors: resetErrors } } = useForm<ResetFormData>();

  // Set isMounted to true after initial render on client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Debug: Add diagnostic logging - IMPORTANT: This must be called before any conditional returns
  useEffect(() => {
    // Only run diagnostics on the client side
    if (isMounted) {
      console.log("=== LOGIN DIAGNOSTICS START ===");
      console.log("LoginContent component loaded");
      
      // Check environment variables 
      console.log("API Keys available:", {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
      
      // Check authentication state
      const checkAuthState = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          console.log("Current auth state:", data.session ? "Authenticated" : "Not authenticated");
        } catch (error) {
          console.error("Error checking auth state:", error);
        }
      };
      
      checkAuthState();
      
      return () => {
        console.log("=== LOGIN DIAGNOSTICS END ===");
      };
    }
  }, [isMounted]);
  
  // Always render a loading state on the server, and the same on first client render
  // This prevents hydration mismatch
  if (!isMounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bamboo-light">
        <div className="flex flex-col items-center">
          <Image src="/images/po/emotions/happy.png" alt="PO the Travel Panda" width={60} height={60} unoptimized />
          <div className="mt-4 text-lg font-medium text-panda-black">Loading...</div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      console.log("🔍 Login started with email:", data.email);
      setIsLoading(true);
      setError(null);
      setPandaEmotion('thinking');
      setPandaMessage('Checking your credentials...');

      // Check current auth state before login
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("🔐 Current auth state before login:", {
        hasSession: !!sessionData.session,
        sessionExpiry: sessionData.session?.expires_at
      });

      console.log("📲 Calling signIn function...");
      await signIn(data.email, data.password);
      
      console.log("✅ signIn completed successfully");
      setPandaEmotion('excited');
      setPandaMessage("Welcome back! Let's continue planning your adventures!");
      
      // Check auth state after login
      const { data: newSessionData } = await supabase.auth.getSession();
      console.log("🔐 Auth state after login:", {
        hasSession: !!newSessionData.session,
        sessionExpiry: newSessionData.session?.expires_at
      });
      
      // AuthContext will handle the redirection
      console.log("🧭 AuthContext will handle redirection...");
      
      // If we're still here after 2 seconds, try a manual redirect with absolute URL
      setTimeout(() => {
        console.log("⏱️ Manual redirect timeout triggered");
        const baseUrl = window.location.origin;
        console.log("🔄 LoginContent: Redirecting to absolute URL: " + baseUrl + "/trips");
        window.location.href = baseUrl + "/trips";
      }, 2000);
         
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Invalid email or password');
      setPandaEmotion('confused');
      setPandaMessage("Hmm, something's not right. Let's try again!");
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    try {
      console.log("🔄 Password reset started for email:", data.email);
      setIsResetLoading(true);
      setError(null);
      
      // Call your resetPassword function from AuthContext
      await resetPassword(data.email);
      console.log("✅ Password reset email sent successfully");
      
      setResetSuccess(true);
      setPandaEmotion('excited');
      setPandaMessage("Check your email for a password reset link!");
    } catch (err: any) {
      console.error('❌ Reset error:', err);
      setError(err.message || 'Failed to send reset email');
      setPandaEmotion('confused');
      setPandaMessage("Hmm, something's not right with that email!");
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bamboo-light flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="mb-6">
            <Image
              src="/images/po/emotions/happy.png"
              alt="PO the Travel Panda"
              width={80}
              height={80}
              className="mx-auto"
              unoptimized
            />
          </Link>
          <h2 className="text-3xl font-bold text-panda-black">Welcome Back!</h2>
          <p className="mt-2 text-center text-gray-600">
            Sign in to continue your travel planning
          </p>
        </div>

        {verified && (
          <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-md">
            Please check your email to verify your account before signing in.
          </div>
        )}

        {showEmailConfirmation && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <Image 
                src="/images/po/emotions/excited.png" 
                alt="PO is excited" 
                width={24} 
                height={24} 
                className="mr-2"
                unoptimized
              />
              <div>
                <p className="font-medium">Account created successfully! 🎉</p>
                <p className="text-sm mt-1">Please check your email and click the confirmation link to activate your account, then return here to sign in.</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-backpack-orange focus:border-backpack-orange"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-sm text-backpack-orange hover:underline bg-transparent border-0 p-0"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-backpack-orange focus:border-backpack-orange"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-backpack-orange hover:bg-backpack-orange/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-backpack-orange hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Brand-Consistent Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bamboo-light bg-opacity-90 rounded-xl p-6 max-w-md w-full m-4 border-2 border-backpack-orange shadow-xl">
            {/* Modal Header with Brand Elements */}
            <div className="flex flex-col items-center mb-4">
              <Image 
                src="/images/po/emotions/thinking.png" 
                alt="PO the Travel Panda" 
                width={70} 
                height={70} 
                className="mb-2"
                unoptimized
              />
              <h3 className="text-2xl font-bold text-panda-black">Forgot Your Password?</h3>
              <p className="text-center text-gray-600 mt-1">PO will help you get back to your travels!</p>
            </div>
            
            <button 
              onClick={() => {
                setShowResetModal(false);
                setResetSuccess(false);
                setError(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {resetSuccess ? (
              <div className="text-center py-4">
                <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-4 rounded-md mb-6">
                  <p className="font-medium">Password reset email sent!</p>
                  <p className="text-sm mt-1">Please check your inbox for instructions from PO.</p>
                </div>
                <Image 
                  src="/images/po/emotions/excited.png" 
                  alt="PO is excited" 
                  width={60} 
                  height={60} 
                  className="mx-auto mb-4"
                  unoptimized
                />
                <Button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetSuccess(false);
                  }}
                  className="bg-backpack-orange hover:bg-backpack-orange/90 text-white px-6 py-2"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 shadow-inner">
                <form onSubmit={handleResetSubmit(onResetSubmit)}>
                  <p className="mb-4 text-gray-600">
                    Enter your email address and PO will send you a link to reset your password.
                  </p>
                  <div className="mb-6">
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      {...registerReset('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-backpack-orange focus:border-backpack-orange"
                      placeholder="your.email@example.com"
                    />
                    {resetErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{resetErrors.email.message}</p>
                    )}
                  </div>
                  
                  {/* Small panda icon for brand reinforcement */}
                  <div className="flex justify-center mb-4">
                    <Image 
                      src="/images/po/emotions/happy.png" 
                      alt="PO is happy to help" 
                      width={40}
                      height={40}
                      unoptimized 
                    />
                  </div>
                  
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      className="bg-backpack-orange hover:bg-backpack-orange/90 text-white px-5"
                      disabled={isResetLoading}
                    >
                      {isResetLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}