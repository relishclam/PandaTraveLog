import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Plus, Edit2, Trash2, Copy, ExternalLink, Phone, AlertCircle, MessageCircle } from 'lucide-react';
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
  const [extracting, setExtracting] = useState(false);
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
    setAiGenerating(true);
    
    try {
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
        fetchContacts();
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
  
  const handleExtractFromTripData = async () => {
    setExtracting(true);
    
    try {
      const response = await fetch(`/api/trips/${tripId}/emergency-contacts/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract contacts from trip data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        if (result.newContactsAdded > 0) {
          toast.success(`Extracted ${result.newContactsAdded} new contacts from your trip data!`);
          fetchContacts();
        } else {
          toast.info('No new contacts found in your trip data. All relevant contacts may already be added.');
        }
      } else {
        throw new Error(result.error || 'Failed to extract contacts');
      }
      
    } catch (err: any) {
      console.error('Error extracting contacts from trip data:', err);
      toast.error(err.message || 'Failed to extract contacts from trip data');
    } finally {
      setExtracting(false);
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
  
  // Generate WhatsApp link for phone numbers
  const getWhatsAppUrl = (phone: string) => {
    const cleanNumber = phone.replace(/[^\d+]/g, '');
    return `https://wa.me/${cleanNumber}`;
  };

  // Check if phone number is likely a mobile number (for WhatsApp)
  const isMobileNumber = (phone: string) => {
    // Simple heuristic: mobile numbers often start with certain patterns
    const cleanNumber = phone.replace(/[^\d+]/g, '');
    // This is a basic check - you might want to make it more sophisticated based on country codes
    return cleanNumber.length >= 10 && !cleanNumber.includes('800') && !cleanNumber.includes('911');
  };
  
  // Enhanced WhatsApp URL with pre-filled message
  const getWhatsAppUrlWithMessage = (phone: string, contactName: string) => {
    const cleanNumber = phone.replace(/[^\d+]/g, '');
    const message = encodeURIComponent(`Hello ${contactName}, I'm contacting you regarding my travel plans. This is an emergency contact from PandaTraveLog.`);
    return `https://wa.me/${cleanNumber}?text=${message}`;
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
            <CardDescription>
              Important contacts for your trip destination and travel arrangements
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleExtractFromTripData}
              disabled={extracting}
              variant="outline"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              {extracting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Extract from Trip Data
            </Button>
            <Button 
              onClick={openAddDialog}
              className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {contacts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <PoGuide 
                      message="No emergency contacts yet"
                      type="thinking" 
                      size="medium"
                    />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Emergency Contacts Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Add important emergency contacts for your trip destination.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={handleExtractFromTripData}
                      disabled={extracting}
                      variant="outline"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      {extracting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Extract from Trip Data
                    </Button>
                    <Button 
                      onClick={openAddDialog}
                      className="bg-backpack-orange hover:bg-backpack-orange/90 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Emergency Contact
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                <Button 
                  onClick={handleExtractFromTripData}
                  disabled={extracting}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  {extracting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Extract More Contacts
                </Button>
                <Button 
                  onClick={handleGenerateAIContacts}
                  disabled={aiGenerating}
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  {aiGenerating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Generate AI Contacts
                </Button>
              </div>

              {/* Contacts Grid */}
              <div className="grid gap-4">
                {contacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{contact.name}</h3>
                              <Badge className={`text-xs ${getContactTypeColor(contact.type)}`}>
                                {getContactTypeLabel(contact.type)}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2 ml-13">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              <a 
                                href={getPhoneUrl(contact.phone)}
                                className="hover:text-backpack-orange transition-colors"
                              >
                                {contact.phone}
                              </a>
                              {isMobileNumber(contact.phone) && (
                                <a 
                                  href={getWhatsAppUrlWithMessage(contact.phone, contact.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-green-600 hover:text-green-700 transition-colors"
                                  title="Send WhatsApp message"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                            
                            {contact.address && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <ExternalLink className="w-4 h-4" />
                                <span>{contact.address}</span>
                              </div>
                            )}
                            
                            {contact.notes && (
                              <div className="text-sm text-gray-600 mt-2">
                                <p className="italic">{contact.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(contact.phone, 'Phone number')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditContact(contact)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteContact(contact.id)}
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
            </div>
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
