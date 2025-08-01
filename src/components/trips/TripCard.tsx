'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { MapPin, Calendar, Book, ExternalLink, Loader2, Trash2, Home } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import type { Trip } from '@/types/trip';

interface TripCardProps {
  trip: Trip;  // Use the shared Trip interface
  onEnhance: () => void;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export const TripCard = ({ trip, onEnhance, onDelete, isDeleting }: TripCardProps) => {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting || !confirm('Are you sure you want to delete this trip?')) {
      return;
    }
    await onDelete(trip.id);
  };

  return (
    <Card 
      onClick={() => router.push(`/trips/${trip.id}`)} 
      className="cursor-pointer transition-transform transform hover:scale-[1.02]"
    >
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-semibold">{trip.title}</CardTitle>
          <Button
            onClick={handleDelete}
            variant="outline"
            size="icon"
            className="text-gray-400 hover:text-gray-600"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="flex gap-2 text-sm text-gray-500">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {trip.destination}
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {format(new Date(trip.start_date), 'MMM dd')} - {format(new Date(trip.end_date), 'MMM dd')}
          </div>
          {trip.accommodation && (
            <div className="flex items-center">
              <Home className="w-4 h-4 mr-1" />
              {trip.accommodation}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-700">
          {/* Optionally, you can add more trip details here */}
          {trip.status === 'completed' ? 'Trip Completed' : 'Trip In Progress'}
        </CardDescription>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/trips/${trip.id}`)}
          >
            View Details
          </Button>
          
          {/* Add AI Enhancement option */}
          <Button
            variant="outline"
            size="sm"
            onClick={onEnhance}
            className="text-backpack-orange hover:text-backpack-orange/90"
          >
            Ask PO for Ideas
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TripCard;