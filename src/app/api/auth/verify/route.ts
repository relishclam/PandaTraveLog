import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/twilio';
import supabase from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phoneNumber, code, userId } = body;
    
    if (!phoneNumber || !code) {
      return NextResponse.json(
        { success: false, message: 'Phone number and code are required' },
        { status: 400 }
      );
    }
    
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const result = await verifyToken(formattedNumber, code);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // If userId is provided, update the user's phone verification status
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone: formattedNumber,
          is_phone_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        console.error('Error updating user profile:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to update user profile' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Phone number verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
}
