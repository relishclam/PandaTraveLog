'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { PhoneVerification } from '@/components/auth/PhoneVerification';

type FormData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading registration form...</div>
      </div>
    );
  }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('happy');
  const [pandaMessage, setPandaMessage] = useState('Join the adventure! Sign up to start planning your trips.');
  const [step, setStep] = useState(1); // 1: Register, 2: Verify Phone
  const [userId, setUserId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>();
  const password = watch('password');

  const onSubmit = async (data: FormData) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      setPandaEmotion('confused');
      setPandaMessage('Oops! The passwords don\'t match. Please try again.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setPandaEmotion('thinking');
      setPandaMessage('Creating your account...');
      
      // Validate phone number format if provided
      if (data.phone && !/^\+?[1-9]\d{1,14}$/.test(data.phone)) {
        setError('Please enter a valid phone number with country code (e.g., +1234567890)');
        setPandaEmotion('confused');
        setPandaMessage('The phone number format doesn\'t look right. Please include the country code.');
        setIsLoading(false);
        return;
      }
      
      // Sign up the user with phone number
      const { id } = await signUp(data.email, data.password, data.name, data.phone);
      
      // The redirect is now handled in the AuthContext after successful signup
      setPandaEmotion('excited');
      setPandaMessage('Your account is created! Redirecting to your dashboard...');
      
      // No need for manual redirect as it's handled in AuthContext
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'An error occurred during registration');
      setPandaEmotion('confused');
      setPandaMessage('Oh no! Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };
  
  const handlePhoneVerified = (phoneNumber: string) => {
    // Redirect to dashboard after successful verification
    router.push('/trips');
  };

  return (
    <div className="min-h-screen bg-bamboo-light flex flex-col md:flex-row">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/images/po/emotions/happy.png"
                alt="PO the Travel Panda"
                width={80}
                height={80}
                className="mx-auto mb-4"
              />
            </Link>
            <h1 className="text-3xl font-bold">Join PandaTraveLog</h1>
            <p className="text-gray-600 mt-2">Start planning your adventures with PO</p>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-600 rounded-md">
              {error}
            </div>
          )}
          
          {step === 1 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (with country code)
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1234567890"
                  {...register('phone')}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
                />
                <p className="mt-1 text-xs text-gray-500">Optional. Include country code (e.g., +1 for US)</p>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match',
                  })}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-backpack-orange hover:bg-backpack-orange/90 text-white py-3"
              >
                {isLoading ? 'Signing Up...' : 'Sign Up'}
              </Button>
              
              <p className="text-center text-sm text-gray-600 mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-backpack-orange hover:underline">
                  Sign In
                </Link>
              </p>
            </form>
          )}
          
          {/* Phone verification step removed */}
        </div>
      </div>
      
      {/* Right Side - Image */}
      <div className="hidden md:flex flex-1 bg-backpack-orange items-center justify-center">
        <div className="p-12 text-white max-w-md">
          <h2 className="text-3xl font-bold mb-6">Explore the World with PO!</h2>
          <p className="text-xl mb-8">Create personalized travel itineraries, discover hidden gems, and make your adventures unforgettable.</p>
          <Image
            src="/images/po/emotions/excited.png"
            alt="PO the Travel Panda"
            width={200}
            height={200}
            className="mx-auto"
          />
        </div>
      </div>

      {/* PandaAssistant removed to avoid visual hindrance */}
    </div>
  );
}
