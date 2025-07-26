import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Plus, Edit2, Trash2, MessageCircle, Phone, Mail, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Textarea } from '@/components/ui/Textarea';
import { PoGuide } from '@/components/po/svg/PoGuide';

// Initialize Supabase client for this component
const supabase = createClientComponentClient();

interface CompanionProps {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  relationship?: string;
  whatsapp?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CompanionsProps {
  tripId: string;
}

const Companions: React.FC<CompanionsProps> = ({ tripId }) => {
  const [companions, setCompanions] = useState<CompanionProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCompanion, setNewCompanion] = useState<Partial<CompanionProps>>({
    relationship: 'Friend', // Default relationship
  });
  const [editingCompanion, setEditingCompanion] = useState<CompanionProps | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  
  // Fetch companions from API
  const fetchCompanions = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trips/${tripId}/companions`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch companions');
      }
      
      setCompanions(result.companions || []);
    } catch (err: any) {
      console.error('Error fetching companions:', err);
      setError(err.message || 'Failed to load companions');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tripId]);

  useEffect(() => {
    if (tripId && user?.id) {
      fetchCompanions();
    }
  }, [tripId, user?.id, fetchCompanions]);
  
  const handleAddOrUpdateCompanion = async () => {
    try {
      const companionData = editingCompanion || newCompanion;
      
      if (!companionData.name) {
        toast.error('Name is required');
        return;
      }
      
      const method = editingCompanion ? 'PUT' : 'POST';
      const body = editingCompanion 
        ? { companionId: editingCompanion.id, ...companionData }
        : companionData;
      
      const response = await fetch(`/api/trips/${tripId}/companions`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save companion');
      }
      
      if (editingCompanion) {
        toast.success('Companion updated successfully');
      } else {
        toast.success('Companion added successfully');
      }
      
      // Reset form and close dialog
      setNewCompanion({ relationship: 'Friend' });
      setEditingCompanion(null);
      setIsDialogOpen(false);
      
      // Refresh companions list
      fetchCompanions();
      
    } catch (err: any) {
      console.error('Error saving companion:', err);
      toast.error(err.message || 'Failed to save companion');
    }
  };
  
  const handleDeleteCompanion = async (id: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/companions?companionId=${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete companion');
      }
      
      toast.success('Companion removed');
      fetchCompanions();
      
    } catch (err: any) {
      console.error('Error deleting companion:', err);
      toast.error(err.message || 'Failed to delete companion');
    }
  };
  
  const handleEditCompanion = (companion: CompanionProps) => {
    setEditingCompanion(companion);
    setIsDialogOpen(true);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (editingCompanion) {
      setEditingCompanion({ ...editingCompanion, [name]: value });
    } else {
      setNewCompanion({ ...newCompanion, [name]: value });
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
    if (editingCompanion) {
      setEditingCompanion({ ...editingCompanion, [name]: value });
    } else {
      setNewCompanion({ ...newCompanion, [name]: value });
    }
  };
  
  const openAddDialog = () => {
    setNewCompanion({ relationship: 'Friend' });
    setEditingCompanion(null);
    setIsDialogOpen(true);
  };
  
  // Get WhatsApp URL for direct messaging
  const getWhatsAppUrl = (whatsapp: string) => {
    const cleanNumber = whatsapp.replace(/[^\d+]/g, '');
    return `https://wa.me/${cleanNumber}`;
  };
  
  // Get relationship badge color
  const getRelationshipColor = (relationship: string) => {
    switch (relationship?.toLowerCase()) {
      case 'family':
        return 'bg-red-100 text-red-800';
      case 'friend':
        return 'bg-blue-100 text-blue-800';
      case 'colleague':
        return 'bg-green-100 text-green-800';
      case 'partner':
        return 'bg-purple-100 text-purple-800';
      case 'spouse':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-backpack-orange mx-auto mb-4"></div>
          <p className="text-gray-600">Loading companions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchCompanions} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Travel Companions</CardTitle>
            <CardDescription>
              Manage your travel companions and their contact information
            </CardDescription>
          </div>
          <Button 
            onClick={openAddDialog}
            className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Companion
          </Button>
        </div>

        {/* Companions List */}
        {companions.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <PoGuide 
                    message="No companions yet"
                    type="thinking" 
                    size="medium"
                  />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Companions Added Yet</h3>
                <p className="text-gray-600 mb-4">
                  Add friends and family who are traveling with you.
                </p>
                <Button 
                  onClick={openAddDialog}
                  className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Companion
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {companions.map((companion) => (
              <Card key={companion.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-backpack-orange/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-backpack-orange" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{companion.name}</h3>
                          {companion.relationship && (
                            <Badge className={`text-xs ${getRelationshipColor(companion.relationship)}`}>
                              {companion.relationship}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 ml-13">
                        {companion.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <a 
                              href={`mailto:${companion.email}`}
                              className="hover:text-backpack-orange transition-colors"
                            >
                              {companion.email}
                            </a>
                          </div>
                        )}
                        
                        {companion.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <a 
                              href={`tel:${companion.phone}`}
                              className="hover:text-backpack-orange transition-colors"
                            >
                              {companion.phone}
                            </a>
                          </div>
                        )}
                        
                        {companion.whatsapp && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MessageCircle className="w-4 h-4" />
                            <a 
                              href={getWhatsAppUrl(companion.whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-backpack-orange transition-colors flex items-center gap-1"
                            >
                              WhatsApp: {companion.whatsapp}
                            </a>
                          </div>
                        )}
                        
                        {companion.notes && (
                          <div className="text-sm text-gray-600 mt-2">
                            <p className="italic">{companion.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCompanion(companion)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCompanion(companion.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Companion Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md" aria-describedby="companion-description">
          <DialogHeader>
            <DialogTitle>
              {editingCompanion ? 'Edit Companion' : 'Add Companion'}
            </DialogTitle>
            <DialogDescription id="companion-description">
              {editingCompanion ? 'Update your companion details' : 'Add a new travel companion'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="required">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={editingCompanion?.name || newCompanion.name || ''}
                onChange={handleChange}
                placeholder="Companion's name"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="relationship">
                Relationship
              </Label>
              <Select
                value={editingCompanion?.relationship || newCompanion.relationship || 'Friend'}
                onValueChange={(value) => handleSelectChange('relationship', value)}
              >
                <SelectTrigger id="relationship">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Friend">Friend</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Spouse">Spouse</SelectItem>
                  <SelectItem value="Colleague">Colleague</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={editingCompanion?.email || newCompanion.email || ''}
                onChange={handleChange}
                placeholder="companion@example.com"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone">
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                value={editingCompanion?.phone || newCompanion.phone || ''}
                onChange={handleChange}
                placeholder="Include country code"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="whatsapp">
                WhatsApp Number
              </Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                value={editingCompanion?.whatsapp || newCompanion.whatsapp || ''}
                onChange={handleChange}
                placeholder="Include country code for WhatsApp"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={editingCompanion?.notes || newCompanion.notes || ''}
                onChange={handleChange}
                placeholder="Additional notes about this companion"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOrUpdateCompanion}>
              {editingCompanion ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Companions;
