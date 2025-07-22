import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useOptimizedSave() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const saveData = useCallback(async (table, data, options = {}) => {
    setSaving(true);
    setError(null);
    
    try {
      const { onConflict = 'id', timeout = 10000 } = options;
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );

      const savePromise = supabase
        .from(table)
        .upsert(data, { onConflict, ignoreDuplicates: false })
        .select();

      const result = await Promise.race([savePromise, timeoutPromise]);
      
      if (result.error) throw result.error;
      
      return { success: true, data: result.data };
    } catch (err) {
      setError(err.message);
      console.error(`Error saving to ${table}:`, err);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  }, []);

  return { saveData, saving, error };
}