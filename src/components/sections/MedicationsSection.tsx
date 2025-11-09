import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MARSection } from "./MARSection";
import { MARQuickAdd } from "@/components/MARQuickAdd";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Check, AlertCircle, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  is_archived: boolean;
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
}

export const MedicationsSection = ({ familyId, userRole }: MedicationsSectionProps) => {
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
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    frequency: '',
    instructions: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: ''
  });

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setNewMedication({
      name: medication.name,
      dosage: medication.dosage || '',
      frequency: medication.frequency || '',
      instructions: medication.instructions || '',
      start_date: medication.start_date,
      end_date: medication.end_date || ''
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingMedication(null);
    setNewMedication({
      name: '',
      dosage: '',
      frequency: '',
      instructions: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: ''
    });
    setShowAddForm(false);
  };

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
      if (editingMedication) {
        // Update existing medication
        const { error } = await supabase
          .from('medications')
          .update({
            name: newMedication.name,
            dosage: newMedication.dosage || null,
            frequency: newMedication.frequency || null,
            instructions: newMedication.instructions || null,
            start_date: newMedication.start_date || null,
            end_date: newMedication.end_date || null
          })
          .eq('id', editingMedication.id);

        if (error) throw error;

        toast({
          title: "Medication updated",
          description: "The medication has been updated successfully.",
        });
      } else {
        // Insert new medication
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

        toast({
          title: "Medication added",
          description: "The medication has been added successfully.",
        });
      }

      handleCancelEdit();
      loadMedications();
    } catch (error) {
      console.error('Error saving medication:', error);
      toast({
        title: "Error",
        description: "There was an error saving the medication.",
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
    <Tabs defaultValue="medications" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="medications">Medications</TabsTrigger>
        <TabsTrigger value="mar">MAR Log</TabsTrigger>
        <TabsTrigger value="quick">Quick Add</TabsTrigger>
      </TabsList>

      <TabsContent value="medications" className="space-y-6">
        {/* Add Medication Form */}
        {showAddForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingMedication ? 'Edit Medication' : 'Add New Medication'}</CardTitle>
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
              placeholder="Frequency (e.g., Daily, Twice daily, 3 times a day)"
              value={newMedication.frequency}
              onChange={(e) => setNewMedication(prev => ({ ...prev, frequency: e.target.value }))}
            />

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
                {editingMedication ? 'Update Medication' : 'Add Medication'}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
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
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                  <div className="flex-1 space-y-1">
                    <CardTitle className="text-lg">{medication.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {medication.dosage} • {medication.frequency}
                      {medication.care_recipients && ` • For: ${medication.care_recipients.name}`}
                    </p>
                  </div>
                  <div className="flex gap-2 sm:flex-row">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditMedication(medication)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMedication(medication.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {medication.instructions && (
                  <p className="text-sm text-muted-foreground">{medication.instructions}</p>
                )}
                
                <div className="text-sm">
                  <span className="font-medium">Frequency:</span> {medication.frequency || 'As needed'}
                </div>

                {medication.start_date && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Start:</span> {format(new Date(medication.start_date), 'MMM d, yyyy')}
                    {medication.end_date && (
                      <> • <span className="font-medium">End:</span> {format(new Date(medication.end_date), 'MMM d, yyyy')}</>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
        </div>
      </TabsContent>

      <TabsContent value="mar">
        <MARSection familyId={familyId} userRole={userRole} />
      </TabsContent>

      <TabsContent value="quick">
        <MARQuickAdd 
          familyId={familyId} 
          medications={medications}
          onUpdate={() => loadMedications()}
        />
      </TabsContent>
    </Tabs>
  );
};