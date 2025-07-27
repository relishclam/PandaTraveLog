DO $$ 
DECLARE
    table_exists boolean;
BEGIN
    -- Create extension if it doesn't exist
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Check if trips table exists
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'trips'
    ) INTO table_exists;

    -- Create trips table if it doesn't exist
    IF NOT table_exists THEN
        CREATE TABLE trips (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            start_date DATE,
            end_date DATE,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Enable RLS and create policy for trips
        ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Trips are accessible by owner" ON trips
            FOR ALL USING (user_id = auth.uid());
            
        -- Create index for trips
        CREATE INDEX trips_user_id_idx ON trips(user_id);
    END IF;

    -- Create trip_accommodations table
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'trip_accommodations'
    ) INTO table_exists;

    IF NOT table_exists THEN
        CREATE TABLE trip_accommodations (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            contact_info TEXT,
            booking_reference TEXT,
            check_in_date DATE,
            check_out_date DATE,
            notes TEXT,
            has_emergency_info BOOLEAN GENERATED ALWAYS AS (
                COALESCE(phone, '') != '' OR COALESCE(contact_info, '') != ''
            ) STORED,
            validation_status JSONB DEFAULT '{"missing_fields": [], "warnings": []}',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Enable RLS and create policy
        ALTER TABLE trip_accommodations ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Trip accommodations are accessible by owner" ON trip_accommodations
            FOR ALL USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
            
        -- Create index
        CREATE INDEX trip_accommodations_trip_id_idx ON trip_accommodations(trip_id);
    END IF;

    -- Create trip_travel_details table
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'trip_travel_details'
    ) INTO table_exists;

    IF NOT table_exists THEN
        CREATE TABLE trip_travel_details (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            provider TEXT,
            mode TEXT,
            departure_location TEXT,
            arrival_location TEXT,
            departure_date TIMESTAMPTZ,
            arrival_date TIMESTAMPTZ,
            booking_reference TEXT,
            contact_phone TEXT,
            emergency_contact TEXT,
            provider_website TEXT,
            notes TEXT,
            has_emergency_info BOOLEAN GENERATED ALWAYS AS (
                COALESCE(contact_phone, '') != '' OR COALESCE(emergency_contact, '') != ''
            ) STORED,
            validation_status JSONB DEFAULT '{"missing_fields": [], "warnings": []}',
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Enable RLS and create policy
        ALTER TABLE trip_travel_details ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Trip travel details are accessible by owner" ON trip_travel_details
            FOR ALL USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
            
        -- Create index
        CREATE INDEX trip_travel_details_trip_id_idx ON trip_travel_details(trip_id);
    END IF;

    -- Create trip_schedules table
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'trip_schedules'
    ) INTO table_exists;

    IF NOT table_exists THEN
        CREATE TABLE trip_schedules (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            day_number INTEGER NOT NULL,
            title TEXT,
            description TEXT,
            start_time TIME,
            end_time TIME,
            location TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Enable RLS and create policy
        ALTER TABLE trip_schedules ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Trip schedules are accessible by owner" ON trip_schedules
            FOR ALL USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));
            
        -- Create index
        CREATE INDEX trip_schedules_trip_day_idx ON trip_schedules(trip_id, day_number);
    END IF;

    -- Create travel_contacts table
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'travel_contacts'
    ) INTO table_exists;

    IF NOT table_exists THEN
        CREATE TABLE travel_contacts (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            phone TEXT,
            type TEXT,
            address TEXT,
            notes TEXT,
            priority INTEGER DEFAULT 3,
            is_verified BOOLEAN DEFAULT false,
            is_ai_generated BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Enable RLS and create policy
        ALTER TABLE travel_contacts ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Travel contacts are accessible by owner" ON travel_contacts
            FOR ALL USING (user_id = auth.uid());
            
        -- Create index
        CREATE INDEX travel_contacts_user_trip_idx ON travel_contacts(user_id, trip_id);
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating tables: %', SQLERRM;
    RAISE;
    -- Create a view for missing contact information
    CREATE OR REPLACE VIEW trip_contact_completeness AS
    WITH trip_summary AS (
        SELECT 
            t.id as trip_id,
            t.user_id,
            t.title as trip_title,
            COUNT(DISTINCT CASE WHEN ta.has_emergency_info THEN ta.id END) as accommodations_with_contacts,
            COUNT(DISTINCT ta.id) as total_accommodations,
            COUNT(DISTINCT CASE WHEN td.has_emergency_info THEN td.id END) as travel_details_with_contacts,
            COUNT(DISTINCT td.id) as total_travel_details,
            COUNT(DISTINCT tc.id) as emergency_contacts,
            CASE 
                WHEN COUNT(DISTINCT ta.id) > 0 AND COUNT(DISTINCT CASE WHEN ta.has_emergency_info THEN ta.id END) = 0 THEN true
                ELSE false
            END as missing_accommodation_contacts,
            CASE 
                WHEN COUNT(DISTINCT td.id) > 0 AND COUNT(DISTINCT CASE WHEN td.has_emergency_info THEN td.id END) = 0 THEN true
                ELSE false
            END as missing_travel_contacts
        FROM trips t
        LEFT JOIN trip_accommodations ta ON t.id = ta.trip_id
        LEFT JOIN trip_travel_details td ON t.id = td.trip_id
        LEFT JOIN travel_contacts tc ON t.id = tc.trip_id
        GROUP BY t.id, t.user_id, t.title
    )
    SELECT 
        trip_id,
        user_id,
        trip_title,
        accommodations_with_contacts,
        total_accommodations,
        travel_details_with_contacts,
        total_travel_details,
        emergency_contacts,
        JSONB_BUILD_OBJECT(
            'status', CASE 
                WHEN emergency_contacts > 0 AND 
                     (accommodations_with_contacts = total_accommodations OR total_accommodations = 0) AND
                     (travel_details_with_contacts = total_travel_details OR total_travel_details = 0)
                THEN 'complete'
                WHEN emergency_contacts = 0 AND missing_accommodation_contacts = false AND missing_travel_contacts = false
                THEN 'partial'
                ELSE 'incomplete'
            END,
            'missing_contacts', CASE 
                WHEN missing_accommodation_contacts THEN JSONB_BUILD_ARRAY('accommodation_contacts')
                ELSE JSONB_BUILD_ARRAY()
            END || CASE
                WHEN missing_travel_contacts THEN JSONB_BUILD_ARRAY('travel_contacts')
                ELSE JSONB_BUILD_ARRAY()
            END || CASE
                WHEN emergency_contacts = 0 THEN JSONB_BUILD_ARRAY('emergency_contacts')
                ELSE JSONB_BUILD_ARRAY()
            END,
            'recommendations', JSONB_BUILD_ARRAY(
                CASE WHEN missing_accommodation_contacts 
                     THEN 'Add contact information for accommodations'
                     ELSE NULL
                END,
                CASE WHEN missing_travel_contacts 
                     THEN 'Add contact information for travel arrangements'
                     ELSE NULL
                END,
                CASE WHEN emergency_contacts = 0 
                     THEN 'Generate or add emergency contacts'
                     ELSE NULL
                END
            ) - NULL
        ) as contact_status
    FROM trip_summary
    WHERE user_id = auth.uid();

    -- Create RLS policy for the view
    ALTER VIEW trip_contact_completeness OWNER TO authenticated;
    GRANT SELECT ON trip_contact_completeness TO authenticated;

    -- Create a function to get missing contact recommendations
    CREATE OR REPLACE FUNCTION get_contact_recommendations(trip_id UUID)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result JSONB;
    BEGIN
        SELECT contact_status
        INTO result
        FROM trip_contact_completeness
        WHERE trip_contact_completeness.trip_id = $1
        AND user_id = auth.uid();

        RETURN result;
    END;
    $$;

    -- Grant execute permission on the function
    GRANT EXECUTE ON FUNCTION get_contact_recommendations TO authenticated;

END $$;
