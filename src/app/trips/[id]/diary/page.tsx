'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

type Trip = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
};

type DiaryEntry = {
  id: string;
  trip_id: string;
  day: number;
  date: string;
  title: string;
  content: string;
  mood: string;
  photos: string[];
  created_at: string;
};

export default function DiaryPage() {
  const { id: tripId } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Fetch trip details
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .eq('user_id', user.id)
          .single();

        if (tripError) throw tripError;
        setTrip(tripData);

        // Fetch diary entries (you may need to create this table)
        const { data: diaryData, error: diaryError } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('trip_id', tripId)
          .order('day', { ascending: true });

        if (diaryError && diaryError.code !== 'PGRST116') { // Ignore "no rows" error
          console.error('Diary error:', diaryError);
        }
        
        setDiaryEntries(diaryData || []);
        
      } catch (err: any) {
        console.error('Error fetching diary data:', err);
        setError('Failed to load diary');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [user, tripId, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-backpack-orange rounded-full animate-spin mb-4"></div>
        <div>Loading diary...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error || 'Trip not found'}
        </div>
        <Button href="/trips" variant="outline">
          Back to My Trips
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-panda-black mb-2">
              {trip.title} - Travel Diary
            </h1>
            <p className="text-gray-600">{trip.destination}</p>
          </div>
          <Button
            href={`/trips/${tripId}`}
            variant="outline"
          >
            ← Back to Trip
          </Button>
        </div>
      </div>

      {/* Diary Entries */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {diaryEntries.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <svg 
                className="mx-auto h-24 w-24 text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your Travel Diary Awaits
            </h3>
            <p className="text-gray-600 mb-6">
              Start documenting your {trip.destination} adventure! 
              {trip.status === 'planned' 
                ? ' Add entries as you travel to capture every moment.'
                : ' You can add entries even before your trip starts.'
              }
            </p>
            <Button
              href={`/trips/${tripId}/diary/new`}
              className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
              Write Your First Entry
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Diary Entries</h2>
              <Button
                href={`/trips/${tripId}/diary/new`}
                className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
              >
                + New Entry
              </Button>
            </div>
            
            <div className="space-y-6">
              {diaryEntries.map((entry) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{entry.title}</h3>
                      <p className="text-gray-600">
                        Day {entry.day} • {formatDate(entry.date)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{entry.mood}</span>
                      <Button
                        href={`/trips/${tripId}/diary/${entry.id}/edit`}
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                  
                  {entry.photos && entry.photos.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {entry.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Memory ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}