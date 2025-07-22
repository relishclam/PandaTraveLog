'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    const verified = searchParams.get('verified');

    if (error) {
      setStatus('error');
      setMessage('Email verification failed. Please try again.');
    } else if (verified === 'true') {
      setStatus('success');
      setMessage('Your email has been verified successfully!');
      
      // Redirect to trips after 3 seconds
      setTimeout(() => {
        router.push('/trips');
      }, 3000);
    } else {
      setStatus('loading');
      setMessage('Verifying your email...');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-bamboo-light flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="mb-6">
            <Image
              src="/images/panda-logo.png"
              alt="PandaTraveLog"
              width={80}
              height={80}
              className="rounded-full"
            />
          </Link>

          <div className="mb-6">
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-backpack-orange animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email</h2>
              </div>
            )}
            
            {status === 'success' && (
              <div className="flex flex-col items-center">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
              </div>
            )}
            
            {status === 'error' && (
              <div className="flex flex-col items-center">
                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
              </div>
            )}
          </div>

          <p className="text-gray-600 mb-6">{message}</p>

          <div className="space-y-3 w-full">
            {status === 'success' && (
              <Button
                onClick={() => router.push('/trips')}
                className="w-full bg-backpack-orange hover:bg-backpack-orange/90 text-white"
              >
                Continue to Your Trips
              </Button>
            )}
            
            {status === 'error' && (
              <>
                <Button
                  onClick={() => router.push('/register')}
                  className="w-full bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                >
                  Try Signing Up Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </>
            )}
            
            {status === 'loading' && (
              <Button
                variant="outline"
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Back to Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bamboo-light flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center text-center">
            <Loader2 className="h-12 w-12 text-backpack-orange animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
