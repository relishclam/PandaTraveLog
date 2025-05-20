import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { sendVerificationToken, verifyToken } from '@/lib/twilio';

export async function POST(request: Request) {
  try {
    const { phoneNumber, code, action } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (action === 'send') {
      // Send verification code
      await sendVerificationToken(phoneNumber);
      return NextResponse.json({ 
        success: true, 
        message: 'Verification code sent successfully' 
      });
    } 
    
    if (action === 'verify' && code) {
      // Verify the code
      const verification = await verifyToken(phoneNumber, code);
      
      if (verification.status === 'approved') {
        // Update user's verification status in the database
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { error } = await supabase
            .from('profiles')
            .update({ 
              phone: phoneNumber, 
              is_phone_verified: true 
            })
            .eq('id', user.id);

          if (error) throw error;
        }
        
        return NextResponse.json({ 
          success: true, 
          verified: true,
          message: 'Phone number verified successfully' 
        });
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid verification code' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action or missing code' },
      { status: 400 }
    );
  } catch (error) {
    console.error('OTP Error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
