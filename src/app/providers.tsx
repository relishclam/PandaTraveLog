'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  // Add global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("🔴 Global error:", event.error);
      console.error("Error message:", event.error?.message);
      console.error("Error stack:", event.error?.stack);
    };

    // Handle unhandled rejections (promises)
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("🔴 Unhandled Promise Rejection:", event.reason);
      console.error("Rejection reason:", event.reason?.message || event.reason);
      console.error("Rejection stack:", event.reason?.stack);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    console.log("🔧 Global error handlers installed");
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}