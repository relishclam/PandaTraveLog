import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Log missing environment variables but don't halt the build
if (!accountSid || !authToken || !verifyServiceSid) {
  console.error('Missing Twilio environment variables');
}

// Only initialize the client if all required variables are present
// This prevents build errors when environment variables are missing
const client = (accountSid && authToken && accountSid.startsWith('AC')) 
  ? twilio(accountSid, authToken)
  : null;

export async function sendVerificationToken(phoneNumber: string) {
  try {
    // Skip actual verification in build/preview environments or when client is not initialized
    if (!client) {
      console.log('Skipping verification in build/preview environment');
      return { success: true, status: 'pending', mock: true };
    }

    const verification = await client.verify.v2
      .services(verifyServiceSid!)
      .verifications.create({ to: phoneNumber, channel: 'sms' });
    
    return { success: true, status: verification.status };
  } catch (error) {
    console.error('Error sending verification token:', error);
    return { success: false, error: error };
  }
}

export async function verifyToken(phoneNumber: string, code: string) {
  try {
    // Skip actual verification in build/preview environments or when client is not initialized
    if (!client) {
      console.log('Skipping verification check in build/preview environment');
      // For testing, return success if code is '123456', otherwise return pending
      const mockStatus = code === '123456' ? 'approved' : 'pending';
      return { success: mockStatus === 'approved', status: mockStatus, mock: true };
    }

    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid!)
      .verificationChecks.create({ to: phoneNumber, code });
    
    return { success: verificationCheck.status === 'approved', status: verificationCheck.status };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { success: false, error: error };
  }
}
