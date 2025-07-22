import { useState } from 'react';
import { useOptimizedSave } from '../hooks/useOptimizedSave';

export default function TravelDetailForm({ travelDetail = {}, onSave, tripId }) {
  const [formData, setFormData] = useState({
    transport_type: travelDetail.transport_type || '',
    departure_location: travelDetail.departure_location || '',
    arrival_location: travelDetail.arrival_location || '',
    departure_time: travelDetail.departure_time || '',
    arrival_time: travelDetail.arrival_time || '',
    booking_reference: travelDetail.booking_reference || '',
    seat_info: travelDetail.seat_info || '',
    notes: travelDetail.notes || '',
    ...travelDetail
  });

  const { saveData, saving, error } = useOptimizedSave();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await saveData('travel_details', {
      ...formData,
      trip_id: tripId,
      id: travelDetail.id
    });

    if (result.success) {
      onSave?.(result.data[0]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transport Type *
          </label>
          <select
            name="transport_type"
            value={formData.transport_type}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select transport type</option>
            <option value="flight">Flight</option>
            <option value="train">Train</option>
            <option value="bus">Bus</option>
            <option value="car">Car</option>
            <option value="taxi">Taxi/Uber</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking Reference
          </label>
          <input
            type="text"
            name="booking_reference"
            value={formData.booking_reference}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirmation number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Departure Location *
          </label>
          <input
            type="text"
            name="departure_location"
            value={formData.departure_location}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Airport, station, address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arrival Location *
          </label>
          <input
            type="text"
            name="arrival_location"
            value={formData.arrival_location}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Airport, station, address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Departure Time
          </label>
          <input
            type="datetime-local"
            name="departure_time"
            value={formData.departure_time}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Arrival Time
          </label>
          <input
            type="datetime-local"
            name="arrival_time"
            value={formData.arrival_time}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seat/Additional Info
          </label>
          <input
            type="text"
            name="seat_info"
            value={formData.seat_info}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Seat number, gate, platform, etc."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Special instructions, contact info, etc."
        />
      </div>

      {error && (
        <div className="p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          Error: {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving...' : 'Save Travel Detail'}
      </button>
    </form>
  );
}