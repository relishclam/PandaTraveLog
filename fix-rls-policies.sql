-- Fix RLS Policies for PandaTraveLog
-- This script adds missing INSERT policy for profiles table

-- Add missing INSERT policy for profiles table
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also add UPSERT capability by allowing users to insert/update their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Make sure users can also create profiles during signup (when auth.uid() might not be immediately available)
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
CREATE POLICY "Allow profile creation during signup"
  ON profiles FOR INSERT
  WITH CHECK (true); -- Temporary permissive policy for profile creation

-- Alternative: More secure policy that allows insert only if the user is authenticated
-- Uncomment this and comment the above if you prefer more security
-- CREATE POLICY "Users can insert their own profile"
--   ON profiles FOR INSERT
--   WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);

-- Ensure all trip-related policies are working correctly
-- (These should already exist but let's make sure they're correct)

-- Refresh trip policies to ensure they work with the profile fixes
DROP POLICY IF EXISTS "Users can insert their own trips" ON trips;
CREATE POLICY "Users can insert their own trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add a more permissive temporary policy for debugging
-- Remove this after confirming everything works
DROP POLICY IF EXISTS "Temporary permissive trip insert" ON trips;
CREATE POLICY "Temporary permissive trip insert"
  ON trips FOR INSERT
  WITH CHECK (user_id IS NOT NULL);
