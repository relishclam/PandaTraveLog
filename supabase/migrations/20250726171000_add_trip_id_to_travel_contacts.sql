ALTER TABLE public.travel_contacts
ADD COLUMN trip_id UUID;

ALTER TABLE public.travel_contacts
ADD CONSTRAINT fk_trip_id
FOREIGN KEY (trip_id)
REFERENCES public.trips(id)
ON DELETE CASCADE;

-- Make user_id nullable, as a contact can belong to a trip without being a user's global contact
ALTER TABLE public.travel_contacts
ALTER COLUMN user_id DROP NOT NULL;
