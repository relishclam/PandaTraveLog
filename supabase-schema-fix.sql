-- PandaTraveLog Database Schema Fix
-- Priority 1: Align schemas, fix foreign keys, update RLS policies

-- Step 1: Fix foreign key reference in trips table
-- Change from referencing profiles.id to auth.users(id)
ALTER TABLE trips 
DROP CONSTRAINT IF EXISTS trips_user_id_fkey,
ADD CONSTRAINT trips_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Drop the complex schema tables that are causing conflicts
-- These tables are not being used by the current API endpoints
DROP TABLE IF EXISTS trip_day_schedules CASCADE;
DROP TABLE IF EXISTS trip_travel_details CASCADE;
DROP TABLE IF EXISTS trip_accommodations CASCADE;
DROP TABLE IF EXISTS trip_destinations CASCADE;

-- Step 3: Ensure trip_itinerary table has all necessary fields
-- The current trip_itinerary table is the correct simple schema
-- No changes needed as it already has: id, trip_id, day_number, content

-- Step 4: Update RLS policies to match the corrected schema
-- The existing RLS policies already use auth.uid() correctly
-- No changes needed for RLS policies as they already work with auth.users(id)

-- Step 5: Ensure consistency in manual_entry_data storage
-- The trips table already has manual_entry_data as JSONB
-- This will store the complete manual entry structure

-- Step 6: Create a unified view for trip data
-- This view will combine all trip-related data into a single response
CREATE OR REPLACE VIEW trip_complete_view AS
SELECT 
    t.id,
    t.user_id,
    t.name,
    t.destination,
    t.start_date,
    t.end_date,
    t.description,
    t.status,
    t.manual_entry_data,
    t.created_at,
    t.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'id', ti.id,
                'day_number', ti.day_number,
                'content', ti.content,
                'created_at', ti.created_at
            ) ORDER BY ti.day_number
        ) FILTER (WHERE ti.id IS NOT NULL), 
        '[]'
    ) as itinerary,
    COALESCE(
        json_agg(
            json_build_object(
                'id', tp.id,
                'place_name', tp.place_name,
                'place_address', tp.place_address,
                'day_number', tp.day_number,
                'order_number', tp.order_number,
                'notes', tp.notes
            ) ORDER BY tp.day_number, tp.order_number
        ) FILTER (WHERE tp.id IS NOT NULL), 
        '[]'
    ) as places,
    COALESCE(
        json_agg(
            json_build_object(
                'id', tc.id,
                'name', tc.name,
                'email', tc.email,
                'phone', tc.phone,
                'relationship', tc.relationship
            )
        ) FILTER (WHERE tc.id IS NOT NULL), 
        '[]'
    ) as companions,
    COALESCE(
        json_agg(
            json_build_object(
                'id', ec.id,
                'name', ec.name,
                'relationship', ec.relationship,
                'phone', ec.phone,
                'email', ec.email,
                'is_primary', ec.is_primary
            )
        ) FILTER (WHERE ec.id IS NOT NULL), 
        '[]'
    ) as emergency_contacts
FROM trips t
LEFT JOIN trip_itinerary ti ON t.id = ti.trip_id
LEFT JOIN trip_places tp ON t.id = tp.trip_id
LEFT JOIN trip_companions tc ON t.id = tc.trip_id
LEFT JOIN trip_emergency_contacts ec ON t.id = ec.trip_id
GROUP BY t.id, t.user_id, t.name, t.destination, t.start_date, t.end_date, t.description, t.status, t.manual_entry_data, t.created_at, t.updated_at;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_itinerary_trip_id ON trip_itinerary(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_places_trip_id ON trip_places(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_companions_trip_id ON trip_companions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_emergency_contacts_trip_id ON trip_emergency_contacts(trip_id);

-- Step 8: Grant necessary permissions
GRANT SELECT ON trip_complete_view TO authenticated;

-- Step 9: Create a function to get complete trip data
CREATE OR REPLACE FUNCTION get_complete_trip(trip_uuid UUID, user_uuid UUID)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT row_to_json(trip_complete_view.*)
        FROM trip_complete_view
        WHERE id = trip_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
