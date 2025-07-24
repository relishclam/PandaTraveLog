import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Plus, Edit2, Trash2, Copy, ExternalLink, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Initialize Supabase client for this component
const supabase = createClientComponentClient();
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Textarea } from '@/components/ui/Textarea';
import { PoGuide } from '@/components/po/svg/PoGuide';

interface EmergencyContactProps {
  id: string;
  name: string;
  phone: string;
  type: string;
  address?: string;
  notes?: string;
  priority?: number;
}

interface EmergencyContactsProps {
  tripId: string;
}

const EmergencyContacts: React.FC<EmergencyContactsProps> = ({ tripId }) => {
  const [contacts, setContacts] = useState<EmergencyContactProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [newContact, setNewContact] = useState<Partial<EmergencyContactProps>>({
    type: 'medical', // Default type
    priority: 1,
  });
  const [editingContact, setEditingContact] = useState<EmergencyContactProps | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  
  // Add useCallback to prevent infinite re-renders
  // Fix the fetchContacts function in EmergencyContacts.tsx
const fetchContacts = useCallback(async () => {
  if (!user?.id) return; // Only prevent if no user
  
  setIsLoading(true);
  setError(null);
  
  try {
    const { data, error } = await supabase
      .from('travel_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
    if (error) throw error;
    
    setContacts(data || []);
  } catch (err: any) {
    console.error('Error fetching emergency contacts:', err);
    setError(err.message || 'Failed to load emergency contacts');
  } finally {
    setIsLoading(false);
  }
}, [user?.id]); // 🔥 FIXED: Removed isLoading from dependencies

// Update the useEffect
useEffect(() => {
  if (tripId && user?.id) {
    fetchContacts();
  }
}, [tripId, user?.id, fetchContacts]); // 🔥 FIXED: Added fetchContacts back since it's stable now // Remove fetchContacts from dependencies
  
  const handleAddOrUpdateContact = async () => {
    try {
      const contactData = editingContact || newContact;
      
      if (!contactData.name || !contactData.phone || !contactData.type) {
        toast.error('Name, phone, and type are required');
        return;
      }
      
      if (editingContact) {
        // Update existing contact
        const { error } = await supabase
          .from('travel_contacts')
          .update({
            name: contactData.name,
            phone: contactData.phone,
            relationship: contactData.type, // Map type to relationship field
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingContact.id);
        
        if (error) throw error;
        
        toast.success('Emergency contact updated successfully');
      } else {
        // Add new contact
        const { error } = await supabase
          .from('travel_contacts')
          .insert({
            user_id: user?.id,
            name: contactData.name,
            phone: contactData.phone,
            relationship: contactData.type, // Map type to relationship field
          });
        
        if (error) throw error;
        
        toast.success('Emergency contact added successfully');
      }
      
      // Reset form state and refresh data
      setNewContact({
        type: 'medical', // Default type
        priority: 1,
      });
      setEditingContact(null);
      setIsDialogOpen(false);
      fetchContacts();
    } catch (err: any) {
      console.error('Error saving emergency contact:', err);
      toast.error(err.message || 'Failed to save emergency contact');
    }
  };
  
  const handleDeleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('travel_contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Emergency contact removed');
      setContacts(contacts.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting emergency contact:', err);
      toast.error(err.message || 'Failed to delete emergency contact');
    }
  };

  const handleGenerateAIContacts = async () => {
    try {
      setAiGenerating(true);
      setError(null);
      
      const response = await fetch(`/api/trips/${tripId}/emergency-contacts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate emergency contacts');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Generated ${result.newContactsAdded} new emergency contacts for your destination!`);
        await fetchContacts(); // Refresh the contacts list
      } else {
        throw new Error(result.error || 'Failed to generate contacts');
      }
      
    } catch (err: any) {
      console.error('Error generating AI contacts:', err);
      toast.error(err.message || 'Failed to generate emergency contacts');
    } finally {
      setAiGenerating(false);
    }
  };
  
  const handleEditContact = (contact: EmergencyContactProps) => {
    setEditingContact(contact);
    setIsDialogOpen(true);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingContact) {
      setEditingContact({ ...editingContact, [name]: value });
    } else {
      setNewContact({ ...newContact, [name]: value });
    }
  };
  
  const handleSelectChange = (name: string, value: string) => {
    if (editingContact) {
      setEditingContact({ ...editingContact, [name]: value });
    } else {
      setNewContact({ ...newContact, [name]: value });
    }
  };
  
  const openAddDialog = () => {
    setEditingContact(null);
    setNewContact({
      type: 'medical',
      priority: 1,
    });
    setIsDialogOpen(true);
  };
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };
  
  // Format phone number for dialing
  const getPhoneUrl = (phone: string) => {
    const formattedPhone = phone.replace(/\D/g, '');
    return `tel:${formattedPhone}`;
  };
  
  // Get contact type badge color
  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'medical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'police':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'embassy':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'transportation':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accommodation':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Get contact type label
  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case 'medical':
        return 'Medical';
      case 'police':
        return 'Police/Fire';
      case 'embassy':
        return 'Embassy';
      case 'transportation':
        return 'Transportation';
      case 'accommodation':
        return 'Accommodation';
      case 'emergency_services':
        return 'Emergency Services';
      case 'tourist_police':
        return 'Tourist Police';
      case 'fire':
        return 'Fire Department';
      case 'other':
        return 'Other';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Generate WhatsApp link for phone numbers
  const getWhatsAppUrl = (phone: string) => {
    // Remove all non-numeric characters except +
    const cleanPhone = phone.replace(/[^+\d]/g, '');
    // Remove + and any leading zeros, then add country code logic
    const phoneNumber = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;
    return `https://wa.me/${phoneNumber}`;
  };

  // Check if phone number is likely a mobile number (for WhatsApp)
  const isMobileNumber = (phone: string) => {
    // Simple heuristic: mobile numbers often contain certain patterns
    // This is a basic check - in production, you'd want more sophisticated detection
    const mobilePatterns = /mobile|cell|\+\d{1,3}[\s-]?[6-9]|\+\d{1,3}[\s-]?[1-9]\d{8,}/i;
    return mobilePatterns.test(phone) || phone.includes('mobile') || phone.includes('cell');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contacts</CardTitle>
          <CardDescription>Important contacts for your trip</CardDescription>
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
              onClick={fetchContacts}
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
            <CardTitle>Emergency Contacts</CardTitle>
            <CardDescription>Important contacts for your trip</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleGenerateAIContacts}
              disabled={aiGenerating}
            >
              {aiGenerating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
              ) : (
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {aiGenerating ? 'Generating...' : 'AI Auto-Fill'}
            </Button>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <PoGuide 
                message="No emergency contacts added yet."
                type="thinking"
                size="medium"
              />
              <p className="mt-4 text-gray-600">
                Add important emergency contacts for your trip destination.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={openAddDialog}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Add Emergency Contact
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="grid gap-4">
                {contacts.map((contact) => (
                  <div 
                    key={contact.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mr-4 flex-shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold">{contact.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={`mt-1 ${getContactTypeColor(contact.type)}`}
                            >
                              {getContactTypeLabel(contact.type)}
                            </Badge>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => handleEditContact(contact)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive/80" 
                              onClick={() => handleDeleteContact(contact.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-900 font-medium">{contact.phone}</span>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(contact.phone, 'Phone number')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <a
                                href={getPhoneUrl(contact.phone)}
                                className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-gray-100"
                              >
                                <Phone className="h-3 w-3 text-primary" />
                              </a>
                              {isMobileNumber(contact.phone) && (
                                <a
                                  href={getWhatsAppUrl(contact.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-green-100 text-green-600"
                                  title="Open WhatsApp"
                                >
                                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                                  </svg>
                                </a>
                              )}
                            </div>
                          </div>
                          
                          {contact.address && (
                            <div className="text-gray-600">
                              <span className="mr-2 font-medium">Address:</span>
                              {contact.address}
                            </div>
                          )}
                        </div>
                        
                        {contact.notes && (
                          <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            {contact.notes}
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
        <DialogContent className="sm:max-w-md" aria-describedby="emergency-contacts-description">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </DialogTitle>
            <DialogDescription id="emergency-contacts-description">
              {editingContact ? 'Update the details of your emergency contact' : 'Add a new emergency contact for your trip'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="required">
                Contact Name
              </Label>
              <Input
                id="name"
                name="name"
                value={editingContact?.name || newContact.name || ''}
                onChange={handleChange}
                placeholder="Name or Organization"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="phone" className="required">
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                value={editingContact?.phone || newContact.phone || ''}
                onChange={handleChange}
                placeholder="Include country code if international"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type" className="required">
                Contact Type
              </Label>
              <Select
                value={editingContact?.type || newContact.type || 'medical'}
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="police">Police/Fire</SelectItem>
                  <SelectItem value="embassy">Embassy/Consulate</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="address">
                Address
              </Label>
              <Input
                id="address"
                name="address"
                value={editingContact?.address || newContact.address || ''}
                onChange={handleChange}
                placeholder="Physical address if applicable"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={editingContact?.notes || newContact.notes || ''}
                onChange={handleChange}
                placeholder="Additional information"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="priority">
                Priority (1 is highest)
              </Label>
              <Select
                value={String(editingContact?.priority || newContact.priority || 1)}
                onValueChange={(value) => handleSelectChange('priority', value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - High Priority</SelectItem>
                  <SelectItem value="2">2 - Medium Priority</SelectItem>
                  <SelectItem value="3">3 - Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOrUpdateContact}>
              {editingContact ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmergencyContacts;
