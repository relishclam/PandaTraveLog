import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/Dialog';
import { Plus, Edit2, Trash2, Copy, ExternalLink, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { toast } from 'sonner';
import supabase from '@/lib/supabase';
import { useAuth } from '@/hooks/auth';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { PoGuide } from '@/components/po/svg/PoGuide';

interface CompanionProps {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  profile_image?: string;
}

interface CompanionsListProps {
  tripId: string;
}

const CompanionsList: React.FC<CompanionsListProps> = ({ tripId }) => {
  const [companions, setCompanions] = useState<CompanionProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCompanion, setNewCompanion] = useState<Partial<CompanionProps>>({});
  const [editingCompanion, setEditingCompanion] = useState<CompanionProps | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  
  useEffect(() => {
    fetchCompanions();
  }, [tripId]);
  
  const fetchCompanions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('trip_companions')
        .select('*')
        .eq('trip_id', tripId)
        .order('name');
      
      if (error) throw error;
      
      setCompanions(data || []);
    } catch (err: any) {
      console.error('Error fetching companions:', err);
      setError(err.message || 'Failed to load companions');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddOrUpdateCompanion = async () => {
    try {
      const companionData = editingCompanion || newCompanion;
      
      if (!companionData.name) {
        toast.error('Name is required');
        return;
      }
      
      if (editingCompanion) {
        // Update existing companion
        const { error } = await supabase
          .from('trip_companions')
          .update({
            name: companionData.name,
            email: companionData.email || null,
            phone: companionData.phone || null,
            whatsapp: companionData.whatsapp || null,
            notes: companionData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCompanion.id);
        
        if (error) throw error;
        
        toast.success('Companion updated successfully');
      } else {
        // Add new companion
        const { error } = await supabase
          .from('trip_companions')
          .insert({
            trip_id: tripId,
            name: companionData.name,
            email: companionData.email || null,
            phone: companionData.phone || null,
            relationship: companionData.whatsapp || null, // Map whatsapp to relationship field
          });
        
        if (error) throw error;
        
        toast.success('Companion added successfully');
      }
      
      // Reset form state and refresh data
      setNewCompanion({});
      setEditingCompanion(null);
      setIsDialogOpen(false);
      fetchCompanions();
    } catch (err: any) {
      console.error('Error saving companion:', err);
      toast.error(err.message || 'Failed to save companion');
    }
  };
  
  const handleDeleteCompanion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('trip_companions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Companion removed');
      setCompanions(companions.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting companion:', err);
      toast.error(err.message || 'Failed to delete companion');
    }
  };
  
  const handleEditCompanion = (companion: CompanionProps) => {
    setEditingCompanion(companion);
    setIsDialogOpen(true);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingCompanion) {
      setEditingCompanion({ ...editingCompanion, [name]: value });
    } else {
      setNewCompanion({ ...newCompanion, [name]: value });
    }
  };
  
  const openAddDialog = () => {
    setEditingCompanion(null);
    setNewCompanion({});
    setIsDialogOpen(true);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };
  
  // Format WhatsApp URL
  const getWhatsAppUrl = (phone: string) => {
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    return `https://wa.me/${formattedPhone}`;
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trip Companions</CardTitle>
          <CardDescription>People joining you on this adventure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-200 h-10 w-10"></div>
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <p className="text-red-800">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={fetchCompanions}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Trip Companions</CardTitle>
            <CardDescription>People joining you on this adventure</CardDescription>
          </div>
          <Button size="sm" onClick={openAddDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Companion
          </Button>
        </CardHeader>
        
        <CardContent>
          {companions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PoGuide 
                message="You haven't added any companions to this trip yet."
                type="thinking"
                size="medium"
              />
              <p className="mt-4 text-gray-600">
                Add your travel buddies to keep track of everyone joining you.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={openAddDialog}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Companion
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="grid gap-4">
                {companions.map((companion) => (
                  <div 
                    key={companion.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarImage src={companion.profile_image || ''} alt={companion.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(companion.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h3 className="font-semibold">{companion.name}</h3>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => handleEditCompanion(companion)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive/80" 
                              onClick={() => handleDeleteCompanion(companion.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-2 space-y-1 text-sm">
                          {companion.email && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">{companion.email}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => copyToClipboard(companion.email!, 'Email')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          {companion.phone && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">{companion.phone}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6" 
                                onClick={() => copyToClipboard(companion.phone!, 'Phone')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          {companion.whatsapp && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">WhatsApp: {companion.whatsapp}</span>
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(companion.whatsapp!, 'WhatsApp')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <a
                                  href={getWhatsAppUrl(companion.whatsapp)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-gray-100"
                                >
                                  <ExternalLink className="h-3 w-3 text-primary" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {companion.notes && (
                          <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {companion.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCompanion ? 'Edit Companion' : 'Add New Companion'}
            </DialogTitle>
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
                placeholder="Full Name"
                required
              />
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
                placeholder="Email Address"
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
                placeholder="Phone Number"
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
                placeholder="WhatsApp Number (with country code)"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">
                Notes
              </Label>
              <Input
                id="notes"
                name="notes"
                value={editingCompanion?.notes || newCompanion.notes || ''}
                onChange={handleChange}
                placeholder="Additional information"
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

export default CompanionsList;
