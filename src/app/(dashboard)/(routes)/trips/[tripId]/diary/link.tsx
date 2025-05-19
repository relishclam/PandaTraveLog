'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Book } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TripDiaryLinkProps {
  tripId: string;
  hasItinerary?: boolean;
}

const TripDiaryLink: React.FC<TripDiaryLinkProps> = ({ tripId, hasItinerary }) => {
  const router = useRouter();
  
  const handleClick = () => {
    router.push(`/trips/${tripId}/diary`);
  };
  
  return (
    <Card 
      className="p-4 cursor-pointer hover:border-primary/50 transition-all"
      onClick={handleClick}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
            <Book className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-base">Trip Diary</h3>
            <p className="text-sm text-gray-500">
              {hasItinerary 
                ? 'View your complete trip diary and itinerary' 
                : 'Create and manage your travel plans'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0">
          View Diary
        </Button>
      </div>
    </Card>
  );
};

export default TripDiaryLink;
