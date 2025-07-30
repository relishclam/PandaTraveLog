'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALL_PROMPT_STATUS_KEY = 'panda_travel_install_prompt_status';

export default function PWAInstaller(): JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [recentlyDismissed, setRecentlyDismissed] = useState(false);

  const handleInstallClick = useCallback(async () => {
    let promptEvent: BeforeInstallPromptEvent | null = null;

    if (deferredPrompt) {
      promptEvent = deferredPrompt;
    } else if (deferredPromptRef.current) {
      promptEvent = deferredPromptRef.current;
      setDeferredPrompt(deferredPromptRef.current);
    }

    if (!promptEvent) {
      console.warn('No installation prompt available');
      setShowInstallButton(false);
      return;
    }

    try {
      console.log('📱 Showing installation prompt');
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`📝 User ${outcome} the installation prompt`);

      if (outcome === 'dismissed') {
        try {
          localStorage.setItem(
            INSTALL_PROMPT_STATUS_KEY,
            JSON.stringify({
              dismissed: true,
              timestamp: Date.now(),
            })
          );
          setRecentlyDismissed(true);
        } catch (e) {
          console.error('Failed to save install prompt status:', e);
          setShowInstallButton(false);
        }
      }

      deferredPromptRef.current = null;
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error('Error showing installation prompt:', error);
      setShowInstallButton(false);
    }
  }, [deferredPrompt]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerServiceWorker = () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('✅ SW registered:', registration.scope);
          })
          .catch((error) => {
            console.error('❌ SW registration failed:', error);
          });
      };

      if (!navigator.serviceWorker.controller) {
        registerServiceWorker();
      }
    }
  }, []);

  useEffect(() => {
    const checkPromptStatus = () => {
      try {
        const status = localStorage.getItem(INSTALL_PROMPT_STATUS_KEY);
        if (status) {
          const { dismissed, timestamp } = JSON.parse(status);
          const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
          const isRecent = dismissed && (Date.now() - timestamp < THREE_DAYS);
          setRecentlyDismissed(isRecent);
          return isRecent;
        }
      } catch (e) {
        console.error('Failed to read install prompt status:', e);
        localStorage.removeItem(INSTALL_PROMPT_STATUS_KEY);
      }
      return false;
    };

    const isDismissed = checkPromptStatus();
    if (isDismissed) {
      console.log('Install prompt was recently dismissed, not showing again yet');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🔔 beforeinstallprompt event fired');

      if (!(e instanceof Event && 'prompt' in e)) {
        console.error('Invalid install prompt event received');
        return;
      }

      const beforeInstallPromptEvent = e as BeforeInstallPromptEvent;
      e.preventDefault();

      if (recentlyDismissed) {
        console.log('Install prompt was dismissed recently, not showing');
        return;
      }

      deferredPromptRef.current = beforeInstallPromptEvent;
      setDeferredPrompt(beforeInstallPromptEvent);

      const isAuthPage = window.location.pathname.includes('/auth') ||
        window.location.pathname.includes('/login') ||
        window.location.pathname.includes('/signup');

      if (!isAuthPage) {
        setShowInstallButton(true);
      }
    };

    const handleAppInstalled = () => {
      console.log('🎉 PWA was installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
      deferredPromptRef.current = null;

      try {
        localStorage.removeItem(INSTALL_PROMPT_STATUS_KEY);
      } catch (e) {
        console.error('Failed to clear install prompt status:', e);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [recentlyDismissed]);

  useEffect(() => {
    return () => {
      if (deferredPromptRef.current) {
        console.log('Component unmounted, cleaning up prompt');
        deferredPromptRef.current = null;
      }
    };
  }, []);

  const handleDismiss = () => {
    setShowInstallButton(false);
    try {
      localStorage.setItem(INSTALL_PROMPT_STATUS_KEY, JSON.stringify({
        dismissed: true,
        timestamp: Date.now(),
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
