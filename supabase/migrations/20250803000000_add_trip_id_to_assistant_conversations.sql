-- Add missing trip_id column to assistant_conversations table
ALTER TABLE assistant_conversations 
ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE CASCADE;

-- Add session_id column for better session management
ALTER TABLE assistant_conversations 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Update the context column to include new values
ALTER TABLE assistant_conversations 
DROP CONSTRAINT IF EXISTS assistant_conversations_context_check;

ALTER TABLE assistant_conversations 
ADD CONSTRAINT assistant_conversations_context_check 
CHECK (context IN ('general', 'marketing', 'trip_creation', 'diary', 'manual_entry', 'dashboard'));

-- Remove the unique constraint on user_id, context since we now support multiple conversations per context
ALTER TABLE assistant_conversations 
DROP CONSTRAINT IF EXISTS assistant_conversations_user_id_context_key;

-- Create new indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_trip_id 
ON assistant_conversations(trip_id);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_session_id 
ON assistant_conversations(session_id);

-- Update the schema to match expected structure - change messages to individual columns
-- First, check if we need to restructure the table
DO $$
BEGIN
    -- Check if role column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assistant_conversations' 
                   AND column_name = 'role') THEN
        ALTER TABLE assistant_conversations ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
    END IF;
    
    -- Check if message column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assistant_conversations' 
                   AND column_name = 'message') THEN
        ALTER TABLE assistant_conversations ADD COLUMN message TEXT;
    END IF;
END
$$;

-- Update the table structure to store individual messages instead of JSONB array
-- This might require data migration if there's existing data
COMMENT ON TABLE assistant_conversations IS 'Stores individual conversation messages for PO Assistant';
