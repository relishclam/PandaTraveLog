import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/Motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Skeleton } from '@/components/ui/Skeleton';
import { PoTripDiary } from '@/components/po/svg/PoTripDiary';
import ItineraryDayCard from '@/components/diary/ItineraryDayCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { format } from 'date-fns';
import { 
  Calendar, 
  Map, 
  Search, 
  Edit, 
  Save, 
  MapPin, 
  Plus, 
  Download, 
  Share2, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

// Types
interface Trip {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  description?: string;
  image_url?: string;
  days: TripDay[];
}

interface TripDay {
  id: string;
  day_number: number;
  date: string;
  description?: string;
  activities: Activity[];
  meals: {
    breakfast?: Meal;
    lunch?: Meal;
    dinner?: Meal;
  };
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  location_name?: string;
  location_address?: string;
  lat?: number;
  lng?: number;
  image_url?: string;
  start_time?: string;
  end_time?: string;
  duration?: string;
  cost?: string;
  type?: string;
}

interface Meal {
  name: string;
  description?: string;
  location?: string;
  cost?: string;
}

// Main component
const TripDiary: React.FC<{ tripId?: string }> = ({ tripId }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Fetch trip data
  useEffect(() => {
    if (tripId) {
      // Simulate loading data
      setLoading(true);
      
      // In a real implementation, you would fetch from your API
      setTimeout(() => {
        // Mock data
        const mockTrip: Trip = {
          id: tripId,
          name: "Tokyo Adventure",
          destination: "Tokyo, Japan",
          start_date: "2025-06-15",
          end_date: "2025-06-22",
          description: "Exploring the vibrant city of Tokyo with its blend of traditional culture and modern technology.",
          image_url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26",
          days: [
            {
              id: "day1",
              day_number: 1,
              date: "2025-06-15",
              description: "Arrival and settling in",
              activities: [
                {
                  id: "act1",
                  title: "Arrival at Narita International Airport",
                  description: "Check in to the hotel and rest.",
                  location_name: "Narita International Airport",
                  start_time: "14:00",
                  type: "Travel"
                },
                {
                  id: "act2",
                  title: "Evening stroll in Shinjuku",
                  description: "Experience the neon lights and vibrant atmosphere.",
                  location_name: "Shinjuku",
                  image_url: "https://images.unsplash.com/photo-1554797589-7241bb691973",
                  start_time: "19:00",
                  end_time: "21:00",
                  type: "Sightseeing"
                }
              ],
              meals: {
                dinner: {
                  name: "Ramen at Ichiran",
                  description: "Authentic Japanese ramen experience",
                  location: "Shinjuku",
                  cost: "$$"
                }
              }
            },
            {
              id: "day2",
              day_number: 2,
              date: "2025-06-16",
              description: "Cultural exploration",
              activities: [
                {
                  id: "act3",
                  title: "Visit Tokyo Imperial Palace",
                  description: "Explore the primary residence of the Emperor of Japan.",
                  location_name: "Tokyo Imperial Palace",
                  image_url: "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3",
                  start_time: "09:00",
                  end_time: "12:00",
                  type: "Cultural"
                },
                {
                  id: "act4",
                  title: "Shopping in Ginza",
                  description: "Visit Japan's most luxurious shopping district.",
                  location_name: "Ginza",
                  start_time: "14:00",
                  end_time: "17:00",
                  type: "Shopping",
                  cost: "$$$"
                }
              ],
              meals: {
                breakfast: {
                  name: "Hotel breakfast buffet",
                  location: "Hotel restaurant"
                },
                lunch: {
                  name: "Sushi at Tsukiji Outer Market",
                  description: "Fresh sushi from Tokyo's famous fish market area",
                  location: "Tsukiji",
                  cost: "$$"
                },
                dinner: {
                  name: "Shabu-shabu experience",
                  description: "Traditional hot pot dining",
                  location: "Ginza",
                  cost: "$$$"
                }
              }
            }
          ]
        };
        
        setTrip(mockTrip);
        setLoading(false);
      }, 1500);
    }
  }, [tripId]);
  
  // Filter activities based on search
  const filteredDays = trip?.days.map(day => {
    if (!searchQuery) return day;
    
    return {
      ...day,
      activities: day.activities.filter(activity => 
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.location_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    };
  });
  
  // Format date range
  const getDateRangeFormatted = () => {
    if (!trip?.start_date || !trip?.end_date) return '';
    
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  };
  
  // Calculate trip duration
  const getTripDuration = () => {
    if (!trip?.start_date || !trip?.end_date) return '';
    
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
  };
  
  // Handle edit mode toggle
  const handleEditModeToggle = () => {
    setEditMode(!editMode);
    if (editMode) {
      // If we're leaving edit mode, we should save changes
      handleSaveChanges();
    }
  };
  
  // Handle saving changes
  const handleSaveChanges = () => {
    setSaving(true);
    
    // Simulate saving data
    setTimeout(() => {
      setSaving(false);
      toast.success('Trip itinerary saved successfully!', {
        description: 'All your changes have been saved.',
        icon: <CheckCircle className="h-5 w-5 text-green-500" />
      });
    }, 1000);
  };
  
  // Loading skeleton
  if (loading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          
          <div className="mb-8">
            <Skeleton className="h-10 w-full mb-6" />
            <Skeleton className="h-[200px] w-full mb-4" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (!trip) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip Not Found</h2>
        <p className="text-gray-500 mb-6">The requested trip could not be found or has been deleted.</p>
        <Button>Return to My Trips</Button>
      </div>
    );
  }
  
  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 bg-bamboo-light/10 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Trip Header with Animation */}
        <MotionDiv 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                {trip.name}
                {editMode ? (
                  <Button variant="ghost" size="sm" className="ml-2 mt-1">
                    <Edit className="h-4 w-4" />
                  </Button>
                ) : null}
              </h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className="bg-primary text-white flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {trip.destination}
                </Badge>
                <Badge variant="outline" className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {getDateRangeFormatted()}
                </Badge>
                <Badge variant="outline" className="flex items-center">
                  {getTripDuration()}
                </Badge>
              </div>
            </div>
            
            <div className="flex mt-4 sm:mt-0">
              <Button 
                variant={editMode ? "default" : "outline"} 
                className="mr-2"
                onClick={handleEditModeToggle}
              >
                {editMode ? (
                  <>
                    <Save className="h-4 w-4 mr-2" /> 
                    {saving ? 'Saving...' : 'Save Changes'}
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" /> 
                    Edit
                  </>
                )}
              </Button>
              
              <Button variant="outline" className="mr-2">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
          
          {/* Trip image and description */}
          <Card className="overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {trip.image_url && (
                <div className="w-full md:w-1/3 h-48 md:h-auto relative">
                  <Image 
                    src={trip.image_url}
                    alt={trip.name}
                    className="object-cover"
                    fill
                  />
                </div>
              )}
              
              <div className="p-6 w-full md:w-2/3 flex flex-col">
                <div className="flex-grow">
                  {editMode ? (
                    <Textarea
                      value={trip.description || ''}
                      onChange={e => setTrip({...trip, description: e.target.value})}
                      placeholder="Enter a description for your trip..."
                      className="h-full min-h-[120px]"
                    />
                  ) : (
                    <p className="text-gray-600">{trip.description}</p>
                  )}
                </div>
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{trip.days.length} days</span> · {trip.days.reduce((total, day) => total + day.activities.length, 0)} activities
                  </div>
                  
                  <PoTripDiary 
                    tripName={trip.name}
                    destination={trip.destination}
                    size="small"
                  />
                </div>
              </div>
            </div>
          </Card>
        </MotionDiv>
        
        {/* Tabs Navigation */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <div className="border-b border-gray-200">
              <TabsList className="flex">
                <TabsTrigger 
                  value="itinerary"
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    activeTab === 'itinerary' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } transition-colors`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Itinerary
                </TabsTrigger>
                
                <TabsTrigger 
                  value="map"
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    activeTab === 'map'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } transition-colors`}
                >
                  <Map className="h-4 w-4 mr-2" />
                  Map View
                </TabsTrigger>
                
                <TabsTrigger 
                  value="notes"
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    activeTab === 'notes' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } transition-colors`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Notes
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Tab Content */}
            <div className="mt-4">
              {/* Search bar */}
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search activities, locations, or notes..."
                  className="pl-10 pr-4"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <TabsContent value="itinerary" className="focus:outline-none">
                {/* Days List */}
                <ScrollArea className="h-[calc(100vh-400px)] pr-4">
                  <AnimatePresence>
                    <MotionDiv
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      {filteredDays?.map((day) => (
                        <ItineraryDayCard key={day.id} day={day} />
                      ))}
                      
                      {/* Add new day button in edit mode */}
                      {editMode && (
                        <MotionDiv
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex justify-center"
                        >
                          <Button
                            variant="outline"
                            className="w-full max-w-md border-dashed"
                            onClick={() => toast.info('Adding a new day is not implemented in this demo')}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Day
                          </Button>
                        </MotionDiv>
                      )}
                      
                      {/* No results message */}
                      {filteredDays?.every(day => day.activities.length === 0) && searchQuery && (
                        <div className="text-center py-10">
                          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-1">No matching activities</h3>
                          <p className="text-gray-500">
                            No activities found matching "{searchQuery}"
                          </p>
                        </div>
                      )}
                    </MotionDiv>
                  </AnimatePresence>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="map" className="focus:outline-none">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-center items-center h-96 bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <Map className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Map View</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">
                          Map integration will be available in the full implementation.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="notes" className="focus:outline-none">
                <Card>
                  <CardHeader>
                    <CardTitle>Trip Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Add your personal notes for this trip here..."
                      className="min-h-[200px]"
                      disabled={!editMode}
                    />
                    
                    {!editMode && (
                      <p className="text-sm text-gray-500 mt-2">
                        Enable edit mode to add or modify notes.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </MotionDiv>
      </div>
    </div>
  );
};

export default TripDiary;
