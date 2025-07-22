import { useState } from 'react';
import { useOptimizedSave } from '../hooks/useOptimizedSave';

export default function DayScheduleForm({ schedule = {}, onSave, tripId, dayNumber }) {
  const [formData, setFormData] = useState({
    activities: schedule.activities || '',
    notes: schedule.notes || '',
    date: schedule.date || '',
    ...schedule
  });

  const { saveData, saving, error } = useOptimizedSave();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const result = await saveData('trip_day_schedules', {
      ...formData,
      trip_id: tripId,
      day_number: dayNumber,
      id: schedule.id
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
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-800">Day {dayNumber}</h4>
        <div className="text-sm text-gray-500">
          {formData.date && new Date(formData.date).toLocaleDateString()}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Activities & Schedule
        </label>
        <textarea
          name="activities"
          value={formData.activities}
          onChange={handleChange}
          rows={4}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="9:00 AM - Breakfast at hotel&#10;10:00 AM - Visit museum&#10;1:00 PM - Lunch at local restaurant&#10;3:00 PM - Walking tour..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Important reminders, contact info, backup plans..."
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
        className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? 'Saving...' : 'Save Day Schedule'}
      </button>
    </form>
  );
}