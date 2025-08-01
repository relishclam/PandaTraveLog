-- SQL to create auth.users entries for existing profile users
-- Note: These need to be created through Supabase Admin API or Dashboard
-- This script provides the data structure for manual creation

-- You can run this script if you have service role access, or use the data below for manual creation

-- Option 1: Using Supabase service role (if you have admin access)
-- This requires service role key and admin privileges

DO $$
DECLARE
    user_record RECORD;
    users_data JSON := '[
        {
            "id": "231c32f0-59a9-4554-b61c-d5a3cd78b214",
            "email": "sujotous@yahoo.com",
            "name": "Sujit Thomas",
            "phone": "+642102550072"
        },
        {
            "id": "53df048c-93c5-4a58-8ccb-4b3e7a172b32",
            "email": "motty.philip@gmail.com",
            "name": "Motty Philip",
            "phone": "+919446012324"
        },
        {
            "id": "aaef0bbd-58a1-4bcc-af34-0735f3c8c55f",
            "email": "sherinemotty@gmail.com",
            "name": "Sherine motty",
            "phone": "9446051944"
        },
        {
            "id": "c0c5ecff-5f89-4626-bf4a-45de486a4c8f",
            "email": "joshua.mathews9@gmail.com",
            "name": "Joshua Mathews",
            "phone": "+60146464493"
        },
        {
            "id": "e826aaf3-135b-4809-958a-4bbb7974458b",
            "email": "jaygeorge777@gmail.com",
            "name": "Jaya George",
            "phone": ""
        }
    ]'::JSON;
BEGIN
    RAISE NOTICE 'Creating auth users for existing profiles...';
    
    FOR user_record IN 
        SELECT 
            (value->>'id')::UUID as id,
            value->>'email' as email,
            value->>'name' as name,
            value->>'phone' as phone
        FROM JSON_ARRAY_ELEMENTS(users_data) 
    LOOP
        -- Check if auth user already exists
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_record.id) THEN
            RAISE NOTICE 'User % needs to be created in auth.users', user_record.email;
        ELSE
            RAISE NOTICE 'User % already exists in auth.users', user_record.email;
        END IF;
    END LOOP;
END $$;

-- Option 2: Manual creation data (use this in Supabase Dashboard)
-- Go to Authentication → Users → Add User and use these details:

/*
USER 1:
- Email: sujotous@yahoo.com
- Password: (set a temporary password like TempPass123!)
- User ID: 231c32f0-59a9-4554-b61c-d5a3cd78b214
- Metadata: {"name": "Sujit Thomas", "phone": "+642102550072"}

USER 2:
- Email: motty.philip@gmail.com  
- Password: (set a temporary password like TempPass123!)
- User ID: 53df048c-93c5-4a58-8ccb-4b3e7a172b32
- Metadata: {"name": "Motty Philip", "phone": "+919446012324"}

USER 3:
- Email: sherinemotty@gmail.com
- Password: (set a temporary password like TempPass123!)
- User ID: aaef0bbd-58a1-4bcc-af34-0735f3c8c55f
- Metadata: {"name": "Sherine motty", "phone": "9446051944"}

USER 4:
- Email: joshua.mathews9@gmail.com
- Password: (set a temporary password like TempPass123!)
- User ID: c0c5ecff-5f89-4626-bf4a-45de486a4c8f
- Metadata: {"name": "Joshua Mathews", "phone": "+60146464493"}

USER 5:
- Email: jaygeorge777@gmail.com
- Password: (set a temporary password like TempPass123!)
- User ID: e826aaf3-135b-4809-958a-4bbb7974458b
- Metadata: {"name": "Jaya George", "phone": ""}
*/

-- Option 3: Update existing profiles to ensure they're properly linked
-- (Run this after creating the auth users)

