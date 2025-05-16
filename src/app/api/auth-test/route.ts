// c:\Users\user\Desktop\PandaTraveLog\pandatravelog\src\app\api\auth-test\route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  // Only return non-secret, public env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Log for debugging (will show in Netlify function logs)
  console.log("Auth-test endpoint hit");
  console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
  console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "[SET]" : "[NOT SET]");

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? "[SET]" : "[NOT SET]",
    // Never return secrets!
  });
}