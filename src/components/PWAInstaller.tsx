'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
          console.log('✅ SW registered: ', registration);
        } catch (error) {
          console.error('❌ SW registration failed: ', error);
        }
      });
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(beforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for the app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Ensure prompt() is called after preventDefault()
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  if (!showInstallButton) {
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
            onClick={() => setShowInstallButton(false)}
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
