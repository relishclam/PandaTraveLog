export const TRANSPORT_TYPES = [
    { value: 'flight', label: 'Flight' },
    { value: 'train', label: 'Train' },
    { value: 'bus', label: 'Bus' },
    { value: 'car', label: 'Car' },
    { value: 'taxi', label: 'Taxi/Uber' },
    { value: 'ferry', label: 'Ferry' },
    { value: 'other', label: 'Other' }
  ];
  
  export const TRIP_STATUS = {
    PLANNING: 'planning',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  };
  
  export const API_ENDPOINTS = {
    TRIPS: '/api/trips',
    ACCOMMODATIONS: '/api/trips/update-accommodation',
    TRAVEL: '/api/trips/update-travel',
    SCHEDULES: '/api/trips/update-schedule'
  };