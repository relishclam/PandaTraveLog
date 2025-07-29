'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { POAssistantProvider } from '@/contexts/POAssistantContext';
import { GlobalPOAssistant } from '@/components/po/GlobalPOAssistant';

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

// Memoize providers to prevent unnecessary re-renders
const MemoizedErrorBoundary = React.memo(ErrorBoundary);

export function Providers({ children }: { children: React.ReactNode }) {
  // Add global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("🔴 Global error:", event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("🔴 Unhandled Promise rejection:", event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    console.log("🔧 Global error handlers installed");
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Only include the GlobalPOAssistant once at the root level
  // and make sure it's not duplicated in any child components
  const memoizedChildren = React.useMemo(() => children, [children]);
  
  return (
    <MemoizedErrorBoundary>
      <AuthProvider>
        <POAssistantProvider>
          {memoizedChildren}
          <GlobalPOAssistant />
        </POAssistantProvider>
      </AuthProvider>
    </MemoizedErrorBoundary>
  );
}