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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { format } from 'date-fns';

const supabase = createClient();

interface CreateTripModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateTripModal = ({ open, onClose, onSuccess }: CreateTripModalProps) => {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [poState, setPoState] = useState<'excited' | 'thinking' | 'confused'>('excited');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    start_date: '',
    end_date: '',
    description: '',
    tripType: 'leisure' as 'leisure' | 'business' | 'adventure'
  });

  // Auth check
  useEffect(() => {
    if (!user && open) {
      toast.error('Please log in to create a trip');
      router.push('/login');
    }
  }, [user, open, router]);

  // PO's reaction to user input
  useEffect(() => {
    if (formData.destination && !formData.start_date) {
      setPoState('thinking');
    } else if (formData.destination && formData.start_date && formData.end_date) {
      setPoState('excited');
    } else if (!formData.title && step > 1) {
      setPoState('confused');
    }
  }, [formData, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          ...formData,
          user_id: user.id,
          status: 'planning'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Trip created successfully!');
      onSuccess();

      // Navigate to trip planning
      if (data?.id) {
        router.push(`/trips/${data.id}/plan`);
      }
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
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2">
            Create New Trip
            <PoGuide 
              type={poState}
              message={
                poState === 'excited' ? "Let's plan your adventure!" :
                poState === 'thinking' ? "When are you planning to go?" :
                "I need a few more details..."
              }
              size="small"
            />
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="basics" className="flex-1">Basic Info</TabsTrigger>
              <TabsTrigger value="dates" className="flex-1">Dates</TabsTrigger>
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4">
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
                <Label htmlFor="destination">Where to?</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                  placeholder="Paris, France"
                  required
                />
              </div>
            </TabsContent>

            <TabsContent value="dates" className="space-y-4">
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
                    min={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div>
                <Label>Trip Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['leisure', 'business', 'adventure'].map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={formData.tripType === type ? 'default' : 'outline'}
                      onClick={() => setFormData(prev => ({ ...prev, tripType: type as any }))}
                      className="w-full capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between pt-6 border-t">
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
              disabled={isSubmitting || !formData.title || !formData.destination || !formData.start_date || !formData.end_date}
              className="bg-backpack-orange hover:bg-backpack-orange/90"
            >
              {isSubmitting ? 'Creating...' : 'Create Trip & Start Planning'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTripModal;