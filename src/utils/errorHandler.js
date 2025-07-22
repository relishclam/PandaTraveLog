export const handleError = (error) => {
    console.error('Application error:', error);
    
    // Database constraint errors
    if (error?.code === '23505') {
      return 'This item already exists. Please try updating instead.';
    }
    
    if (error?.code === '23503') {
      return 'Invalid reference. Please check your data and try again.';
    }
    
    if (error?.code === 'PGRST301') {
      return 'You do not have permission to access this resource.';
    }
    
    // Network errors
    if (error?.message?.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Timeout errors
    if (error?.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    // Default error message
    return error?.message || 'An unexpected error occurred. Please try again.';
  };
  
  export const showNotification = (message, type = 'info') => {
    // Simple notification - you can replace with a proper notification library
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 ${
      type === 'error' ? 'bg-red-500' : 
      type === 'success' ? 'bg-green-500' : 
      'bg-blue-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };