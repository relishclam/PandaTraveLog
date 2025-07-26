import React, { useState, useRef } from 'react';
import { AnimatePresence, useInView } from 'framer-motion';
import { MotionDiv } from '@/components/ui/Motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import { MapPin, Clock, DollarSign, Utensils, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parse } from 'date-fns';
import Image from 'next/image';
import InteractiveMapModal from '@/components/maps/InteractiveMapModal';

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

interface ItineraryDayCardProps {
  day: any;
}

const ItineraryDayCard: React.FC<ItineraryDayCardProps> = ({ day }) => {
  const [expanded, setExpanded] = useState(false);
  // Using a div ref for InView detection
  const cardRef = useRef<HTMLDivElement>(null);
  // Force TypeScript to accept our ref by using a type assertion
  const isInView = useInView(
    // This assertion is safe because HTMLDivElement extends Element
    cardRef as React.RefObject<Element>,
    {
      once: true,
      amount: 0.2
    }
  );
  
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
  
  // Card animations
  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  // Activity animations
  const activityVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
        ease: "easeOut"
      }
    })
  };

  // Stagger children animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const [isMapModalOpen, setMapModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const handleOpenMapModal = (lat: number, lng: number, name: string) => {
    setSelectedLocation({ lat, lng, name });
    setMapModalOpen(true);
  };

  const renderLocation = (activity: any) => {
    if (activity.location_name) {
      if (activity.lat && activity.lng) {
        return (
          <div className="flex items-center">
            <span className="text-gray-600 font-medium">{activity.location_name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2"
              onClick={() => handleOpenMapModal(activity.lat!, activity.lng!, activity.location_name!)}
            >
              <MapPin className="h-4 w-4 text-blue-500" />
            </Button>
          </div>
        );
      }
      return <span className="text-gray-600 font-medium">{activity.location_name}</span>;
    }
    return null;
  };

  return (
    <div ref={cardRef}>
      <MotionDiv
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={cardVariants}
        className="mb-6"
    >
      <Card className="overflow-hidden shadow-sm hover:shadow transition-shadow border-backpack-orange/20">
        <CardHeader className="pb-2 bg-primary/5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg md:text-xl font-semibold text-primary">
              {day.date ? formatDayDate(day.date) : `Day ${day.day_number}`}
            </CardTitle>
            <Badge variant="outline" className="bg-white/80">
              Day {day.day_number}
            </Badge>
          </div>
          {day.description && (
            <p className="text-sm text-gray-600 mt-1">{day.description}</p>
          )}
        </CardHeader>
        
        <CardContent className="p-4 md:p-6">
          {/* Activities Section */}
          <MotionDiv
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-6"
          >
            {hasActivities ? (
              <div className="space-y-4">
                {day.activities.map((activity: any, index: number) => (
                  <MotionDiv 
                    key={activity.id || index}
                    custom={index}
                    variants={activityVariants} 
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary/30 transition-colors"
                    whileHover={{ scale: 1.01, backgroundColor: "rgba(255, 157, 47, 0.02)" }}
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
                            <Badge className="ml-2" variant="secondary">
                              {activity.type}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-sm">
                          {/* Location */}
                          {renderLocation(activity)}
                          
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
                      </div>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            ) : (
              <MotionDiv
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { delay: 0.2 } }
                }}
                className="text-center text-gray-500 py-4 italic"
              >
                No activities planned for this day yet.
              </MotionDiv>
            )}
          </MotionDiv>
          
          {/* Meals Section (Collapsible) */}
          {hasMeals && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Accordion type="single" collapsible className="mt-4">
                <AccordionItem value="meals" className="border-gray-200">
                  <AccordionTrigger className="hover:no-underline">
                    <MotionDiv 
                      className="flex items-center"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Utensils className="h-4 w-4 mr-2 text-backpack-orange" />
                      <span>Meals</span>
                    </MotionDiv>
                  </AccordionTrigger>
                  <AccordionContent>
                    <AnimatePresence>
                      <MotionDiv
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="space-y-3 pt-2">
                          {day.meals.breakfast && (
                            <div className="flex items-start">
                              <Badge variant="outline" className="mr-2 flex-shrink-0">
                                Breakfast
                              </Badge>
                              <div>
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
                            <div className="flex items-start">
                              <Badge variant="outline" className="mr-2 flex-shrink-0">
                                Lunch
                              </Badge>
                              <div>
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
                            <div className="flex items-start">
                              <Badge variant="outline" className="mr-2 flex-shrink-0">
                                Dinner
                              </Badge>
                              <div>
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
                      </MotionDiv>
                    </AnimatePresence>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </MotionDiv>
          )}
        </CardContent>
      </Card>
      {selectedLocation && (
        <InteractiveMapModal
          isOpen={isMapModalOpen}
          onClose={() => setMapModalOpen(false)}
          lat={selectedLocation.lat}
          lng={selectedLocation.lng}
          locationName={selectedLocation.name}
        />
      )}
    </MotionDiv>
    </div>
  );
};

export default ItineraryDayCard;
