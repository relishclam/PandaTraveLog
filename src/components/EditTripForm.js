import { useState } from 'react';
import { useTripData } from '../hooks/useTripData';
import LoadingSpinner from './LoadingSpinner';
import AccommodationForm from './AccommodationForm';
import TravelDetailForm from './TravelDetailForm';
import DayScheduleForm from './DayScheduleForm';

export default function EditTripForm({ tripId }) {
  const { data, loading, error, reload } = useTripData(tripId);
  const [activeSection, setActiveSection] = useState('accommodations');

  if (loading) return <LoadingSpinner text="Loading trip data..." />;
  if (error) return (
    <div className="p-4 bg-red-100 text-red-700 rounded">
      Error loading trip: {error}
      <button onClick={reload} className="ml-2 px-2 py-1 bg-red-600 text-white rounded text-sm">
        Retry
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveSection('accommodations')}
          className={`px-4 py-2 ${activeSection === 'accommodations' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Accommodations ({data.accommodations.length})
        </button>
        <button
          onClick={() => setActiveSection('travel')}
          className={`px-4 py-2 ${activeSection === 'travel' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Travel ({data.travelDetails.length})
        </button>
        <button
          onClick={() => setActiveSection('schedules')}
          className={`px-4 py-2 ${activeSection === 'schedules' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Schedules ({data.dailySchedules.length})
        </button>
      </div>

      {/* Content */}
      {activeSection === 'accommodations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Accommodations</h3>
            <button
              onClick={() => {/* Add new accommodation */}}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Accommodation
            </button>
          </div>
          {data.accommodations.map((acc) => (
            <AccommodationForm key={acc.id} accommodation={acc} tripId={tripId} onSave={reload} />
          ))}
          {data.accommodations.length === 0 && (
            <AccommodationForm tripId={tripId} onSave={reload} />
          )}
        </div>
      )}

      {activeSection === 'travel' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Travel Details</h3>
            <button
              onClick={() => {/* Add new travel */}}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add Travel Detail
            </button>
          </div>
          {data.travelDetails.map((travel) => (
            <TravelDetailForm key={travel.id} travelDetail={travel} tripId={tripId} onSave={reload} />
          ))}
          {data.travelDetails.length === 0 && (
            <TravelDetailForm tripId={tripId} onSave={reload} />
          )}
        </div>
      )}

      {activeSection === 'schedules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Daily Schedules</h3>
            <button
              onClick={() => {/* Add new schedule */}}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Add Day
            </button>
          </div>
          {data.dailySchedules.map((schedule) => (
            <DayScheduleForm 
              key={schedule.day_number} 
              schedule={schedule} 
              tripId={tripId} 
              dayNumber={schedule.day_number} 
              onSave={reload} 
            />
          ))}
          {data.dailySchedules.length === 0 && (
            <DayScheduleForm tripId={tripId} dayNumber={1} onSave={reload} />
          )}
        </div>
      )}
    </div>
  );
}