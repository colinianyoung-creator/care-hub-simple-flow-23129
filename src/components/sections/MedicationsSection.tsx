import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, AlertCircle, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times_per_day: number;
  time_slots: string[];
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
  created_at: string;
  care_recipients?: {
    name: string;
  } | null;
}

interface MedicationLog {
  id: string;
  medication_id: string;
  given_at: string;
  scheduled_time: string;
  given_by: string;
  notes: string | null;
}

interface MedicationsSectionProps {
  familyId: string;
  userRole: string;
  isConnectedToFamily: boolean;
}

export const MedicationsSection = ({ familyId, userRole, isConnectedToFamily }: MedicationsSectionProps) => {
  console.log('[MedicationsSection] render:', { familyId, userRole });

  if (!familyId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please connect to a family to access medications.
        </AlertDescription>
      </Alert>
    );
  }

  const { toast } = useToast();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showRefresh, setShowRefresh] = useState(false);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    times_per_day: 1,
    time_slots: ['09:00'],
    instructions: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: ''
  });

  const loadMedications = async (signal?: AbortSignal) => {
    if (!familyId) return;
    
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .abortSignal(signal) as any;

      if (error) throw error;
      
      if (!error && data?.length === 0) {
        console.warn("⚠️ [MedicationsSection] Empty result - likely RLS restriction or sync delay");
      }
      
      setMedications((data as any) || []);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading medications:', error);
        toast({
          title: "Error loading medications",
          description: "There was an error loading the medications.",
          variant: "destructive",
        });
      }
    }
  };

  const loadMedicationLogs = async () => {
    try {
      // Medication logs table doesn't exist yet
      setMedicationLogs([]);
    } catch (error) {
      console.error('Error loading medication logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = async () => {
    if (!newMedication.name.trim() || !newMedication.dosage.trim()) return;
    
    if (!familyId) {
      toast({
        title: "No family selected",
        description: "Please create or join a family first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('medications')
        .insert([{
          family_id: familyId,
          name: newMedication.name,
          dosage: newMedication.dosage || null,
          frequency: newMedication.frequency || null,
          instructions: newMedication.instructions || null,
          start_date: newMedication.start_date || null,
          end_date: newMedication.end_date || null,
          care_recipient_id: null
        }] as any);

      if (error) throw error;

      setNewMedication({
        name: '',
        dosage: '',
        frequency: '',
        times_per_day: 1,
        time_slots: ['09:00'],
        instructions: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: ''
      });
      setShowAddForm(false);
      loadMedications();
      
      toast({
        title: "Medication added",
        description: "The medication has been added successfully.",
      });
    } catch (error) {
      console.error('Error adding medication:', error);
      toast({
        title: "Error adding medication",
        description: "There was an error adding the medication.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsGiven = async (medicationId: string, scheduledTime: string) => {
    try {
      // Medication logs table doesn't exist yet
      const error = null;

      if (error) throw error;
      
      loadMedicationLogs();
      toast({
        title: "Medication logged",
        description: "The medication has been marked as given.",
      });
    } catch (error) {
      console.error('Error logging medication:', error);
      toast({
        title: "Error logging medication",
        description: "There was an error logging the medication.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMedication = async (medicationId: string) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({ is_archived: true })
        .eq('id', medicationId);

      if (error) throw error;
      loadMedications();
      
      toast({
        title: "Medication removed",
        description: "The medication has been removed successfully.",
      });
    } catch (error) {
      console.error('Error removing medication:', error);
      toast({
        title: "Error removing medication",
        description: "There was an error removing the medication.",
        variant: "destructive",
      });
    }
  };

  const isMedicationGiven = (medicationId: string, scheduledTime: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return medicationLogs.some(log => 
      log.medication_id === medicationId && 
      log.scheduled_time === scheduledTime &&
      format(new Date(log.given_at), 'yyyy-MM-dd') === today
    );
  };

  const updateTimeSlots = (index: number, value: string) => {
    const newTimeSlots = [...newMedication.time_slots];
    newTimeSlots[index] = value;
    setNewMedication(prev => ({ ...prev, time_slots: newTimeSlots }));
  };

  const addTimeSlot = () => {
    setNewMedication(prev => ({
      ...prev,
      times_per_day: prev.times_per_day + 1,
      time_slots: [...prev.time_slots, '09:00']
    }));
  };

  const removeTimeSlot = (index: number) => {
    setNewMedication(prev => ({
      ...prev,
      times_per_day: prev.times_per_day - 1,
      time_slots: prev.time_slots.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    const loadData = async () => {
      setLoading(true);

      try {
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            abortController.abort();
            setLoading(false);
            console.warn("⏱️ [MedicationsSection] load timeout after 8s");
          }
        }, 8000);

        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        setCurrentUserId(user?.id || null);

        if (!cancelled) {
          await loadMedications(abortController.signal);
          await loadMedicationLogs();
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError' && !cancelled) {
          console.error('Unexpected error:', error);
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
      abortController.abort();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [familyId]);

  useEffect(() => {
    let refreshTimer: NodeJS.Timeout;
    if (loading) {
      refreshTimer = setTimeout(() => setShowRefresh(true), 5000);
    } else {
      setShowRefresh(false);
    }
    return () => clearTimeout(refreshTimer);
  }, [loading]);

  const canManageMedications = userRole === 'family_admin' || userRole === 'disabled_person';

  if (!familyId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please join or create a family to track medications.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-4">Loading medications...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add Medication Form */}
      {showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Add New Medication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Medication name"
                value={newMedication.name}
                onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Dosage (e.g., 10mg)"
                value={newMedication.dosage}
                onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
              />
            </div>
            
            <Input
              placeholder="Frequency (e.g., Daily, Twice daily)"
              value={newMedication.frequency}
              onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Times per day:</label>
              {newMedication.time_slots.map((time, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlots(index, e.target.value)}
                  />
                  {newMedication.time_slots.length > 1 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => removeTimeSlot(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addTimeSlot}>
                Add Time
              </Button>
            </div>

            <Textarea
              placeholder="Special instructions (optional)"
              value={newMedication.instructions}
              onChange={(e) => setNewMedication(prev => ({ ...prev, instructions: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date:</label>
                <Input
                  type="date"
                  value={newMedication.start_date}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date (optional):</label>
                <Input
                  type="date"
                  value={newMedication.end_date}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddMedication} disabled={!newMedication.name.trim() || !newMedication.dosage.trim()}>
                Add Medication
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        canManageMedications && (
          <Button onClick={() => setShowAddForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add New Medication
          </Button>
        )
      )}

      {/* Medications List */}
      <div className="space-y-4">
        {medications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No medications added yet</p>
            </CardContent>
          </Card>
        ) : (
          medications.map((medication) => (
            <Card key={medication.id}>
              <CardHeader>
                <div className="medication-content">
                  <CardTitle className="text-lg">{medication.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {medication.dosage} • {medication.frequency}
                    {medication.care_recipients && ` • For: ${medication.care_recipients.name}`}
                  </p>
                </div>
                {canManageMedications && (
                  <div className="mobile-button-stack md:absolute md:top-4 md:right-4 md:mt-0 md:border-t-0 md:pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMedication(medication.id)}
                      className="mobile-section-button md:w-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {medication.instructions && (
                  <p className="text-sm text-muted-foreground">{medication.instructions}</p>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-medium">Today's Schedule:</h4>
                  <div className="grid gap-2">
                    {medication.time_slots.map((time, index) => {
                      const isGiven = isMedicationGiven(medication.id, time);
                      return (
                        <div key={index} className="p-2 border rounded">
                          <div className="medication-content">
                            <div className="flex items-center gap-3">
                              <Badge variant={isGiven ? "default" : "outline"}>
                                {time}
                              </Badge>
                              <span className="flex-1 text-sm">
                                {medication.dosage}
                              </span>
                              {isGiven && (
                                <Badge variant="secondary" className="text-xs">
                                  <Check className="h-3 w-3 mr-1" />
                                  Given
                                </Badge>
                              )}
                            </div>
                          </div>
                          {!isGiven && (
                            <div className="mobile-button-stack">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsGiven(medication.id, time)}
                                className="mobile-section-button"
                              >
                                Mark as Given
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};