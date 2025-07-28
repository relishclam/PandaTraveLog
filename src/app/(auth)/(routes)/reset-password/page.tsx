'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/utils/supabase/client';

// Initialize Supabase client for this component
const supabase = createClient();

// Create a separate component that uses useSearchParams
function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('thinking');

  useEffect(() => {
    console.log("🔄 ResetPasswordPage: Component loaded");
    
    // Check if we have the necessary hash parameter
    const params = new URLSearchParams(window.location.hash.substring(1));
    const hasAccessToken = params.has('access_token');
    
    console.log("🔑 ResetPasswordPage: Has access token?", hasAccessToken);
    
    if (!hasAccessToken) {
      console.warn("⚠️ ResetPasswordPage: No access token found in URL");
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setPandaEmotion('thinking');
    
    try {
      console.log("🔄 ResetPasswordPage: Updating password");
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        console.error("❌ ResetPasswordPage: Update password error", error);
        throw error;
      }
      
      console.log("✅ ResetPasswordPage: Password updated successfully");
      setSuccess(true);
      setPandaEmotion('excited');
    } catch (err: any) {
      console.error('❌ ResetPasswordPage: Error resetting password:', err);
      setError(err.message || 'Failed to reset password');
      setPandaEmotion('confused');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bamboo-light flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="mb-6">
            <Image
              src="/images/po/emotions/thinking.png"
              alt="PO the Travel Panda"
              width={80}
              height={80}
              className="mx-auto"
            />
          </Link>
          <h2 className="text-3xl font-bold text-panda-black">Reset Password</h2>
          <p className="mt-2 text-center text-gray-600">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success ? (
          <div className="mt-6 space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
              Your password has been successfully reset!
            </div>
            <Button
              onClick={() => {
                console.log("➡️ ResetPasswordPage: Navigating to login");
                window.location.href = '/login';
              }}
              className="w-full bg-backpack-orange hover:bg-backpack-orange/90 text-white"
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-backpack-orange focus:border-backpack-orange"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-backpack-orange focus:border-backpack-orange"
              />
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bamboo-light flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <Image
            src="/images/po/emotions/thinking.png"
            alt="PO is thinking"
            width={80}
            height={80}
            className="mx-auto mb-4"
          />
          <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          <p className="text-gray-600">PO is preparing your password reset form.</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}