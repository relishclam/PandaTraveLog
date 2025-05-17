'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PandaAssistant } from '@/components/ui/PandaAssistant';

type PhoneVerificationProps = {
  onVerified: (phoneNumber: string) => void;
  userId?: string;
};

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({ 
  onVerified,
  userId
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pandaMessage, setPandaMessage] = useState('Hi! Let\'s verify your phone number to keep your account secure.');
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('happy');

  const handleSendCode = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number');
      setPandaEmotion('confused');
      setPandaMessage('Oops! You need to enter a phone number first.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setPandaEmotion('thinking');
    setPandaMessage('Sending your verification code...');
    
    try {
      const response = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
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
      setPandaMessage('You need to enter the verification code I sent you!');
      return;
    }
    
    setLoading(true);
    setError(null);
    setPandaEmotion('thinking');
    setPandaMessage('Checking your verification code...');
    
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumber, 
          code: verificationCode,
          userId
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Invalid verification code');
      }
      
      setPandaEmotion('excited');
      setPandaMessage('Phone verified successfully! Let\'s continue with your adventure!');
      
      // Call the onVerified callback with the verified phone number
      onVerified(phoneNumber);
    } catch (error) {
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
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="flex items-center">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="flex-1 p-3 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-backpack-orange focus:border-backpack-orange"
              />
              <Button
                onClick={handleSendCode}
                disabled={loading}
                className="bg-backpack-orange hover:bg-backpack-orange/90 text-white rounded-l-none rounded-r-md"
              >
                {loading ? 'Sending...' : 'Send Code'}
              </Button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter your phone number with country code (e.g., +1 for US)
            </p>
          </div>
        </>
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
      
      <PandaAssistant
        emotion={pandaEmotion}
        message={pandaMessage}
        position="bottom-right"
      />
    </div>
  );
};
