-- Fix trip_companions table schema
-- First, check if the table exists and what columns it has
DO $$
BEGIN
    -- If the table doesn't exist, create it
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trip_companions') THEN
        CREATE TABLE trip_companions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            relationship VARCHAR(100),
            emergency_contact BOOLEAN DEFAULT false,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(trip_id, user_id, email)
        );
    ELSE
        -- If table exists, add missing columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trip_companions' AND column_name = 'user_id') THEN
            ALTER TABLE trip_companions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trip_companions' AND column_name = 'trip_id') THEN
            ALTER TABLE trip_companions ADD COLUMN trip_id UUID REFERENCES trips(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trip_companions' AND column_name = 'name') THEN
            ALTER TABLE trip_companions ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trip_companions' AND column_name = 'email') THEN
            ALTER TABLE trip_companions ADD COLUMN email VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trip_companions' AND column_name = 'phone') THEN
            ALTER TABLE trip_companions ADD COLUMN phone VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trip_companions' AND column_name = 'relationship') THEN
            ALTER TABLE trip_companions ADD COLUMN relationship VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trip_companions' AND column_name = 'emergency_contact') THEN
            ALTER TABLE trip_companions ADD COLUMN emergency_contact BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'trip_companions' AND column_name = 'notes') THEN
            ALTER TABLE trip_companions ADD COLUMN notes TEXT;
        END IF;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE trip_companions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own trip companions" ON trip_companions;
CREATE POLICY "Users can view their own trip companions" ON trip_companions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own trip companions" ON trip_companions;
CREATE POLICY "Users can insert their own trip companions" ON trip_companions
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own trip companions" ON trip_companions;
CREATE POLICY "Users can update their own trip companions" ON trip_companions
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own trip companions" ON trip_companions;
CREATE POLICY "Users can delete their own trip companions" ON trip_companions
    FOR DELETE USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_companions_trip_id ON trip_companions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_companions_user_id ON trip_companions(user_id);
