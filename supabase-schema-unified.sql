-- PandaTraveLog Unified Database Schema
-- This schema uses a simple, unified approach for better maintainability

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trips table (using auth.users for user_id reference)
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  description TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed')),
  manual_entry_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_trips
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trip Places table (for structured place data)
CREATE TABLE IF NOT EXISTS trip_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  place_id TEXT, -- Google Places ID or external reference
  place_name TEXT NOT NULL,
  place_address TEXT,
  place_types TEXT[],
  day_number INTEGER,
  order_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_trip_places
BEFORE UPDATE ON trip_places
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trip Itinerary table (simple daily content)
CREATE TABLE IF NOT EXISTS trip_itinerary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_trip_itinerary
BEFORE UPDATE ON trip_itinerary
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trip Companions table
CREATE TABLE IF NOT EXISTS trip_companions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship TEXT,
  whatsapp TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_trip_companions
BEFORE UPDATE ON trip_companions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Trip Emergency Contacts table
CREATE TABLE IF NOT EXISTS trip_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_trip_emergency_contacts
BEFORE UPDATE ON trip_emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Assistant Conversations table (for PO Assistant)
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  session_id TEXT,
  context TEXT CHECK (context IN ('marketing', 'trip_creation', 'diary', 'manual_entry', 'dashboard')),
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_assistant_conversations
BEFORE UPDATE ON assistant_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Row Level Security Policies

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_itinerary ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trip policies (using auth.users reference)
CREATE POLICY "Users can view their own trips"
  ON trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON trips FOR DELETE
  USING (auth.uid() = user_id);

-- Trip Places policies
CREATE POLICY "Users can view trip places for their trips"
  ON trip_places FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_places.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert trip places for their trips"
  ON trip_places FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_places.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update trip places for their trips"
  ON trip_places FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_places.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete trip places for their trips"
  ON trip_places FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_places.trip_id
    AND trips.user_id = auth.uid()
  ));

-- Trip Itinerary policies
CREATE POLICY "Users can view trip itinerary for their trips"
  ON trip_itinerary FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_itinerary.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert trip itinerary for their trips"
  ON trip_itinerary FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_itinerary.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update trip itinerary for their trips"
  ON trip_itinerary FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_itinerary.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete trip itinerary for their trips"
  ON trip_itinerary FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_itinerary.trip_id
    AND trips.user_id = auth.uid()
  ));

-- Trip Companions policies
CREATE POLICY "Users can view trip companions for their trips"
  ON trip_companions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_companions.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert trip companions for their trips"
  ON trip_companions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_companions.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update trip companions for their trips"
  ON trip_companions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_companions.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete trip companions for their trips"
  ON trip_companions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_companions.trip_id
    AND trips.user_id = auth.uid()
  ));

-- Trip Emergency Contacts policies
CREATE POLICY "Users can view trip emergency contacts for their trips"
  ON trip_emergency_contacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_emergency_contacts.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert trip emergency contacts for their trips"
  ON trip_emergency_contacts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_emergency_contacts.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update trip emergency contacts for their trips"
  ON trip_emergency_contacts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_emergency_contacts.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete trip emergency contacts for their trips"
  ON trip_emergency_contacts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_emergency_contacts.trip_id
    AND trips.user_id = auth.uid()
  ));

-- Assistant Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON assistant_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON assistant_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON assistant_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON assistant_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_places_trip_id ON trip_places(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_itinerary_trip_id ON trip_itinerary(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_companions_trip_id ON trip_companions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_emergency_contacts_trip_id ON trip_emergency_contacts(trip_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_id ON assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_trip_id ON assistant_conversations(trip_id);
