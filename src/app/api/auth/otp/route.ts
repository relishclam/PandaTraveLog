import { NextResponse } from 'next/server';
import { sendVerificationToken } from '@/lib/twilio';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phoneNumber } = body;
    
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const result = await sendVerificationToken(formattedNumber);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Failed to send verification code' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
