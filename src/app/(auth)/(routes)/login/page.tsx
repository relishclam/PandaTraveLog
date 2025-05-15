'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import { useAuth } from '@/contexts/AuthContext';

type FormData = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('happy');
  const [pandaMessage, setPandaMessage] = useState('Welcome back! Sign in to continue your adventures.');
  
  const searchParams = useSearchParams();
  const verified = searchParams?.get('verified') === 'false';
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setPandaEmotion('thinking');
      setPandaMessage('Checking your credentials...');
      
      await signIn(data.email, data.password);
      
      setPandaEmotion('excited');
      setPandaMessage('Welcome back! Let\'s continue planning your adventures!');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
      setPandaEmotion('confused');
      setPandaMessage('Hmm, something\'s not right. Let\'s try again!');
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
              src="/images/po/happy.png"
              alt="PO the Travel Panda"
              width={80}
              height={80}
              className="mx-auto"
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
              <Link href="/forgot-password" className="text-sm text-backpack-orange hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
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

      <PandaAssistant
        emotion={pandaEmotion}
        message={pandaMessage}
        position="bottom-right"
        size="md"
      />
    </div>
  );
}
