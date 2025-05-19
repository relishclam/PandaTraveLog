import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import Image from 'next/image';
import { MapPin, Clock, DollarSign, Utensils } from 'lucide-react';

// Helper function to format time
const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return '';
  try {
    // Handle different time formats (12h or 24h)
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    return format(new Date().setHours(hours, minutes), 'h:mm a');
  } catch (e) {
    return timeString;
  }
};

interface SimplifiedItineraryDayProps {
  day: any;
}

const SimplifiedItineraryDay: React.FC<SimplifiedItineraryDayProps> = ({ day }) => {
  const [showMeals, setShowMeals] = useState(false);
  
  // Format date for display
  const formatDayDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch (e) {
      return `Day ${day.day_number}`;
    }
  };
  
  const hasActivities = day.activities && day.activities.length > 0;
  const hasMeals = day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner);
  
  // Generate Google Maps URL for a location
  const getGoogleMapsUrl = (activity: any) => {
    if (activity.map_url) return activity.map_url;
    
    let query = '';
    
    if (activity.lat && activity.lng) {
      query = `${activity.lat},${activity.lng}`;
    } else if (activity.location_place_id) {
      query = `place_id:${activity.location_place_id}`;
    } else if (activity.location_name) {
      query = encodeURIComponent(activity.location_name);
      if (activity.location_address) {
        query += `,+${encodeURIComponent(activity.location_address)}`;
      }
    } else {
      return '';
    }
    
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };
  
  // Determine cost level indicator
  const getCostIndicator = (cost: string | null | undefined) => {
    if (!cost) return null;
    
    let level = 1;
    if (cost.includes('$$$$') || cost.includes('Expensive')) level = 4;
    else if (cost.includes('$$$')) level = 3;
    else if (cost.includes('$$')) level = 2;
    
    return (
      <div className="flex items-center">
        <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
        <span className="text-gray-600">
          {Array(level).fill('$').join('')}
          <span className="text-gray-300">
            {Array(4 - level).fill('$').join('')}
          </span>
        </span>
      </div>
    );
  };
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-6">
      {/* Day Header */}
      <div className="bg-primary/5 p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg md:text-xl font-semibold text-primary">
            {day.title || formatDayDate(day.date)}
          </h3>
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium">
            Day {day.day_number}
          </span>
        </div>
        {day.description && (
          <p className="text-sm text-gray-600 mt-1">{day.description}</p>
        )}
      </div>
      
      <div className="p-4">
        {/* Activities Section */}
        {hasActivities ? (
          <div className="space-y-4">
            {day.activities.map((activity: any, index: number) => (
              <div 
                key={activity.id || index} 
                className="border border-gray-200 rounded-lg p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start">
                  {/* Activity image (if available) */}
                  {activity.image_url && (
                    <div className="w-full md:w-40 h-32 relative rounded-md overflow-hidden mb-4 md:mb-0 md:mr-4 flex-shrink-0">
                      <Image 
                        src={activity.image_url} 
                        alt={activity.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-gray-900">{activity.title}</h3>
                      {activity.type && (
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm ml-2">
                          {activity.type}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm">
                      {/* Location */}
                      {activity.location_name && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 text-gray-500 mr-1" />
                          <span className="text-gray-600">
                            {activity.location_name}
                          </span>
                        </div>
                      )}
                      
                      {/* Time */}
                      {(activity.start_time || activity.duration) && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-500 mr-1" />
                          <span className="text-gray-600">
                            {activity.start_time ? formatTime(activity.start_time) : ''}
                            {activity.start_time && activity.end_time ? ' - ' : ''}
                            {activity.end_time ? formatTime(activity.end_time) : ''}
                            {!activity.start_time && activity.duration ? activity.duration : ''}
                          </span>
                        </div>
                      )}
                      
                      {/* Cost */}
                      {getCostIndicator(activity.cost)}
                    </div>
                    
                    {/* Description */}
                    {activity.description && (
                      <p className="mt-2 text-sm text-gray-600">
                        {activity.description}
                      </p>
                    )}
                    
                    {/* Map link */}
                    {(activity.location_name || activity.lat || activity.location_place_id) && (
                      <div className="mt-3">
                        <a 
                          href={getGoogleMapsUrl(activity)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-primary hover:text-primary/80"
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          View on Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            No activities planned for this day yet.
          </p>
        )}
        
        {/* Meals Section (Toggle) */}
        {hasMeals && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center"
              onClick={() => setShowMeals(!showMeals)}
            >
              <Utensils className="h-4 w-4 mr-2" />
              {showMeals ? 'Hide Meals' : 'Show Meals'}
            </Button>
            
            {showMeals && (
              <div className="mt-4 space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50">
                {day.meals.breakfast && (
                  <div>
                    <div className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm inline-block mb-2">
                      Breakfast
                    </div>
                    <div className="ml-2">
                      <p className="font-medium text-sm">{day.meals.breakfast.name}</p>
                      {day.meals.breakfast.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {day.meals.breakfast.description}
                        </p>
                      )}
                      {day.meals.breakfast.location && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {day.meals.breakfast.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {day.meals.lunch && (
                  <div>
                    <div className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm inline-block mb-2">
                      Lunch
                    </div>
                    <div className="ml-2">
                      <p className="font-medium text-sm">{day.meals.lunch.name}</p>
                      {day.meals.lunch.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {day.meals.lunch.description}
                        </p>
                      )}
                      {day.meals.lunch.location && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {day.meals.lunch.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {day.meals.dinner && (
                  <div>
                    <div className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm inline-block mb-2">
                      Dinner
                    </div>
                    <div className="ml-2">
                      <p className="font-medium text-sm">{day.meals.dinner.name}</p>
                      {day.meals.dinner.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {day.meals.dinner.description}
                        </p>
                      )}
                      {day.meals.dinner.location && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {day.meals.dinner.location}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplifiedItineraryDay;
