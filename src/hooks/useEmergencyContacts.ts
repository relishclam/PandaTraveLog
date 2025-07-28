import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface ContactStatus {
  status: 'complete' | 'partial' | 'incomplete';
  missing_contacts: string[];
  recommendations: string[];
}

export function useEmergencyContacts(tripId: string) {
  const [isGenerating, setIsGenerating] = useState(false);
  const supabase = createClient();

  const generateContacts = async () => {
    try {
      setIsGenerating(true);
      
      // Fetch trip data to get destination info
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;

      // Create new emergency contacts for the destination
      const { data: contactData, error: contactError } = await supabase
        .from('emergency_contacts')
        .insert([
          {
            trip_id: tripId,
            name: 'Local Emergency Services',
            phone: '112', // Default international emergency number
            type: 'emergency_services',
            notes: 'General emergency services number',
          },
          {
            trip_id: tripId,
            name: 'Local Police',
            type: 'police',
            notes: 'Local police department contact',
          },
          {
            trip_id: tripId,
            name: 'Local Hospital',
            type: 'hospital',
            notes: 'Nearest hospital or medical facility',
          }
        ])
        .select();

      if (contactError) throw contactError;

      return contactData;
    } catch (error) {
      console.error('Error generating emergency contacts:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const getContactStatus = async (): Promise<ContactStatus> => {
    try {
      const { data, error } = await supabase
        .rpc('get_contact_recommendations', { trip_id: tripId });

      if (error) throw error;
      return data as ContactStatus;
    } catch (error) {
      console.error('Error getting contact status:', error);
      throw error;
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  };

  return {
    generateContacts,
    getContactStatus,
    deleteContact,
    isGenerating
  };
}
