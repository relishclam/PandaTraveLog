'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { MapPin, Calendar, Info, ArrowLeft } from 'lucide-react';
import { PoGuide } from '@/components/po/svg/PoGuide';
import ItineraryDayCard from '@/components/diary/ItineraryDayCard';
import CompanionsList from '@/components/diary/CompanionsList';
import EmergencyContacts from '@/components/diary/EmergencyContacts';
import { format } from 'date-fns';
import Link from 'next/link';
import SimplifiedItineraryDay from '@/components/diary/SimplifiedItineraryDay';
import Image from 'next/image';
import { toast } from 'sonner';

export default function TripDiaryPage() {
  const params = useParams();
  const router = useRouter();
  const [trip, setTrip] = useState<any>(null);
  const [itinerary, setItinerary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  
  const tripId = params.tripId as string;
  
  useEffect(() => {
    async function loadTripAndItinerary() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch trip details
        const tripResponse = await fetch(`/api/trips/${tripId}`);
        if (!tripResponse.ok) {
          throw new Error('Failed to load trip details');
        }
        
        const tripData = await tripResponse.json();
        setTrip(tripData.trip);
        
        // Fetch itinerary
        const itineraryResponse = await fetch(`/api/trips/get-itinerary?tripId=${tripId}`);
        if (!itineraryResponse.ok) {
          if (itineraryResponse.status === 404) {
            // No itinerary found but trip exists, not an error
            setItinerary(null);
          } else {
            throw new Error('Failed to load itinerary');
          }
        } else {
          const itineraryData = await itineraryResponse.json();
          setItinerary(itineraryData.itinerary);
        }
      } catch (err: any) {
        console.error('Error loading trip diary:', err);
        setError(err.message || 'Failed to load trip data');
      } finally {
        setLoading(false);
      }
    }
    
    if (tripId) {
      loadTripAndItinerary();
    }
  }, [tripId]);
  
  // Format date for display
  const formatTripDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };
  
  // Generate trip duration text
  const getTripDuration = () => {
    if (!trip?.start_date || !trip?.end_date) return '';
    
    try {
      const startDate = new Date(trip.start_date);
      const endDate = new Date(trip.end_date);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays === 1 ? '1 day' : `${diffDays} days`;
    } catch (e) {
      return '';
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center mb-6">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48 ml-4" />
        </div>
        
        <Skeleton className="h-12 w-full mb-8" />
        
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error || !trip) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <PoGuide 
                message="Oops! Something went wrong."
                type="sad"
                size="large"
              />
              <p className="mt-4 text-red-800">{error || 'Trip not found'}</p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => router.push('/trips')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Trips
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const hasItinerary = itinerary && itinerary.days && itinerary.days.length > 0;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/trips/${tripId}`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Trip
        </Link>
      </div>
      
      {/* Trip Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {trip.title}
        </h1>
        
        <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600 mb-4">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>
              {formatTripDate(trip.start_date)} - {formatTripDate(trip.end_date)}
            </span>
          </div>
          
          {getTripDuration() && (
            <Badge variant="outline" className="ml-2">
              {getTripDuration()}
            </Badge>
          )}
          
          <div className="flex items-center ml-auto">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{trip.destination}</span>
          </div>
        </div>
        
        {trip.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{trip.notes}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
        <TabsList className="w-full md:w-auto mb-4">
          <TabsTrigger value="itinerary" className="flex-1 md:flex-none">
            Itinerary
          </TabsTrigger>
          <TabsTrigger value="companions" className="flex-1 md:flex-none">
            Companions
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex-1 md:flex-none">
            Emergency Contacts
          </TabsTrigger>
        </TabsList>
        
        {/* Itinerary Tab */}
        <TabsContent value="itinerary" className="mt-0">
          {hasItinerary ? (
            <div className="grid gap-6">
              {itinerary.days.map((day: any) => (
                <ItineraryDayCard key={day.id} day={day} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <PoGuide 
                    message="No itinerary has been created yet."
                    type="thinking"
                    size="medium"
                  />
                  <p className="mt-4 text-gray-600">
                    Generate an itinerary to see your day-by-day plans here.
                  </p>
                  <Button
                    variant="default"
                    className="mt-6"
                    onClick={() => router.push(`/trips/${tripId}/itinerary?new=true`)}
                  >
                    Create Itinerary
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Companions Tab */}
        <TabsContent value="companions" className="mt-0">
          <CompanionsList tripId={tripId} />
        </TabsContent>
        
        {/* Emergency Contacts Tab */}
        <TabsContent value="emergency" className="mt-0">
          <EmergencyContacts tripId={tripId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
