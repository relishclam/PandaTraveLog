'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { 
  MapPin, 
  Calendar, 
  Info, 
  ArrowLeft, 
  Clock,
  Phone,
  Building,
  Hotel,
  Plane,
  Train,
  Car,
  Bus,
  Edit3,
  Save,
  X,
  Plus
} from 'lucide-react';
import { PoGuide } from '@/components/po/svg/PoGuide';
import { usePOAssistant } from '@/contexts/POAssistantContext';
import ItineraryDayCard from '@/components/diary/ItineraryDayCard';
import CompanionsList from '@/components/diary/CompanionsList';
import EmergencyContacts from '@/components/diary/EmergencyContacts';
import { format } from 'date-fns';
import Link from 'next/link';
import SimplifiedItineraryDay from '@/components/diary/SimplifiedItineraryDay';
import Image from 'next/image';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Initialize Supabase client for this component
const supabase = createClientComponentClient();
import { useAuth } from '@/contexts/AuthContext';

// Manual trip data interfaces
interface DaySchedule {
  id: string;
  day: number;
  date: string;
  activities: string;
  notes?: string;
}

interface TravelDetails {
  id: string;
  mode: 'flight' | 'train' | 'car' | 'bus';
  details: string;
  departureTime?: string;
  arrivalTime?: string;
  bookingReference?: string;
  contactInfo?: string;
}

interface AccommodationDetails {
  id: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  confirmationNumber?: string;
  contactInfo?: string;
  notes?: string;
}

