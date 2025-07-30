'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  MobileModal,
  MobileModalContent,
  MobileModalDescription,
  MobileModalHeader,
  MobileModalBody,
  MobileModalFooter,
  MobileModalTitle,
  MobileModalTrigger,
} from '@/components/ui/mobile-modal'
import { Plus } from 'lucide-react'

export function CreateTripModal() {
  const [open, setOpen] = useState(false)

  return (
    <MobileModal open={open} onOpenChange={setOpen}>
      <MobileModalTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Trip
        </Button>
      </MobileModalTrigger>
      <MobileModalContent 
        className="max-w-2xl"
        description="Create a new travel itinerary with AI assistance"
      >
        <MobileModalHeader>
          <MobileModalTitle>Create New Trip</MobileModalTitle>
          <MobileModalDescription>
            Plan your next adventure with AI-powered suggestions
          </MobileModalDescription>
        </MobileModalHeader>
        
        <MobileModalBody>
          {/* Your form content here - this will scroll properly on mobile */}
          <div className="space-y-6">
            {/* Basic trip information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Trip Details</h3>
              {/* Form fields */}
            </div>
            
            {/* AI Generation section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">AI Trip Generation</h3>
              {/* AI form fields */}
            </div>
            
            {/* Emergency contacts */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Emergency Contacts</h3>
              {/* Emergency contact fields */}
            </div>
            
            {/* Companions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Travel Companions</h3>
              {/* Companion fields */}
            </div>
          </div>
        </MobileModalBody>
        
        <MobileModalFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit">
            Create Trip
          </Button>
        </MobileModalFooter>
      </MobileModalContent>
    </MobileModal>
  )
}
