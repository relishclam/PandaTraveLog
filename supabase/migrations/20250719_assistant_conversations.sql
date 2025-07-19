-- Create assistant_conversations table to store conversation history
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context TEXT NOT NULL DEFAULT 'general',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one conversation per user per context
  UNIQUE(user_id, context)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_context 
ON assistant_conversations(user_id, context);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_updated_at 
ON assistant_conversations(updated_at DESC);

-- Enable RLS
ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assistant_conversations_updated_at 
BEFORE UPDATE ON assistant_conversations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
