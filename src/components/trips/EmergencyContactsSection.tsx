import React from 'react';
import { ContactCompleteness } from './ContactCompleteness';
import { useEmergencyContacts } from '../../hooks/useEmergencyContacts';

interface EmergencyContactsSectionProps {
  tripId: string;
}

export const EmergencyContactsSection: React.FC<EmergencyContactsSectionProps> = ({
  tripId
}) => {
  const { generateContacts, isGenerating } = useEmergencyContacts(tripId);

  const handleGenerateContacts = async () => {
    await generateContacts();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold mb-4">Emergency Contacts</h2>
      
      <ContactCompleteness 
        tripId={tripId}
        onGenerateContacts={handleGenerateContacts}
      />

      {/* Existing emergency contacts list can go here */}
    </div>
  );
};
