import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Email verification error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=verification_failed`)
      }

      if (data.user) {
        console.log('✅ Email verification successful for:', data.user.email)
        
        // Create or update user profile using metadata from signup
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || '',
          phone: data.user.user_metadata?.phone || '',
          is_phone_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't fail the entire flow for profile errors
        }

        // Redirect to trips page on successful verification
        return NextResponse.redirect(`${requestUrl.origin}/trips?verified=true`)
      }
    } catch (err) {
      console.error('Verification callback error:', err)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=verification_failed`)
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
