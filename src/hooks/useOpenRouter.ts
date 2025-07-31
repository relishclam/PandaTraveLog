import { useState, useCallback } from 'react';

export interface EmergencyContact {
  name: string;
  phone: string;
  type: string;
  address?: string;
  notes?: string;
}

export interface UseOpenRouterResult {
  generateText: (prompt: string) => Promise<string>;
  extractEmergencyContacts: (context: any) => Promise<EmergencyContact[]>;
  isLoading: boolean;
  error: string | null;
}

export function useOpenRouter(): UseOpenRouterResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateText = useCallback(
    async (prompt: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) throw new Error('Failed to generate text');
        const data = await response.json();
        return data.text;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to generate text';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const extractEmergencyContacts = useCallback(
    async (context: any): Promise<EmergencyContact[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/ai/extract-contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(context),
        });

        if (!response.ok) throw new Error('Failed to extract contacts');
        const data = await response.json();
        return data.contacts;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to extract contacts';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    generateText,
    extractEmergencyContacts,
    isLoading,
    error,
  };
}
