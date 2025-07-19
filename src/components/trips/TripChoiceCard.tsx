'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MotionDiv } from '@/components/ui/Motion';
import { 
  MapPin, 
  Calendar, 
  Plane, 
  Hotel, 
  Sparkles, 
  PenTool,
  Clock,
  CheckCircle 
} from 'lucide-react';

interface TripChoiceCardProps {
  onManualEntry: () => void;
  onAiPlanning: () => void;
}

const TripChoiceCard: React.FC<TripChoiceCardProps> = ({ 
  onManualEntry, 
  onAiPlanning 
}) => {
  const [selectedChoice, setSelectedChoice] = useState<'manual' | 'ai' | null>(null);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const handleChoice = (choice: 'manual' | 'ai') => {
    setSelectedChoice(choice);
    setTimeout(() => {
      if (choice === 'manual') {
        onManualEntry();
      } else {
        onAiPlanning();
      }
    }, 300);
  };

  return (
    <MotionDiv
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto"
    >
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
            Plan Your Next Adventure
          </CardTitle>
          <p className="text-gray-600 text-lg">
            Do you have a trip planned, or would you like our AI to help you create one?
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Manual Entry Option */}
            <MotionDiv
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative cursor-pointer transition-all duration-300 ${
                selectedChoice === 'manual' ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleChoice('manual')}
            >
              <Card className="h-full bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <PenTool className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-800">
                    I Have a Trip Planned
                  </CardTitle>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Manual Entry
                  </Badge>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-center mb-4">
                    Enter your existing travel details and let us organize them for you.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-3 text-green-500" />
                      <span>Add your destinations</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-3 text-green-500" />
                      <span>Input your daily schedule</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Plane className="w-4 h-4 mr-3 text-green-500" />
                      <span>Add flight & transport details</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Hotel className="w-4 h-4 mr-3 text-green-500" />
                      <span>Include accommodation info</span>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={selectedChoice !== null}
                    >
                      {selectedChoice === 'manual' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Starting Manual Entry...
                        </>
                      ) : (
                        'Start Manual Entry'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>

            {/* AI Planning Option */}
            <MotionDiv
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative cursor-pointer transition-all duration-300 ${
                selectedChoice === 'ai' ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => handleChoice('ai')}
            >
              <Card className="h-full bg-white border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-800">
                    Let AI Plan My Trip
                  </CardTitle>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    AI Powered
                  </Badge>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-gray-600 text-center mb-4">
                    Get personalized recommendations and a complete itinerary created just for you.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Sparkles className="w-4 h-4 mr-3 text-purple-500" />
                      <span>AI-powered destination suggestions</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-3 text-purple-500" />
                      <span>Optimized daily schedules</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-3 text-purple-500" />
                      <span>Local attractions & hidden gems</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Hotel className="w-4 h-4 mr-3 text-purple-500" />
                      <span>Personalized recommendations</span>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={selectedChoice !== null}
                    >
                      {selectedChoice === 'ai' ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Starting AI Planning...
                        </>
                      ) : (
                        'Start AI Planning'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>
          </div>
          
          {/* Help Text */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Don't worry! You can always switch between manual and AI assistance later.
            </p>
          </div>
        </CardContent>
      </Card>
    </MotionDiv>
  );
};

export default TripChoiceCard;
