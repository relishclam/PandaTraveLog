import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifyServiceSid) {
  console.error('Missing Twilio environment variables');
}

const client = twilio(accountSid, authToken);

export async function sendVerificationToken(phoneNumber: string) {
  try {
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
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid!)
      .verificationChecks.create({ to: phoneNumber, code });
    
    return { success: verificationCheck.status === 'approved', status: verificationCheck.status };
  } catch (error) {
    console.error('Error verifying token:', error);
    return { success: false, error: error };
  }
}
