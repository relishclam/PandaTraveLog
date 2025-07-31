'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { MapPin, Calendar, Book, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface TripCardProps {
  trip: {
    id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    status: string;
  };
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}

const TripCard = ({ trip, onDelete, isDeleting }: TripCardProps) => {
  const router = useRouter();

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
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-700">
          {/* Optionally, you can add more trip details here */}
          {trip.status === 'completed' ? 'Trip Completed' : 'Trip In Progress'}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

export default TripCard;