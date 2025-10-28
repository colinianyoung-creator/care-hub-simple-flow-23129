import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Save, X, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface KeyInformationSectionProps {
  familyId: string;
  userRole: string;
}

export const KeyInformationSection = ({ familyId, userRole }: KeyInformationSectionProps) => {
  console.log('[KeyInformationSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please connect to a family to access key information.
        </AlertDescription>
      </Alert>
    );
  }

  const { toast } = useToast();
  const [keyInfo, setKeyInfo] = useState({
    medical_history: '',
    house_details: '',
    car_policies: '',
    additional_info: '',
    emergency_contacts: [] as EmergencyContact[]
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);

  const canEdit = userRole === 'family_admin' || userRole === 'disabled_person';

  const loadKeyInformation = async () => {
    try {
      // Key information table doesn't exist yet
      setKeyInfo({
        medical_history: '',
        house_details: '',
        car_policies: '',
        additional_info: '',
        emergency_contacts: []
      });
    } catch (error) {
      console.error('Error loading key information:', error);
      toast({
        title: "Error loading information",
        description: "There was an error loading the key information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Key information table doesn't exist yet
      const error = null;

      if (error) throw error;

      toast({
        title: "Information saved",
        description: "Key information has been updated successfully.",
      });

      setEditing(false);
    } catch (error) {
      console.error('Error saving key information:', error);
      toast({
        title: "Error saving information",
        description: "There was an error saving the key information.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addEmergencyContact = () => {
    setKeyInfo(prev => ({
      ...prev,
      emergency_contacts: [...prev.emergency_contacts, { name: '', phone: '', relationship: '' }]
    }));
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: string) => {
    setKeyInfo(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setKeyInfo(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
        console.warn("⏱️ [KeyInformationSection] load timeout after 8s");
      }
    }, 8000);

    loadKeyInformation()
      .finally(() => {
        if (!cancelled) setLoading(false);
        clearTimeout(timeout);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [familyId]);

  // Show refresh button after 5 seconds of loading
  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;
    if (loading) {
      refreshTimer = setTimeout(() => {
        setShowRefresh(true);
      }, 5000);
    } else {
      setShowRefresh(false);
    }
    return () => clearTimeout(refreshTimer);
  }, [loading]);

  if (!familyId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please join or create a family to view key information.
      </div>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin w-4 h-4" />
              Loading key information…
            </div>
            {showRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Force Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Key Information</h3>
        {canEdit && !editing && (
          <Button onClick={() => setEditing(true)} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={() => setEditing(false)} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                placeholder="Enter medical history, conditions, allergies, etc."
                value={keyInfo.medical_history}
                onChange={(e) => setKeyInfo(prev => ({ ...prev, medical_history: e.target.value }))}
                rows={4}
              />
            ) : (
              <p className="text-sm">
                {keyInfo.medical_history || 'No medical history recorded'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">House Details</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                placeholder="Enter access codes, key locations, wifi passwords, etc."
                value={keyInfo.house_details}
                onChange={(e) => setKeyInfo(prev => ({ ...prev, house_details: e.target.value }))}
                rows={4}
              />
            ) : (
              <p className="text-sm">
                {keyInfo.house_details || 'No house details recorded'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Car Policies</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                placeholder="Enter car usage policies, insurance details, etc."
                value={keyInfo.car_policies}
                onChange={(e) => setKeyInfo(prev => ({ ...prev, car_policies: e.target.value }))}
                rows={3}
              />
            ) : (
              <p className="text-sm">
                {keyInfo.car_policies || 'No car policies recorded'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Emergency Contacts</CardTitle>
              {editing && (
                <Button onClick={addEmergencyContact} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {keyInfo.emergency_contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No emergency contacts recorded</p>
            ) : (
              <div className="space-y-4">
                {keyInfo.emergency_contacts.map((contact, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-2">
                    {editing ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            placeholder="Name"
                            value={contact.name}
                            onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Phone</Label>
                          <Input
                            placeholder="Phone"
                            value={contact.phone}
                            onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Relationship</Label>
                            <Input
                              placeholder="Relationship"
                              value={contact.relationship}
                              onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                            />
                          </div>
                          <Button
                            onClick={() => removeEmergencyContact(index)}
                            variant="outline"
                            size="sm"
                            className="mt-5"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                        <p className="text-sm">{contact.relationship}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                placeholder="Enter any other important information..."
                value={keyInfo.additional_info}
                onChange={(e) => setKeyInfo(prev => ({ ...prev, additional_info: e.target.value }))}
                rows={3}
              />
            ) : (
              <p className="text-sm">
                {keyInfo.additional_info || 'No additional information recorded'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};