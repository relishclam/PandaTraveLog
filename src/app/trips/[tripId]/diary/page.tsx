'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { MotionDiv } from '@/components/ui/Motion';
import { 
  Calendar, 
  MapPin, 
  Plane, 
  Hotel, 
  Edit3, 
  Save, 
  X,
  Plus,
  ArrowLeft,
  Clock,
  Phone,
  Building,
  Train,
  Car,
  Bus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabase';
import { PandaAssistant } from '@/components/ui/PandaAssistant';

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

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  description: string;
  status: string;
}

export default function TripDiaryPage() {
  const { tripId } = useParams(); // Changed from 'id' to 'tripId'
  const router = useRouter();
  const { user } = useAuth();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);
  const [travelDetails, setTravelDetails] = useState<TravelDetails[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationDetails[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPandaAssistant, setShowPandaAssistant] = useState(true);
  const [pandaMessage, setPandaMessage] = useState("Welcome to your Travel Diary! 🐼✈️ I'm here to help you organize your trip details. Click on any section to edit or add information!");

  useEffect(() => {
    if (tripId && user) {
      loadTripData();
    }
  }, [tripId, user]);

  const loadTripData = async () => {
    try {
      setLoading(true);
      
      // Load trip basic info
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('user_id', user?.id)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      // Load itinerary data
      const { data: itineraryData, error: itineraryError } = await supabase
        .from('trip_itinerary')
        .select('*')
        .eq('trip_id', tripId)
        .order('day_number');

      if (itineraryError) {
        console.warn('Failed to load itinerary:', itineraryError);
      } else if (itineraryData) {
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
      }
    } catch (error: any) {
      console.error('Error loading trip data:', error);
      setError(error.message || 'Failed to load trip data');
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error: any) {
      console.error('Error saving day schedule:', error);
      setError(error.message || 'Failed to save changes');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your travel diary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Trip</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip?.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-600">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                {trip?.destination}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {trip?.start_date} to {trip?.end_date}
              </div>
              <Badge variant="outline" className="capitalize">
                {trip?.status}
              </Badge>
            </div>
            {trip?.description && (
              <p className="text-gray-700 mt-4">{trip.description}</p>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Calendar },
                { id: 'daily', label: 'Daily Schedule', icon: Clock },
                { id: 'travel', label: 'Travel Details', icon: Plane },
                { id: 'hotels', label: 'Accommodation', icon: Hotel }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <MotionDiv
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
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
          )}

          {/* Daily Schedule Tab */}
          {activeTab === 'daily' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Daily Schedule</h2>
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Daily Schedule Yet</h3>
                    <p className="text-gray-600 mb-4">Start planning your trip by adding daily activities</p>
                    <Button onClick={addNewDay}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Day
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Travel Details Tab */}
          {activeTab === 'travel' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Travel Details</h2>
              
              {travelDetails.length > 0 ? (
                <div className="grid gap-6">
                  {travelDetails.map(travel => (
                    <Card key={travel.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {getTravelModeIcon(travel.mode)}
                          <span className="capitalize">{travel.mode} Details</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Travel Information</h4>
                            <p className="text-gray-700">{travel.details}</p>
                          </div>
                          <div className="space-y-2">
                            {travel.departureTime && (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-2" />
                                Departure: {travel.departureTime}
                              </div>
                            )}
                            {travel.arrivalTime && (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-2" />
                                Arrival: {travel.arrivalTime}
                              </div>
                            )}
                            {travel.bookingReference && (
                              <div className="flex items-center text-gray-600">
                                <Building className="w-4 h-4 mr-2" />
                                Booking: {travel.bookingReference}
                              </div>
                            )}
                            {travel.contactInfo && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="w-4 h-4 mr-2" />
                                Contact: {travel.contactInfo}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Plane className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Travel Details</h3>
                    <p className="text-gray-600">Travel details will appear here once you add them during trip creation</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Accommodation Tab */}
          {activeTab === 'hotels' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Accommodation</h2>
              
              {accommodations.length > 0 ? (
                <div className="grid gap-6">
                  {accommodations.map(hotel => (
                    <Card key={hotel.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Hotel className="w-5 h-5" />
                          {hotel.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                            <div className="flex items-start text-gray-600">
                              <MapPin className="w-4 h-4 mr-2 mt-1 flex-shrink-0" />
                              <span>{(hotel as any).enrichedData?.address || hotel.address}</span>
                            </div>
                            {(hotel as any).enrichedData?.mapLink && (
                              <div className="mt-2">
                                <a 
                                  href={(hotel as any).enrichedData.mapLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-blue-600 hover:underline text-sm"
                                >
                                  <MapPin className="w-4 h-4 mr-1" />
                                  View on Google Maps
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center text-gray-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              Check-in: {hotel.checkIn}
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Calendar className="w-4 h-4 mr-2" />
                              Check-out: {hotel.checkOut}
                            </div>
                            {hotel.confirmationNumber && (
                              <div className="flex items-center text-gray-600">
                                <Building className="w-4 h-4 mr-2" />
                                Confirmation: {hotel.confirmationNumber}
                              </div>
                            )}
                            {/* Enhanced contact information */}
                            {(hotel as any).enrichedData?.contactInfo?.phone && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="w-4 h-4 mr-2" />
                                <a href={`tel:${(hotel as any).enrichedData.contactInfo.phone}`} className="hover:text-blue-600">
                                  {(hotel as any).enrichedData.contactInfo.phone}
                                </a>
                              </div>
                            )}
                            {hotel.contactInfo && !(hotel as any).enrichedData?.contactInfo?.phone && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="w-4 h-4 mr-2" />
                                Contact: {hotel.contactInfo}
                              </div>
                            )}
                            {(hotel as any).enrichedData?.contactInfo?.website && (
                              <div className="flex items-center text-gray-600">
                                <Building className="w-4 h-4 mr-2" />
                                <a 
                                  href={(hotel as any).enrichedData.contactInfo.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-600"
                                >
                                  Official Website
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        {hotel.notes && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                            <p className="text-gray-700">{hotel.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Hotel className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Accommodations</h3>
                    <p className="text-gray-600">Accommodation details will appear here once you add them during trip creation</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </MotionDiv>
      </div>

      {/* Panda Assistant */}
      {showPandaAssistant && (
        <PandaAssistant
          message={pandaMessage}
          emotion="happy"
          onMessageClick={handlePandaAssistantClick}
          showMessage={true}
          position="bottom-right"
          size="md"
          animate={true}
          responseButtons={[
            {
              text: "Help me plan",
              onClick: () => setPandaMessage("I'd love to help you plan! 🗺️ What would you like to work on?\n• Daily activities and sightseeing\n• Travel arrangements\n• Hotel bookings\n• Local recommendations"),
              variant: "primary"
            },
            {
              text: "Get suggestions",
              onClick: () => setPandaMessage("Great choice! 💡 I can suggest:\n• Popular attractions in your destination\n• Local restaurants and cuisine\n• Transportation options\n• Cultural experiences\n\nWhat interests you most?"),
              variant: "secondary"
            }
          ]}
        />
      )}
    </div>
  );
}
