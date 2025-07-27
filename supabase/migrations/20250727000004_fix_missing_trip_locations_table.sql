-- Drop existing table if exists
DROP TABLE IF EXISTS public.trip_locations;

-- Create trip_locations table
CREATE TABLE public.trip_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    day INTEGER,
    order_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

-- Add policy
DROP POLICY IF EXISTS "Trip locations are viewable by owner" ON trip_locations;
CREATE POLICY "Trip locations are viewable by owner" ON trip_locations
    FOR ALL USING (
        trip_id IN (
            SELECT id FROM trips 
            WHERE user_id = auth.uid()
        )
    );

-- Add indexes
DROP INDEX IF EXISTS trip_locations_trip_id_idx;
DROP INDEX IF EXISTS trip_locations_day_order_idx;
CREATE INDEX trip_locations_trip_id_idx ON trip_locations(trip_id);
CREATE INDEX trip_locations_day_order_idx ON trip_locations(day, order_number);
