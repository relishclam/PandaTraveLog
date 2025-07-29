'use client';

import { Button } from '@/components/ui/Button';

export default function Error() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl font-bold mb-4">500 - Server Error</h1>
      <p className="text-gray-600 mb-8">Something went wrong on our end. Please try again later.</p>
      <Button href="/" variant="default">
        Return Home
      </Button>
    </div>
  );
}
