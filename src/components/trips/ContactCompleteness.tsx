import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert/index';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface ContactStatusType {
  hasEmergencyServices: boolean;
  hasHospital: boolean;
  hasPolice: boolean;
  hasEmbassy: boolean;
  status?: string;
  missing_contacts?: string[];
  recommendations?: string[];
}

interface ContactCompletenessProps {
  tripId: string;
  onGenerateContacts: () => Promise<void>;
}

export const ContactCompleteness: React.FC<ContactCompletenessProps> = ({
  tripId,
  onGenerateContacts
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [contactStatus, setContactStatus] = React.useState<ContactStatusType>({
    hasEmergencyServices: false,
    hasHospital: false,
    hasPolice: false,
    hasEmbassy: false,
  });

  const statusColors = {
    complete: 'bg-green-50 border-green-200',
    partial: 'bg-yellow-50 border-yellow-200',
    incomplete: 'bg-red-50 border-red-200'
  };

  const statusIcons = {
    complete: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    partial: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    incomplete: <AlertCircle className="h-5 w-5 text-red-500" />
  };

  const formatMissingContact = (contact: string) => {
    return contact
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const supabase = createClient();

  React.useEffect(() => {
    const checkContactStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('emergency_contacts')
          .select('type')
          .eq('trip_id', tripId);

        if (error) throw error;

        const status = {
          hasEmergencyServices: false,
          hasHospital: false,
          hasPolice: false,
          hasEmbassy: false,
        };

        data?.forEach(contact => {
          switch (contact.type) {
            case 'emergency_services':
              status.hasEmergencyServices = true;
              break;
            case 'hospital':
              status.hasHospital = true;
              break;
            case 'police':
              status.hasPolice = true;
              break;
            case 'embassy':
              status.hasEmbassy = true;
              break;
          }
        });

        setContactStatus(status);
      } catch (error) {
        console.error('Error checking contact status:', error);
      }
    };

    checkContactStatus();
  }, [tripId, supabase]);

  const handleGenerateContacts = async () => {
    try {
      setIsLoading(true);
      await onGenerateContacts();
    } catch (error) {
      console.error('Error generating contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const allContactsPresent = Object.values(contactStatus).every(value => value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Contact Completeness</span>
          {allContactsPresent ? (
            <Badge className="bg-green-500">Complete</Badge>
          ) : (
            <Badge variant="destructive">Incomplete</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!allContactsPresent && (
          <Alert className="mb-4">
            <AlertTitle>Missing Emergency Contacts</AlertTitle>
            <AlertDescription>
              Some important emergency contacts are missing. Click generate to automatically add them.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded-lg border ${contactStatus.hasEmergencyServices ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <p className="font-medium">Emergency Services</p>
          </div>
          <div className={`p-3 rounded-lg border ${contactStatus.hasHospital ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <p className="font-medium">Hospital</p>
          </div>
          <div className={`p-3 rounded-lg border ${contactStatus.hasPolice ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <p className="font-medium">Police</p>
          </div>
          <div className={`p-3 rounded-lg border ${contactStatus.hasEmbassy ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
            <p className="font-medium">Embassy</p>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleGenerateContacts}
          disabled={isLoading || allContactsPresent}
          className="w-full"
        >
          {isLoading ? 'Generating...' : allContactsPresent ? 'All Contacts Added' : 'Generate Missing Contacts'}
        </Button>
      </CardFooter>
    </Card>
  );
};