export default function TripDiaryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  // Original state
  const [trip, setTrip] = useState<any>(null);
  const [itinerary, setItinerary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  
  // Manual trip data state
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
  const [travelDetails, setTravelDetails] = useState<TravelDetails[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationDetails[]>([]);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingAccommodation, setEditingAccommodation] = useState<string | null>(null);
  const [editingTravel, setEditingTravel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { setContext } = usePOAssistant();
  
  const tripId = params?.id as string;
  
  if (!tripId) {
    router.push('/trips');
    return null;
  }
  
  useEffect(() => {
    async function loadTripAndItinerary() {
      setLoading(true);
      setError(null);
      
      try {
        // Get the current user session and token
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token;

        if (!authToken) {
          throw new Error('No authentication token available');
        }

        // Fetch trip details with auth header
        const tripResponse = await fetch(`/api/trips/${tripId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!tripResponse.ok) {
          throw new Error('Failed to load trip details');
        }
        
        const tripData = await tripResponse.json();
setTrip(tripData);  // ✅ CORRECT: Use tripData directly
        
        // Fetch itinerary with auth header
        const itineraryResponse = await fetch(`/api/trips/get-itinerary?tripId=${tripId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

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
        
        // Load manual trip data from new schema
        await loadManualTripData();
        
      } catch (err: any) {
        console.error('Error loading trip diary:', err);
        setError(err.message || 'Failed to load trip data');
      } finally {
        setLoading(false);
      }
    }
    
    async function loadManualTripData() {
      try {
        // Load data from correct schema tables
        const [schedulesResult, travelResult, accommodationsResult] = await Promise.all([
          // Load day schedules
          supabase
            .from('trip_day_schedules')
            .select('*')
            .eq('trip_id', tripId)
            .order('day_number'),
          
          // Load travel details
          supabase
            .from('trip_travel_details')
            .select('*')
            .eq('trip_id', tripId),
          
          // Load accommodations
          supabase
            .from('trip_accommodations')
            .select('*')
            .eq('trip_id', tripId)
        ]);

        // Process day schedules
        if (schedulesResult.data) {
          const schedules: DaySchedule[] = schedulesResult.data.map(item => ({
            id: item.id,
            day: item.day_number,
            date: item.date || '',
            activities: item.activities || '',
            notes: item.notes || ''
          }));
          setDaySchedules(schedules);
        }

        // Process travel details
        if (travelResult.data) {
          const travel: TravelDetails[] = travelResult.data.map(item => ({
            id: item.id,
            mode: item.mode,
            details: item.details || '',
            departureTime: item.departure_time || '',
            arrivalTime: item.arrival_time || '',
            bookingReference: item.booking_reference || '',
            contactInfo: item.contact_info || ''
          }));
          setTravelDetails(travel);
        }

        // Process accommodations
        if (accommodationsResult.data) {
          const hotels: AccommodationDetails[] = accommodationsResult.data.map(item => ({
            id: item.id,
            name: item.name,
            address: item.address || '',
            checkIn: item.check_in || '',
            checkOut: item.check_out || '',
            confirmationNumber: item.confirmation_number || '',
            contactInfo: item.contact_info || '',
            notes: item.notes || ''
          }));
          setAccommodations(hotels);
        }
        
        // Update active tab if manual data exists
        const hasData = (schedulesResult.data?.length || 0) > 0 || 
                       (travelResult.data?.length || 0) > 0 || 
                       (accommodationsResult.data?.length || 0) > 0;
        if (hasData) {
          setActiveTab('manual');
        }
      } catch (error) {
        console.warn('Error loading manual trip data:', error);
      }
    }
    
    if (tripId && user) {
      loadTripAndItinerary();
    }
  }, [tripId, user]);
  
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

  // Manual trip helper functions
  const saveDaySchedule = async (dayId: string) => {
    try {
      setSaving(true);
      const day = daySchedules.find(d => d.id === dayId);
      if (!day) return;

      // Use the correct table name from your schema
      const { error } = await supabase
        .from('trip_day_schedules')
        .upsert({
          id: dayId,
          trip_id: tripId,
          day_number: day.day,
          date: day.date || null,
          activities: day.activities,
          notes: day.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      setEditingDay(null);
      toast.success('Day schedule saved successfully!');
    } catch (error: any) {
      console.error('Error saving day schedule:', error);
      toast.error(`Failed to save changes: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = (dayId: string, field: keyof DaySchedule, value: string) => {
    setDaySchedules(prev => prev.map(day => 
      day.id === dayId ? { ...day, [field]: value } : day
    ));
  };

  // Save accommodation function
  const saveAccommodation = async (accommodationId: string) => {
    try {
      setSaving(true);
      const accommodation = accommodations.find(a => a.id === accommodationId);
      if (!accommodation) return;

      const { error } = await supabase
        .from('trip_accommodations')
        .upsert({
          id: accommodationId,
          trip_id: tripId,
          name: accommodation.name,
          address: accommodation.address || null,
          check_in: accommodation.checkIn || null,
          check_out: accommodation.checkOut || null,
          confirmation_number: accommodation.confirmationNumber || null,
          contact_info: accommodation.contactInfo || null,
          notes: accommodation.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      setEditingAccommodation(null);
      toast.success('Accommodation saved successfully!');
    } catch (error: any) {
      console.error('Error saving accommodation:', error);
      toast.error(`Failed to save accommodation: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Update accommodation function
  const updateAccommodation = (accommodationId: string, field: keyof AccommodationDetails, value: string) => {
    setAccommodations(prev => prev.map(accommodation => 
      accommodation.id === accommodationId ? { ...accommodation, [field]: value } : accommodation
    ));
  };

  // Save travel details function
  const saveTravelDetails = async (travelId: string) => {
    try {
      setSaving(true);
      const travel = travelDetails.find(t => t.id === travelId);
      if (!travel) return;

      const { error } = await supabase
        .from('trip_travel_details')
        .upsert({
          id: travelId,
          trip_id: tripId,
          mode: travel.mode,
          details: travel.details || null,
          departure_time: travel.departureTime || null,
          arrival_time: travel.arrivalTime || null,
          booking_reference: travel.bookingReference || null,
          contact_info: travel.contactInfo || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      setEditingTravel(null);
      toast.success('Travel details saved successfully!');
    } catch (error: any) {
      console.error('Error saving travel details:', error);
      toast.error(`Failed to save travel details: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Update travel details function
  const updateTravelDetails = (travelId: string, field: keyof TravelDetails, value: string) => {
    setTravelDetails(prev => prev.map(travel => 
      travel.id === travelId ? { ...travel, [field]: value } : travel
    ));
  };

  const addNewDay = () => {
    const newDay: DaySchedule = {
      id: `temp-${Date.now()}`,
      day: daySchedules.length + 1,
      date: '',
      activities: '',
      notes: ''
    };
    setDaySchedules(prev => [...prev, newDay]);
    setEditingDay(newDay.id);
  };

  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case 'flight': return <Plane className="w-4 h-4" />;
      case 'train': return <Train className="w-4 h-4" />;
      case 'car': return <Car className="w-4 h-4" />;
      case 'bus': return <Bus className="w-4 h-4" />;
      default: return <Plane className="w-4 h-4" />;
    }
  };

  // Set context for PO assistant when this page loads
  useEffect(() => {
    setContext('diary', tripId);
  }, [setContext, tripId]);
  
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
      
      {/* Tabs Navigation - Mobile Optimized */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
        <div className="relative">
          <TabsList className="w-full md:w-auto mb-4 grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-0 h-auto md:h-10 p-1">
            <TabsTrigger 
              value="itinerary" 
              className="flex-1 md:flex-none text-xs md:text-sm px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
            >
              <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="hidden md:inline">AI Itinerary</span>
              <span className="md:hidden text-center leading-tight">AI<br />Itinerary</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="manual" 
              className="flex-1 md:flex-none text-xs md:text-sm px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
            >
              <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="hidden md:inline">Manual Trip</span>
              <span className="md:hidden text-center leading-tight">Manual<br />Trip</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="companions" 
              className="flex-1 md:flex-none text-xs md:text-sm px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
            >
              <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span className="hidden md:inline">Companions</span>
              <span className="md:hidden text-center leading-tight">Companions</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="emergency" 
              className="flex-1 md:flex-none text-xs md:text-sm px-2 md:px-3 py-2 md:py-1.5 min-h-[44px] md:min-h-[36px] flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
            >
              <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="hidden md:inline">Emergency Contacts</span>
              <span className="md:hidden text-center leading-tight">Emergency<br />Contacts</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Mobile Tab Indicator */}
          <div className="md:hidden flex justify-center mt-2 space-x-1">
            {['itinerary', 'manual', 'companions', 'emergency'].map((tab) => (
              <div
                key={tab}
                className={`h-1 w-6 rounded-full transition-colors duration-200 ${
                  activeTab === tab ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* AI Itinerary Tab */}
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
                    message="No AI itinerary has been created yet."
                    type="thinking"
                    size="medium"
                  />
                  <p className="mt-4 text-gray-600">
                    Generate an AI itinerary to see your day-by-day plans here.
                  </p>
                  <Button
                    variant="default"
                    className="mt-6"
                    onClick={() => router.push(`/trips/${tripId}/itinerary?new=true`)}
                  >
                    Create AI Itinerary
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Manual Trip Tab */}
        <TabsContent value="manual" className="mt-0">
          <div className="space-y-8">
            {/* Overview Section */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Trip Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium">Duration:</span>
                      <p className="text-gray-600">
                        {daySchedules.length} days planned
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Destinations:</span>
                      <p className="text-gray-600">{trip?.destination}</p>
                    </div>
                    <div>
                      <span className="font-medium">Travel Modes:</span>
                      <div className="flex gap-2 mt-1">
                        {travelDetails.map(travel => (
                          <Badge key={travel.id} variant="outline" className="flex items-center gap-1">
                            {getTravelModeIcon(travel.mode)}
                            {travel.mode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Hotel className="w-5 h-5 mr-2" />
                      Accommodations
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Add new accommodation functionality can be added here
                        const newAccommodation: AccommodationDetails = {
                          id: `temp-${Date.now()}`,
                          name: '',
                          address: '',
                          checkIn: '',
                          checkOut: '',
                          confirmationNumber: '',
                          contactInfo: '',
                          notes: ''
                        };
                        setAccommodations(prev => [...prev, newAccommodation]);
                        setEditingAccommodation(newAccommodation.id);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accommodations.length > 0 ? (
                    <div className="space-y-4">
                      {accommodations.map(hotel => (
                        <div key={hotel.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">Accommodation {accommodations.indexOf(hotel) + 1}</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingAccommodation(editingAccommodation === hotel.id ? null : hotel.id)}
                            >
                              {editingAccommodation === hotel.id ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                            </Button>
                          </div>
                          
                          {editingAccommodation === hotel.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Name</label>
                                  <Input
                                    value={hotel.name}
                                    onChange={(e) => updateAccommodation(hotel.id, 'name', e.target.value)}
                                    placeholder="Hotel name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                  <Input
                                    value={hotel.address}
                                    onChange={(e) => updateAccommodation(hotel.id, 'address', e.target.value)}
                                    placeholder="Hotel address"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                                  <Input
                                    value={hotel.checkIn}
                                    onChange={(e) => updateAccommodation(hotel.id, 'checkIn', e.target.value)}
                                    placeholder="Check-in date/time"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                                  <Input
                                    value={hotel.checkOut}
                                    onChange={(e) => updateAccommodation(hotel.id, 'checkOut', e.target.value)}
                                    placeholder="Check-out date/time"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmation Number</label>
                                  <Input
                                    value={hotel.confirmationNumber || ''}
                                    onChange={(e) => updateAccommodation(hotel.id, 'confirmationNumber', e.target.value)}
                                    placeholder="Booking confirmation"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info</label>
                                  <Input
                                    value={hotel.contactInfo || ''}
                                    onChange={(e) => updateAccommodation(hotel.id, 'contactInfo', e.target.value)}
                                    placeholder="Phone number or email"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <Textarea
                                  value={hotel.notes || ''}
                                  onChange={(e) => updateAccommodation(hotel.id, 'notes', e.target.value)}
                                  placeholder="Additional notes"
                                  rows={2}
                                />
                              </div>
                              <Button
                                onClick={() => saveAccommodation(hotel.id)}
                                disabled={saving}
                                className="flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {hotel.name && <p className="font-medium">{hotel.name}</p>}
                              {hotel.address && <p className="text-sm text-gray-600">{hotel.address}</p>}
                              {(hotel.checkIn || hotel.checkOut) && (
                                <p className="text-xs text-gray-500">
                                  {hotel.checkIn} to {hotel.checkOut}
                                </p>
                              )}
                              {hotel.confirmationNumber && (
                                <p className="text-xs text-gray-500">Ref: {hotel.confirmationNumber}</p>
                              )}
                              {hotel.contactInfo && (
                                <p className="text-xs text-blue-600">📞 {hotel.contactInfo}</p>
                              )}
                              {hotel.notes && (
                                <p className="text-sm text-gray-600 italic">{hotel.notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No accommodations added yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plane className="w-5 h-5 mr-2" />
                    Travel Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {travelDetails.length > 0 ? (
                    <div className="space-y-3">
                      {travelDetails.map(travel => (
                        <div key={travel.id} className="border-l-4 border-green-200 pl-3">
                          <div className="flex items-center gap-2">
                            {getTravelModeIcon(travel.mode)}
                            <span className="font-medium capitalize">{travel.mode}</span>
                          </div>
                          <p className="text-sm text-gray-600">{travel.details}</p>
                          {travel.bookingReference && (
                            <p className="text-xs text-gray-500">Ref: {travel.bookingReference}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No travel details added yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily Schedule Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Daily Schedule</h3>
                <Button onClick={addNewDay} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Day
                </Button>
              </div>

              {daySchedules.length > 0 ? (
                <div className="grid gap-6">
                  {daySchedules.map(day => (
                    <Card key={day.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>Day {day.day}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingDay(editingDay === day.id ? null : day.id)}
                          >
                            {editingDay === day.id ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {editingDay === day.id ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                              <Input
                                type="date"
                                value={day.date}
                                onChange={(e) => updateDaySchedule(day.id, 'date', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Activities</label>
                              <Textarea
                                value={day.activities}
                                onChange={(e) => updateDaySchedule(day.id, 'activities', e.target.value)}
                                placeholder="What are you planning to do today?"
                                rows={4}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                              <Textarea
                                value={day.notes || ''}
                                onChange={(e) => updateDaySchedule(day.id, 'notes', e.target.value)}
                                placeholder="Any additional notes or reminders"
                                rows={2}
                              />
                            </div>
                            <Button
                              onClick={() => saveDaySchedule(day.id)}
                              disabled={saving}
                              className="flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {day.date && (
                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                {day.date}
                              </div>
                            )}
                            {day.activities ? (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Activities</h4>
                                <p className="text-gray-700 whitespace-pre-wrap">{day.activities}</p>
                              </div>
                            ) : (
                              <p className="text-gray-500 italic">No activities planned yet. Click edit to add some!</p>
                            )}
                            {day.notes && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                                <p className="text-gray-600 whitespace-pre-wrap">{day.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Daily Schedule Yet</h4>
                    <p className="text-gray-600 mb-4">Start planning your trip by adding daily activities</p>
                    <Button onClick={addNewDay}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Day
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
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