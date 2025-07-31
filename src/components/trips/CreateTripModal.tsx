'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { PoGuide } from '@/components/po/svg/PoGuide';

interface CreateTripModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const supabase = createClient();

const CreateTripModal = ({ open, onClose, onSuccess }: CreateTripModalProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    start_date: '',
    end_date: '',
    description: ''
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!user && open) {
      toast.error('Please log in to create a trip');
      router.push('/login');
    }
  }, [user, open, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('trips')
        .insert({
          ...formData,
          user_id: user.id,
          status: 'planning'
        });

      if (error) throw error;
      
      toast.success('Trip created successfully!');
      onSuccess();
      setFormData({
        title: '',
        destination: '',
        start_date: '',
        end_date: '',
        description: ''
      });
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create New Trip
            <PoGuide 
              type="excited" 
              message="Let's plan your adventure!"
              size="small"
            />
          </DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 bg-orange-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <PoGuide 
              type="thinking"
              message="Here's how to get started:"
              size="small"
            />
            <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
              <li>First, give your trip a memorable name</li>
              <li>Tell me where you're heading</li>
              <li>Pick your travel dates</li>
              <li>Then I'll help you plan the perfect itinerary!</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Trip Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Summer Vacation 2024"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="Paris, France"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-backpack-orange hover:bg-backpack-orange/90"
            >
              {isSubmitting ? 'Creating...' : 'Create Trip & Plan Itinerary'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTripModal;