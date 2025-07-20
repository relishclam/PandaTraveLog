-- Fix RLS policies for trips table to allow authenticated users to manage their own trips

-- Enable RLS on trips table (if not already enabled)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can insert their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON public.trips;

-- Create comprehensive RLS policies for trips table
-- Allow users to view their own trips
CREATE POLICY "Users can view their own trips" ON public.trips
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own trips
CREATE POLICY "Users can insert their own trips" ON public.trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own trips
CREATE POLICY "Users can update their own trips" ON public.trips
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own trips
CREATE POLICY "Users can delete their own trips" ON public.trips
    FOR DELETE USING (auth.uid() = user_id);

-- Also fix related tables that might have similar issues

-- Trip destinations
ALTER TABLE public.trip_destinations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage destinations for their trips" ON public.trip_destinations;
CREATE POLICY "Users can manage destinations for their trips" ON public.trip_destinations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE trips.id = trip_destinations.trip_id 
        AND trips.user_id = auth.uid()
    ));

-- Trip accommodations
ALTER TABLE public.trip_accommodations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage accommodations for their trips" ON public.trip_accommodations;
CREATE POLICY "Users can manage accommodations for their trips" ON public.trip_accommodations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE trips.id = trip_accommodations.trip_id 
        AND trips.user_id = auth.uid()
    ));

-- Trip day schedules
ALTER TABLE public.trip_day_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage schedules for their trips" ON public.trip_day_schedules;
CREATE POLICY "Users can manage schedules for their trips" ON public.trip_day_schedules
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE trips.id = trip_day_schedules.trip_id 
        AND trips.user_id = auth.uid()
    ));

-- Trip travel details
ALTER TABLE public.trip_travel_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage travel details for their trips" ON public.trip_travel_details;
CREATE POLICY "Users can manage travel details for their trips" ON public.trip_travel_details
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE trips.id = trip_travel_details.trip_id 
        AND trips.user_id = auth.uid()
    ));

-- Trip itinerary
ALTER TABLE public.trip_itinerary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage itinerary for their trips" ON public.trip_itinerary;
CREATE POLICY "Users can manage itinerary for their trips" ON public.trip_itinerary
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE trips.id = trip_itinerary.trip_id 
        AND trips.user_id = auth.uid()
    ));

-- Trip companions
ALTER TABLE public.trip_companions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage companions for their trips" ON public.trip_companions;
CREATE POLICY "Users can manage companions for their trips" ON public.trip_companions
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE trips.id = trip_companions.trip_id 
        AND trips.user_id = auth.uid()
    ));

-- Trip enrichment log
ALTER TABLE public.trip_enrichment_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view enrichment log for their trips" ON public.trip_enrichment_log;
CREATE POLICY "Users can view enrichment log for their trips" ON public.trip_enrichment_log
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.trips 
        WHERE trips.id = trip_enrichment_log.trip_id 
        AND trips.user_id = auth.uid()
    ));

-- Also ensure the users table has proper RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
