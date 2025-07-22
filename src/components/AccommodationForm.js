import { useState } from 'react';
import { useOptimizedSave } from '../hooks/useOptimizedSave';

export default function AccommodationForm({ accommodation = {}, onSave, tripId }) {
  const [formData, setFormData] = useState({
    name: accommodation.name || '',
    address: accommodation.address || '',
    check_in_date: accommodation.check_in_date || '',
    check_out_date: accommodation.check_out_date || '',
    booking_reference: accommodation.booking_reference || '',
    notes: accommodation.notes || '',
    ...accommodation
  });

  const { saveData, saving, error } = useOptimizedSave();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await saveData('accommodations', {
      ...formData,
      trip_id: tripId,
      id: accommodation.id
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
            Accommodation Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Hotel name, Airbnb, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Full address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-in Date
          </label>
          <input
            type="date"
            name="check_in_date"
            value={formData.check_in_date}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-out Date
          </label>
          <input
            type="date"
            name="check_out_date"
            value={formData.check_out_date}
            onChange={handleChange}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
          placeholder="Special requests, amenities, etc."
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
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving...' : 'Save Accommodation'}
      </button>
    </form>
  );
}