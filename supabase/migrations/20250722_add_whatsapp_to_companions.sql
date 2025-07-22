-- Add WhatsApp field to trip_companions table
-- This allows storing both relationship info and WhatsApp numbers for direct chat functionality

ALTER TABLE public.trip_companions 
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Add comment to document the purpose
COMMENT ON COLUMN public.trip_companions.whatsapp IS 'WhatsApp number for direct chat functionality';
COMMENT ON COLUMN public.trip_companions.relationship IS 'Relationship to the trip owner (Friend, Family, etc.)';
