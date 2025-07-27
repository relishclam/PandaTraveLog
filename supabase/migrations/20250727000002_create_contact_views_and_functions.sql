-- Drop existing view if it exists
DROP VIEW IF EXISTS trip_contact_completeness;

-- Create a view for missing contact information
CREATE VIEW trip_contact_completeness AS
WITH trip_summary AS (
    SELECT 
        t.id as trip_id,
        t.user_id,
        t.title as trip_title,
        COUNT(DISTINCT CASE WHEN ta.has_emergency_info THEN ta.id END) as accommodations_with_contacts,
        COUNT(DISTINCT ta.id) as total_accommodations,
        COUNT(DISTINCT CASE WHEN td.has_emergency_info THEN td.id END) as travel_details_with_contacts,
        COUNT(DISTINCT td.id) as total_travel_details,
        COUNT(DISTINCT tc.id) as emergency_contacts,
        CASE 
            WHEN COUNT(DISTINCT ta.id) > 0 AND COUNT(DISTINCT CASE WHEN ta.has_emergency_info THEN ta.id END) = 0 THEN true
            ELSE false
        END as missing_accommodation_contacts,
        CASE 
            WHEN COUNT(DISTINCT td.id) > 0 AND COUNT(DISTINCT CASE WHEN td.has_emergency_info THEN td.id END) = 0 THEN true
            ELSE false
        END as missing_travel_contacts
    FROM trips t
    LEFT JOIN trip_accommodations ta ON t.id = ta.trip_id
    LEFT JOIN trip_travel_details td ON t.id = td.trip_id
    LEFT JOIN travel_contacts tc ON t.id = tc.trip_id
    GROUP BY t.id, t.user_id, t.title
)
SELECT 
    trip_id,
    user_id,
    trip_title,
    accommodations_with_contacts,
    total_accommodations,
    travel_details_with_contacts,
    total_travel_details,
    emergency_contacts,
    JSONB_BUILD_OBJECT(
        'status', CASE 
            WHEN emergency_contacts > 0 AND 
                 (accommodations_with_contacts = total_accommodations OR total_accommodations = 0) AND
                 (travel_details_with_contacts = total_travel_details OR total_travel_details = 0)
            THEN 'complete'
            WHEN emergency_contacts = 0 AND missing_accommodation_contacts = false AND missing_travel_contacts = false
            THEN 'partial'
            ELSE 'incomplete'
        END,
        'missing_contacts', CASE 
            WHEN missing_accommodation_contacts THEN JSONB_BUILD_ARRAY('accommodation_contacts')
            ELSE JSONB_BUILD_ARRAY()
        END || CASE
            WHEN missing_travel_contacts THEN JSONB_BUILD_ARRAY('travel_contacts')
            ELSE JSONB_BUILD_ARRAY()
        END || CASE
            WHEN emergency_contacts = 0 THEN JSONB_BUILD_ARRAY('emergency_contacts')
            ELSE JSONB_BUILD_ARRAY()
        END,
        'recommendations', JSONB_BUILD_ARRAY(
            CASE WHEN missing_accommodation_contacts 
                 THEN 'Add contact information for accommodations'
                 ELSE NULL
            END,
            CASE WHEN missing_travel_contacts 
                 THEN 'Add contact information for travel arrangements'
                 ELSE NULL
            END,
            CASE WHEN emergency_contacts = 0 
                 THEN 'Generate or add emergency contacts'
                 ELSE NULL
            END
        ) - NULL
    ) as contact_status
FROM trip_summary
WHERE user_id = auth.uid();

-- Create RLS policy for the view
ALTER VIEW trip_contact_completeness OWNER TO authenticated;
GRANT SELECT ON trip_contact_completeness TO authenticated;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_contact_recommendations;

-- Create function for getting contact recommendations
CREATE FUNCTION get_contact_recommendations(trip_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    contact_status_result jsonb;
BEGIN
    SELECT contact_status INTO contact_status_result
    FROM trip_contact_completeness
    WHERE trip_contact_completeness.trip_id = $1
    AND user_id = auth.uid();
    
    RETURN contact_status_result;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_contact_recommendations TO authenticated;
