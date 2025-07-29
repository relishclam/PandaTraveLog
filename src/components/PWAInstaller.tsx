'use client';

import { useEffect, useState, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Storage key for installation status
const INSTALL_PROMPT_STATUS_KEY = 'panda_travel_install_prompt_status';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  
  // Using a ref to ensure the prompt event is saved even if component re-renders
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  
  // Track if user has dismissed the prompt recently
  const [recentlyDismissed, setRecentlyDismissed] = useState(false);

  useEffect(() => {
    // Check if user has recently dismissed the prompt
    const checkPromptStatus = () => {
      try {
        const status = localStorage.getItem(INSTALL_PROMPT_STATUS_KEY);
        if (status) {
          const { dismissed, timestamp } = JSON.parse(status);
          // Consider dismissals within the last 3 days as "recent"
          const isRecent = dismissed && (Date.now() - timestamp < 3 * 24 * 60 * 60 * 1000);
          setRecentlyDismissed(isRecent);
          return isRecent;
        }
      } catch (e) {
        console.error('Failed to read install prompt status:', e);
      }
      return false;
    };

    const isDismissed = checkPromptStatus();
    if (isDismissed) {
      console.log('Install prompt was recently dismissed, not showing again yet');
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      // Use an IIFE for async service worker registration
      (async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          console.log('✅ SW registered: ', registration);
        } catch (error) {
          console.error('❌ SW registration failed: ', error);
        }
      })();
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🔔 beforeinstallprompt event fired');
      
      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      
      // Don't show if recently dismissed
      if (isDismissed) {
        console.log('Install prompt was dismissed recently, not showing');
        return;
      }
      
      // Save the event for later use
      deferredPromptRef.current = beforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallPromptEvent);
      setShowInstallButton(true);
      
      // Automatically show prompt after a short delay if conditions are met
      setTimeout(() => {
        maybeShowPromptAutomatically();
      }, 3000);
    };
    
    // Function to automatically show the prompt based on conditions
    const maybeShowPromptAutomatically = () => {
      // Only auto-prompt on certain pages or conditions
      const shouldAutoPrompt = window.location.pathname === '/trips' || 
                              window.location.pathname === '/';
      
      // Don't show prompt on auth-related pages to prevent loops
      const isAuthPage = window.location.pathname.includes('/auth') || 
                        window.location.pathname.includes('/login') ||
                        window.location.pathname.includes('/signup');
      
      if (shouldAutoPrompt && !isAuthPage && deferredPromptRef.current && !recentlyDismissed) {
        console.log('Auto-showing installation prompt');
        handleInstallClick();
      }
    };

    // Handle the install click
    const handleInstallClick = async () => {
      const promptEvent = deferredPromptRef.current;
      
      if (!promptEvent) {
        console.warn('No installation prompt available');
        return;
      }
      
      try {
        console.log('📱 Showing installation prompt');
        
        // Show the installation prompt
        await promptEvent.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await promptEvent.userChoice;
        console.log(`📝 User ${outcome} the installation prompt`);
        
        if (outcome === 'dismissed') {
          // Remember that user dismissed the prompt
          try {
            localStorage.setItem(INSTALL_PROMPT_STATUS_KEY, JSON.stringify({
              dismissed: true,
              timestamp: Date.now()
            }));
            setRecentlyDismissed(true);
          } catch (e) {
            console.error('Failed to save install prompt status:', e);
          }
        }
        
        // Clear the saved prompt
        deferredPromptRef.current = null;
        setDeferredPrompt(null);
        setShowInstallButton(false);
        
      } catch (error) {
        console.error('Error showing installation prompt:', error);
      }
    };

    // Register the event listener
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for the app installed event
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA was installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
      deferredPromptRef.current = null;
      
      // Clear dismissed status if app was installed
      try {
        localStorage.removeItem(INSTALL_PROMPT_STATUS_KEY);
      } catch (e) {
        console.error('Failed to clear install prompt status:', e);
      }
    });

    // Make handleInstallClick available globally for debugging
    (window as any).__showPWAInstallPrompt = () => handleInstallClick();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      delete (window as any).__showPWAInstallPrompt;
    };
  }, [recentlyDismissed]);

  // Clean up event listener when component unmounts
  useEffect(() => {
    return () => {
      // Ensure we don't leave prompt hanging if component unmounts
      if (deferredPromptRef.current) {
        console.log('Component unmounted, showing prompt to prevent blocking');
        deferredPromptRef.current.prompt().catch(err => {
          console.error('Error showing prompt on unmount:', err);
        });
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt && deferredPromptRef.current) {
      setDeferredPrompt(deferredPromptRef.current);
    }
    
    const promptEvent = deferredPrompt || deferredPromptRef.current;
    
    if (promptEvent) {
      try {
        console.log('📱 Showing installation prompt on button click');
        
        // Show the installation prompt
        await promptEvent.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await promptEvent.userChoice;
        console.log(`📝 User ${outcome} the installation prompt`);
        
        if (outcome === 'dismissed') {
          // Remember that user dismissed the prompt
          try {
            localStorage.setItem(INSTALL_PROMPT_STATUS_KEY, JSON.stringify({
              dismissed: true,
              timestamp: Date.now()
            }));
            setRecentlyDismissed(true);
          } catch (e) {
            console.error('Failed to save install prompt status:', e);
          }
        }
        
        // Clear the saved prompt
        deferredPromptRef.current = null;
        setDeferredPrompt(null);
        setShowInstallButton(false);
        
      } catch (error) {
        console.error('Error showing installation prompt:', error);
      }
    } else {
      console.warn('No installation prompt available');
    }
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    // Remember that user dismissed the prompt
    try {
      localStorage.setItem(INSTALL_PROMPT_STATUS_KEY, JSON.stringify({
        dismissed: true,
        timestamp: Date.now()
      }));
      setRecentlyDismissed(true);
    } catch (e) {
      console.error('Failed to save install prompt status:', e);
    }
  };

  if (!showInstallButton || recentlyDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-orange-500 text-white p-3 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <span className="text-2xl">🐼</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Install PandaTraveLog</p>
          <p className="text-xs opacity-90">Get the full app experience!</p>
        </div>
        <div className="flex space-x-2">
          <button
            id="install-button"
            onClick={handleInstallClick}
            className="bg-white text-orange-500 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close install prompt"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}