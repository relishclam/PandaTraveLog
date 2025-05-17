'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { blockGoogleMapsScripts } from '@/lib/google-maps-blocker';

// Simple error boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error("React Error Boundary caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          <h2>Something went wrong in the UI.</h2>
          <p>Please try refreshing the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Add global error handler and Google Maps blocker
  useEffect(() => {
    // Set up error handler
    const handleError = (event: ErrorEvent) => {
      console.error("🔴 Global error:", event.error);
    };

    window.addEventListener('error', handleError);
    console.log("🔧 Global error handlers installed");
    
    // Block Google Maps Platform APIs
    blockGoogleMapsScripts();
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ErrorBoundary>
  );
}