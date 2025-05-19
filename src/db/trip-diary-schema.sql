-- Trip Diary Database Schema
-- This file documents the database structure for the Trip Diary feature
-- These tables should be created in the Supabase database

-- Itineraries Table - Stores the main itinerary information
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add a constraint to ensure only one itinerary per trip
  UNIQUE (trip_id)
);

-- Itinerary Days Table - Stores each day of the itinerary
CREATE TABLE IF NOT EXISTS itinerary_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add a constraint to ensure unique day numbers within an itinerary
  UNIQUE (itinerary_id, day_number)
);

-- Activities Table - Stores activities for each day
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  start_time TEXT,
  end_time TEXT,
  duration TEXT,
  location_name TEXT,
  location_address TEXT,
  location_place_id TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  map_url TEXT,
  image_url TEXT,
  cost TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Meals Table - Stores meal suggestions for each day
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_id UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', etc.
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  cost TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add a constraint to ensure unique meal types per day
  UNIQUE (day_id, meal_type)
);

-- Trip Companions Table - Stores people accompanying on the trip
CREATE TABLE IF NOT EXISTS trip_companions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  notes TEXT,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Emergency Contacts Table - Stores emergency contacts for the trip
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL, -- 'medical', 'police', 'embassy', etc.
  address TEXT,
  notes TEXT,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add a status column to the existing trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_id ON itineraries(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_day_itinerary_id ON itinerary_days(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_activity_day_id ON activities(day_id);
CREATE INDEX IF NOT EXISTS idx_meal_day_id ON meals(day_id);
CREATE INDEX IF NOT EXISTS idx_companion_trip_id ON trip_companions(trip_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contact_trip_id ON emergency_contacts(trip_id);
