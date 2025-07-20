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
import { PandaAssistant } from '@/components/ui/PandaAssistant';
import ItineraryDayCard from '@/components/diary/ItineraryDayCard';
import CompanionsList from '@/components/diary/CompanionsList';
import EmergencyContacts from '@/components/diary/EmergencyContacts';
import { format } from 'date-fns';
import Link from 'next/link';
import SimplifiedItineraryDay from '@/components/diary/SimplifiedItineraryDay';
import Image from 'next/image';
import { toast } from 'sonner';
import supabase from '@/lib/supabase';
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
  const [saving, setSaving] = useState(false);
  const [showPandaAssistant, setShowPandaAssistant] = useState(true);
  const [pandaMessage, setPandaMessage] = useState("Welcome to your Travel Diary! 🐼✈️ I'm here to help you organize your trip details. Click on any section to edit or add information!");
  
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
        // Load itinerary data from trip_itinerary table
        const { data: itineraryData, error: itineraryError } = await supabase
          .from('trip_itinerary')
          .select('*')
          .eq('trip_id', tripId)
          .order('day_number');

        if (itineraryError) {
          console.warn('Failed to load manual trip data:', itineraryError);
          return;
        }

        if (itineraryData) {
          // Parse itinerary data
          const schedules: DaySchedule[] = [];
          let travel: TravelDetails[] = [];
          let hotels: AccommodationDetails[] = [];

          itineraryData.forEach(item => {
            try {
              const content = JSON.parse(item.content);
              
              if (item.day_number > 0) {
                // Regular day schedule
                schedules.push({
                  id: item.id.toString(),
                  day: item.day_number,
                  date: content.date || '',
                  activities: content.activities || '',
                  notes: content.notes || ''
                });
              } else if (item.day_number === -1 && content.travel_details) {
                // Travel details
                travel = content.travel_details;
              } else if (item.day_number === -2 && content.accommodations) {
                // Accommodations
                hotels = content.accommodations;
              }
            } catch (e) {
              console.warn('Failed to parse itinerary item:', e);
            }
          });

          setDaySchedules(schedules);
          setTravelDetails(travel);
          setAccommodations(hotels);
          
          // Update active tab if manual data exists
          if (schedules.length > 0 || travel.length > 0 || hotels.length > 0) {
            setActiveTab('manual');
          }
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

      const { error } = await supabase
        .from('trip_itinerary')
        .update({
          content: JSON.stringify({
            date: day.date,
            activities: day.activities,
            notes: day.notes
          })
        })
        .eq('id', parseInt(dayId))
        .eq('trip_id', tripId);

      if (error) throw error;
      
      setEditingDay(null);
      setPandaMessage("Great! Your day schedule has been saved! 🎉");
      toast.success('Day schedule saved successfully!');
    } catch (error: any) {
      console.error('Error saving day schedule:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const updateDaySchedule = (dayId: string, field: keyof DaySchedule, value: string) => {
    setDaySchedules(prev => prev.map(day => 
      day.id === dayId ? { ...day, [field]: value } : day
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
    setPandaMessage("Added a new day to your itinerary! Fill in the details and save when ready. 📅");
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

  const handlePandaAssistantClick = () => {
    setPandaMessage("Hi there! 🐼 Need help organizing your trip? I can assist you with:\n• Adding daily activities\n• Managing travel details\n• Organizing accommodation info\n• Getting location suggestions\n\nWhat would you like to work on?");
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
            AI Itinerary
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 md:flex-none">
            Manual Trip
          </TabsTrigger>
          <TabsTrigger value="companions" className="flex-1 md:flex-none">
            Companions
          </TabsTrigger>
          <TabsTrigger value="emergency" className="flex-1 md:flex-none">
            Emergency Contacts
          </TabsTrigger>
        </TabsList>
        
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
                  <CardTitle className="flex items-center">
                    <Hotel className="w-5 h-5 mr-2" />
                    Accommodations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accommodations.length > 0 ? (
                    <div className="space-y-3">
                      {accommodations.map(hotel => (
                        <div key={hotel.id} className="border-l-4 border-blue-200 pl-3">
                          <p className="font-medium">{hotel.name}</p>
                          <p className="text-sm text-gray-600">
                            {(hotel as any).enrichedData?.address || hotel.address}
                          </p>
                          <p className="text-xs text-gray-500">
                            {hotel.checkIn} to {hotel.checkOut}
                          </p>
                          {(hotel as any).enrichedData?.contactInfo?.phone && (
                            <p className="text-xs text-blue-600">
                              📞 {(hotel as any).enrichedData.contactInfo.phone}
                            </p>
                          )}
                          {(hotel as any).enrichedData?.mapLink && (
                            <a 
                              href={(hotel as any).enrichedData.mapLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              🗺️ View on Map
                            </a>
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