UPDATE public.profiles 
SET 
    name = CASE id
        WHEN '231c32f0-59a9-4554-b61c-d5a3cd78b214' THEN 'Sujit Thomas'
        WHEN '53df048c-93c5-4a58-8ccb-4b3e7a172b32' THEN 'Motty Philip'
        WHEN 'aaef0bbd-58a1-4bcc-af34-0735f3c8c55f' THEN 'Sherine motty'
        WHEN 'c0c5ecff-5f89-4626-bf4a-45de486a4c8f' THEN 'Joshua Mathews'
        WHEN 'e826aaf3-135b-4809-958a-4bbb7974458b' THEN 'Jaya George'
        ELSE name
    END,
    email = CASE id
        WHEN '231c32f0-59a9-4554-b61c-d5a3cd78b214' THEN 'sujotous@yahoo.com'
        WHEN '53df048c-93c5-4a58-8ccb-4b3e7a172b32' THEN 'motty.philip@gmail.com'
        WHEN 'aaef0bbd-58a1-4bcc-af34-0735f3c8c55f' THEN 'sherinemotty@gmail.com'
        WHEN 'c0c5ecff-5f89-4626-bf4a-45de486a4c8f' THEN 'joshua.mathews9@gmail.com'
        WHEN 'e826aaf3-135b-4809-958a-4bbb7974458b' THEN 'jaygeorge777@gmail.com'
        ELSE email
    END,
    phone = CASE id
        WHEN '231c32f0-59a9-4554-b61c-d5a3cd78b214' THEN '+642102550072'
        WHEN '53df048c-93c5-4a58-8ccb-4b3e7a172b32' THEN '+919446012324'
        WHEN 'aaef0bbd-58a1-4bcc-af34-0735f3c8c55f' THEN '9446051944'
        WHEN 'c0c5ecff-5f89-4626-bf4a-45de486a4c8f' THEN '+60146464493'
        WHEN 'e826aaf3-135b-4809-958a-4bbb7974458b' THEN ''
        ELSE phone
    END,
    updated_at = NOW()
WHERE id IN (
    '231c32f0-59a9-4554-b61c-d5a3cd78b214',
    '53df048c-93c5-4a58-8ccb-4b3e7a172b32',
    'aaef0bbd-58a1-4bcc-af34-0735f3c8c55f',
    'c0c5ecff-5f89-4626-bf4a-45de486a4c8f',
    'e826aaf3-135b-4809-958a-4bbb7974458b'
);

-- Also update users table for backward compatibility
UPDATE public.users 
SET 
    email = CASE id
        WHEN '231c32f0-59a9-4554-b61c-d5a3cd78b214' THEN 'sujotous@yahoo.com'
        WHEN '53df048c-93c5-4a58-8ccb-4b3e7a172b32' THEN 'motty.philip@gmail.com'
        WHEN 'aaef0bbd-58a1-4bcc-af34-0735f3c8c55f' THEN 'sherinemotty@gmail.com'
        WHEN 'c0c5ecff-5f89-4626-bf4a-45de486a4c8f' THEN 'joshua.mathews9@gmail.com'
        WHEN 'e826aaf3-135b-4809-958a-4bbb7974458b' THEN 'jaygeorge777@gmail.com'
        ELSE email
    END,
    full_name = CASE id
        WHEN '231c32f0-59a9-4554-b61c-d5a3cd78b214' THEN 'Sujit Thomas'
        WHEN '53df048c-93c5-4a58-8ccb-4b3e7a172b32' THEN 'Motty Philip'
        WHEN 'aaef0bbd-58a1-4bcc-af34-0735f3c8c55f' THEN 'Sherine motty'
        WHEN 'c0c5ecff-5f89-4626-bf4a-45de486a4c8f' THEN 'Joshua Mathews'
        WHEN 'e826aaf3-135b-4809-958a-4bbb7974458b' THEN 'Jaya George'
        ELSE full_name
    END,
    phone_number = CASE id
        WHEN '231c32f0-59a9-4554-b61c-d5a3cd78b214' THEN '+642102550072'
        WHEN '53df048c-93c5-4a58-8ccb-4b3e7a172b32' THEN '+919446012324'
        WHEN 'aaef0bbd-58a1-4bcc-af34-0735f3c8c55f' THEN '9446051944'
        WHEN 'c0c5ecff-5f89-4626-bf4a-45de486a4c8f' THEN '+60146464493'
        WHEN 'e826aaf3-135b-4809-958a-4bbb7974458b' THEN ''
        ELSE phone_number
    END,
    updated_at = NOW()
WHERE id IN (
    '231c32f0-59a9-4554-b61c-d5a3cd78b214',
    '53df048c-93c5-4a58-8ccb-4b3e7a172b32',
    'aaef0bbd-58a1-4bcc-af34-0735f3c8c55f',
    'c0c5ecff-5f89-4626-bf4a-45de486a4c8f',
    'e826aaf3-135b-4809-958a-4bbb7974458b'
);
