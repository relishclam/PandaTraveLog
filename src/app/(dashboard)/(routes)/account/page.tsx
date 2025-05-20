'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function AccountPage() {
  const { user, isLoading, signOut, updateUserPhone } = useAuth();
  const router = useRouter();
  const [pandaEmotion, setPandaEmotion] = useState<'happy' | 'thinking' | 'excited' | 'confused'>('happy');
  const [pandaMessage, setPandaMessage] = useState('Here\'s your account information!');
  
  // Phone verification states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  
  // Profile update states
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updatedName, setUpdatedName] = useState('');
  const [updatedPhone, setUpdatedPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Delete profile states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading account information...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      console.log("👤 Account: No user found, redirecting to login");
      router.push('/login');
    } else if (user) {
      console.log("👤 Account: User found", { 
        email: user.email,
        hasName: !!user.name,
        hasPhone: !!user.phone
      });
      
      // Initialize update form with current values
      setUpdatedName(user.name || '');
      setUpdatedPhone(user.phone || '');
    }
  }, [user, isLoading, router]);
  
  // Loading check is handled above
  
  if (!user) {
    return null; // Will redirect in the useEffect
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-backpack-orange rounded-full p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">My Account</h1>
          </div>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Profile Information</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{user.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone Verification</p>
                    <div className="flex items-center">
                      <p className={`font-medium ${user.isPhoneVerified ? 'text-green-600' : 'text-amber-600'}`}>
                        {user.isPhoneVerified ? 'Verified' : 'Not Verified'}
                      </p>
                      {!user.isPhoneVerified && (
                        <Button 
                          onClick={() => {
                            setShowVerificationForm(true);
                            setPandaEmotion('excited');
                            setPandaMessage('Let\'s verify your phone number to secure your account!');
                          }}
                          className="ml-3 text-xs py-1 px-2 h-auto bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                        >
                          Verify Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {showVerificationForm && !user.isPhoneVerified && (
              <div className="mb-6 bg-bamboo-light p-4 rounded-lg border border-backpack-orange/20">
                <h2 className="text-lg font-semibold mb-3">Phone Verification</h2>
                
                {!isVerifying ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Enter your phone number to receive a verification code.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-grow"
                      />
                      <Button
                        onClick={async () => {
                          if (!phoneNumber || phoneNumber.length < 10) {
                            toast.error('Please enter a valid phone number');
                            return;
                          }
                          
                          setIsVerifying(true);
                          setPandaEmotion('thinking');
                          setPandaMessage('Sending a verification code to your phone...');
                          
                          try {
                            const response = await fetch('/api/auth/otp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ phoneNumber, action: 'send' })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                              toast.success('Verification code sent!');
                              setPandaEmotion('excited');
                              setPandaMessage('Great! Now enter the code you received.');
                            } else {
                              throw new Error(data.message || 'Failed to send verification code');
                            }
                          } catch (error: any) {
                            console.error('Error sending verification code:', error);
                            toast.error(error.message || 'Failed to send verification code');
                            setIsVerifying(false);
                            setPandaEmotion('confused');
                            setPandaMessage('Hmm, something went wrong. Please try again.');
                          }
                        }}
                        className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                        disabled={isVerifying}
                      >
                        Send Code
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">Enter the verification code sent to {phoneNumber}.</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="text"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="flex-grow"
                        maxLength={6}
                      />
                      <Button
                        onClick={async () => {
                          if (!verificationCode || verificationCode.length < 4) {
                            toast.error('Please enter the verification code');
                            return;
                          }
                          
                          setIsSubmittingCode(true);
                          setPandaEmotion('thinking');
                          setPandaMessage('Verifying your code...');
                          
                          try {
                            const response = await fetch('/api/auth/otp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                phoneNumber, 
                                code: verificationCode, 
                                action: 'verify' 
                              })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success && data.verified) {
                              // Update local user state
                              if (user) {
                                await updateUserPhone(user.id, phoneNumber, true);
                              }
                              
                              toast.success('Phone verified successfully!');
                              setPandaEmotion('happy');
                              setPandaMessage('Awesome! Your phone is now verified.');
                              setShowVerificationForm(false);
                            } else {
                              throw new Error(data.message || 'Invalid verification code');
                            }
                          } catch (error: any) {
                            console.error('Error verifying code:', error);
                            toast.error(error.message || 'Failed to verify code');
                            setPandaEmotion('confused');
                            setPandaMessage('That code doesn\'t seem right. Please try again.');
                          } finally {
                            setIsSubmittingCode(false);
                          }
                        }}
                        className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                        disabled={isSubmittingCode}
                      >
                        Verify
                      </Button>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <Button
                        onClick={() => {
                          setIsVerifying(false);
                          setVerificationCode('');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 bg-transparent hover:bg-transparent p-0"
                        type="button"
                      >
                        Change phone number
                      </Button>
                      
                      <Button
                        onClick={async () => {
                          setPandaEmotion('thinking');
                          setPandaMessage('Sending a new code to your phone...');
                          
                          try {
                            const response = await fetch('/api/auth/otp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ phoneNumber, action: 'send' })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                              toast.success('New verification code sent!');
                              setVerificationCode('');
                              setPandaEmotion('excited');
                              setPandaMessage('I\'ve sent a new code. Please check your phone.');
                            } else {
                              throw new Error(data.message || 'Failed to send new verification code');
                            }
                          } catch (error: any) {
                            console.error('Error sending new verification code:', error);
                            toast.error(error.message || 'Failed to send new code');
                            setPandaEmotion('confused');
                            setPandaMessage('Hmm, something went wrong. Please try again.');
                          }
                        }}
                        className="text-sm text-backpack-orange hover:text-backpack-orange/80 bg-transparent hover:bg-transparent p-0"
                        type="button"
                      >
                        Resend code
                      </Button>
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={() => {
                    setShowVerificationForm(false);
                    setIsVerifying(false);
                    setVerificationCode('');
                    setPandaEmotion('happy');
                    setPandaMessage('You can verify your phone anytime!');
                  }}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700 bg-transparent hover:bg-transparent p-0"
                  type="button"
                >
                  Cancel verification
                </Button>
              </div>
            )}
            
            <div>
              <h2 className="text-lg font-semibold mb-2">Account Settings</h2>
              <div className="space-y-4">
                <Button
                  onClick={() => {
                    setPandaEmotion('thinking');
                    setPandaMessage('This feature is coming soon!');
                  }}
                  className="w-full md:w-auto bg-white hover:bg-gray-50 text-gray-800 border border-gray-300"
                >
                  Change Password
                </Button>
                
                <Button
                  onClick={() => {
                    setShowUpdateForm(true);
                    setPandaEmotion('excited');
                    setPandaMessage('Update your profile information here!');
                  }}
                  className="w-full md:w-auto bg-white hover:bg-gray-50 text-gray-800 border border-gray-300"
                >
                  Update Profile
                </Button>
                
                <Button
                  onClick={() => {
                    setPandaEmotion('confused');
                    setPandaMessage('Are you sure you want to sign out?');
                    
                    if (confirm('Are you sure you want to sign out?')) {
                      console.log("🚪 Account: User confirmed sign out");
                      signOut();
                    }
                  }}
                  className="w-full md:w-auto bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                >
                  Sign Out
                </Button>
                
                <Button
                  onClick={() => {
                    setShowDeleteConfirmation(true);
                    setPandaEmotion('confused');
                    setPandaMessage('Are you sure you want to delete your account? This cannot be undone!');
                  }}
                  className="w-full md:w-auto bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                >
                  Delete Account
                </Button>
              </div>
            </div>
            
            {/* Profile Update Form */}
            {showUpdateForm && (
              <div className="mb-6 bg-bamboo-light p-4 rounded-lg border border-backpack-orange/20">
                <h2 className="text-lg font-semibold mb-3">Update Profile</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={updatedName}
                      onChange={(e) => setUpdatedName(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={updatedPhone}
                      onChange={(e) => setUpdatedPhone(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Note: Changing your phone number will require re-verification.
                    </p>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={async () => {
                        setIsUpdatingProfile(true);
                        setPandaEmotion('thinking');
                        setPandaMessage('Updating your profile...');
                        
                        try {
                          const response = await fetch('/api/profile/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: updatedName,
                              phone: updatedPhone
                            })
                          });
                          
                          const data = await response.json();
                          
                          if (data.success) {
                            // Update local user state if phone changed
                            if (user && user.phone !== updatedPhone) {
                              await updateUserPhone(user.id, updatedPhone, false);
                            } else if (user) {
                              // Force a refresh to get updated user data
                              router.refresh();
                            }
                            
                            toast.success('Profile updated successfully!');
                            setPandaEmotion('happy');
                            setPandaMessage('Your profile has been updated!');
                            setShowUpdateForm(false);
                            
                            // If phone changed, prompt for verification
                            if (user && user.phone !== updatedPhone) {
                              setTimeout(() => {
                                setShowVerificationForm(true);
                                setPhoneNumber(updatedPhone);
                                setPandaEmotion('excited');
                                setPandaMessage('Would you like to verify your new phone number?');
                              }, 1500);
                            }
                          } else {
                            throw new Error(data.message || 'Failed to update profile');
                          }
                        } catch (error: any) {
                          console.error('Error updating profile:', error);
                          toast.error(error.message || 'Failed to update profile');
                          setPandaEmotion('confused');
                          setPandaMessage('Hmm, something went wrong. Please try again.');
                        } finally {
                          setIsUpdatingProfile(false);
                        }
                      }}
                      className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                      disabled={isUpdatingProfile}
                    >
                      Save Changes
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setShowUpdateForm(false);
                        // Reset to current values
                        setUpdatedName(user?.name || '');
                        setUpdatedPhone(user?.phone || '');
                        setPandaEmotion('happy');
                        setPandaMessage('No changes were made to your profile.');
                      }}
                      className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300"
                      disabled={isUpdatingProfile}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Delete Account Confirmation */}
            {showDeleteConfirmation && (
              <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-200">
                <h2 className="text-lg font-semibold mb-3 text-red-700">Delete Account</h2>
                <div className="space-y-4">
                  <p className="text-sm text-red-600">
                    This action is permanent and cannot be undone. All your data, including trips and preferences, will be deleted.
                  </p>
                  
                  <div>
                    <label htmlFor="confirmDelete" className="block text-sm font-medium text-red-700 mb-1">
                      Type "DELETE" to confirm
                    </label>
                    <Input
                      id="confirmDelete"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full border-red-300 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={async () => {
                        if (deleteConfirmText !== 'DELETE') {
                          toast.error('Please type DELETE to confirm');
                          return;
                        }
                        
                        setIsDeletingProfile(true);
                        setPandaEmotion('confused');
                        setPandaMessage('Deleting your account...');
                        
                        try {
                          const response = await fetch('/api/profile/delete', {
                            method: 'DELETE',
                          });
                          
                          const data = await response.json();
                          
                          if (data.success) {
                            toast.success('Account deleted successfully!');
                            // Redirect to home page
                            router.push('/');
                          } else {
                            throw new Error(data.message || 'Failed to delete account');
                          }
                        } catch (error: any) {
                          console.error('Error deleting account:', error);
                          toast.error(error.message || 'Failed to delete account');
                          setPandaEmotion('confused');
                          setPandaMessage('Hmm, something went wrong. Please try again.');
                          setIsDeletingProfile(false);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={isDeletingProfile || deleteConfirmText !== 'DELETE'}
                    >
                      Permanently Delete Account
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setShowDeleteConfirmation(false);
                        setDeleteConfirmText('');
                        setPandaEmotion('happy');
                        setPandaMessage('I\'m glad you\'re staying with us!');
                      }}
                      className="bg-white hover:bg-gray-50 text-gray-800 border border-gray-300"
                      disabled={isDeletingProfile}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-bamboo-light rounded-xl p-6 border border-backpack-orange/20">
          <div className="flex items-center mb-4">
            <Image
              src="/images/po/happy.png"
              alt="PO"
              width={40}
              height={40}
              className="mr-3"
            />
            <h2 className="text-lg font-semibold">Travel Preferences</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Set your travel preferences to get personalized recommendations from PO!
          </p>
          <Button
            onClick={() => {
              setPandaEmotion('excited');
              setPandaMessage('Setting up your travel preferences will make planning even easier!');
            }}
            className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
          >
            Set Travel Preferences
          </Button>
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