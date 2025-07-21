import { NextRequest } from 'next/server';
import { getAuthenticatedUser, createAuthErrorResponse, createErrorResponse, createSuccessResponse } from '@/utils/api-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Profile update API called');
    
    // Use the new auth utility that matches middleware cookie handling
    const { user, supabase } = await getAuthenticatedUser();
    
    if (!user || !supabase) {
      console.log('❌ Authentication failed');
      return createAuthErrorResponse();
    }

    console.log('✅ User authenticated:', user.email);

    const body = await request.json();
    const { name, phone } = body;

    console.log('📊 Profile update data:', { name, phone, userId: user.id });

    // Update profile using the authenticated supabase client
    const { error } = await supabase
      .from('profiles')
      .update({ 
        name, 
        phone, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id);

    if (error) {
      console.error('❌ Profile update database error:', error);
      return createErrorResponse(error);
    }

    console.log('✅ Profile updated successfully');
    return createSuccessResponse({ message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('💥 Profile update API error:', error);
    return createErrorResponse(error);
  }
}