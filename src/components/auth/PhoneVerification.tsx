'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

import { useAuth } from '@/hooks/auth';
import { COUNTRY_CODES } from '@/lib/country-codes';

type PhoneVerificationProps = {
  onVerified: (phoneNumber: string) => void;
  userId?: string;
};

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({ 
  onVerified,
  userId
}) => {
  const { updateUserCountry } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [countryPrefix, setCountryPrefix] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pandaMessage, setPandaMessage] = useState('Hi! Let\'s verify your phone number to keep your account secure.');
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('happy');
  
  // List of country codes for the dropdown
  const countryOptions = Object.entries(COUNTRY_CODES).map(([country, code]) => ({
    label: `${country} (${code})`,
    value: country,
    prefix: code
  })).sort((a, b) => a.label.localeCompare(b.label));
  
  // Handle country selection
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);
    
    // Find the prefix for the selected country
    const prefix = countryOptions.find(option => option.value === country)?.prefix || '+1';
    setCountryPrefix(prefix);
  };

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      setPandaEmotion('confused');
      setPandaMessage('Oops! You need to enter a phone number first.');
      return;
    }
    
    // Combine country code and phone number
    const fullPhoneNumber = `${countryPrefix}${phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber}`;
    
    setLoading(true);
    setError(null);
    setPandaEmotion('thinking');
    setPandaMessage('Sending your verification code...');
    
    try {
      // Save the user's country first
      if (userId) {
        try {
          await updateUserCountry(userId, selectedCountry);
          console.log(`Updated user country to: ${selectedCountry}`);
        } catch (err) {
          console.error('Failed to update user country:', err);
          // Continue with verification even if country update fails
        }
      }
      
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      
      setCodeSent(true);
      setPandaEmotion('excited');
      setPandaMessage('Great! I sent a verification code to your phone. Please enter it here.');
    } catch (error) {
      console.error('Error sending code:', error);
      setError(typeof error === 'string' ? error : 'Failed to send verification code');
      setPandaEmotion('confused');
      setPandaMessage('Something went wrong sending the code. Please check your number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      setPandaEmotion('confused');
      setPandaMessage('I need that verification code to continue!');
      return;
    }
    
    // Combine country code and phone number
    const fullPhoneNumber = `${countryPrefix}${phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber}`;
    
    setLoading(true);
    setError(null);
    setPandaEmotion('thinking');
    setPandaMessage('Verifying your code...');
    
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber: fullPhoneNumber, 
          verificationCode, 
          userId,
          country: selectedCountry 
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to verify code');
      }
      
      setPandaEmotion('excited');
      setPandaMessage('Great! Your phone number is verified!');
      
      // Call the onVerified callback with the verified phone number
      onVerified(fullPhoneNumber);
    } catch (error: any) {
      console.error('Error verifying code:', error);
      setError(typeof error === 'string' ? error : 'Invalid verification code');
      setPandaEmotion('confused');
      setPandaMessage('That code doesn\'t seem right. Please check and try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Phone Verification</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {!codeSent ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Select your country
            </label>
            <select
              id="country"
              value={selectedCountry}
              onChange={handleCountryChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              {countryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Enter your phone number
            </label>
            <div className="flex">
              <div className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                {countryPrefix}
              </div>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 456 7890"
                disabled={loading}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Don't include the country code in the phone number field</p>
          </div>
          <Button
            onClick={handleSendCode}
            disabled={loading}
            className="w-full mt-4 bg-backpack-orange hover:bg-backpack-orange/90 text-white py-2 rounded-md"
          >
            {loading ? 'Sending...' : 'Send Code'}
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-4">
              A verification code has been sent to {phoneNumber}.
              <button
                onClick={() => setCodeSent(false)}
                className="ml-2 text-backpack-orange hover:underline"
              >
                Change number
              </button>
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter code"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
              maxLength={6}
            />
          </div>
          
          <Button
            onClick={handleVerifyCode}
            disabled={loading}
            className="w-full bg-backpack-orange hover:bg-backpack-orange/90 text-white"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </>
      )}
    </div>
  );
};
