-- Drop existing policies
DROP POLICY IF EXISTS "Trips are accessible by owner" ON trips;

-- Create separate policies for each operation
CREATE POLICY "Enable read for users own trips"
ON trips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users own trips"
ON trips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users own trips"
ON trips FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users own trips"
ON trips FOR DELETE
USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
