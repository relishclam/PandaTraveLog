'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Toaster } from 'sonner';
import TripDiary from '@/components/diary/TripDiary';

export default function TripDiaryPage() {
  const params = useParams();
  const tripId = params?.id as string;
  
  return (
    <>
      <Toaster position="top-right" richColors />
      <TripDiary tripId={tripId} />
    </>
  );
}
