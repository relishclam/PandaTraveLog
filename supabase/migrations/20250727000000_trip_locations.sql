-- Create trip_locations table
CREATE TABLE IF NOT EXISTS trip_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    place_id TEXT,
    type TEXT,
    day INTEGER,
    order_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add row level security (RLS) policies
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip locations are viewable by owner" ON trip_locations
  FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Trip locations are editable by owner" ON trip_locations
  FOR INSERT
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Trip locations are updatable by owner" ON trip_locations
  FOR UPDATE
  USING (
    trip_id IN (
      SELECT id FROM trips 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Trip locations are deletable by owner" ON trip_locations
  FOR DELETE
  USING (
    trip_id IN (
      SELECT id FROM trips 
      WHERE user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS trip_locations_trip_id_idx ON trip_locations(trip_id);
CREATE INDEX IF NOT EXISTS trip_locations_day_order_idx ON trip_locations(day, order_number);
