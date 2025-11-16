import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface DailyDose {
  id: string;
  timeSlot: 'Morning' | 'Midday' | 'Evening' | 'Night';
  checked: boolean;
}

interface DailyMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: 1 | 2 | 3 | 4;
  doses: DailyDose[];
}

interface DoseTrackerSectionProps {
  familyId: string;
  userRole: string;
}

const getTimeSlots = (frequency: number): Array<'Morning' | 'Midday' | 'Evening' | 'Night'> => {
  switch(frequency) {
    case 1: return ['Morning'];
    case 2: return ['Morning', 'Evening'];
    case 3: return ['Morning', 'Midday', 'Evening'];
    case 4: return ['Morning', 'Midday', 'Evening', 'Night'];
    default: return ['Morning'];
  }
};

export const DoseTrackerSection = ({ familyId, userRole }: DoseTrackerSectionProps) => {
  const { toast } = useToast();
  const [medications, setMedications] = useState<DailyMedication[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 1 as 1 | 2 | 3 | 4
  });

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (!formData.name.trim()) {
      toast({ 
        title: "Error", 
        description: "Medication name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.dosage.trim()) {
      toast({ 
        title: "Error", 
        description: "Dosage is required",
        variant: "destructive"
      });
      return;
    }
    
    if (formData.frequency < 1 || formData.frequency > 4) {
      toast({ 
        title: "Error", 
        description: "Frequency must be between 1 and 4",
        variant: "destructive"
      });
      return;
    }
    
    // Generate doses
    const timeSlots = getTimeSlots(formData.frequency);
    const doses: DailyDose[] = timeSlots.map(slot => ({
      id: `${Date.now()}-${slot}`,
      timeSlot: slot,
      checked: false
    }));
    
    // Add medication
    const newMed: DailyMedication = {
      id: Date.now().toString(),
      name: formData.name,
      dosage: formData.dosage,
      frequency: formData.frequency,
      doses
    };
    
    setMedications([...medications, newMed]);
    
    // Reset form
    setFormData({ name: '', dosage: '', frequency: 1 });
    
    toast({ 
      title: "Success", 
      description: `${formData.name} added to today's schedule` 
    });
  };

  const handleToggleDose = (medicationId: string, doseId: string) => {
    setMedications(prevMeds => 
      prevMeds.map(med => 
        med.id === medicationId
          ? {
              ...med,
              doses: med.doses.map(dose =>
                dose.id === doseId
                  ? { ...dose, checked: !dose.checked }
                  : dose
              )
            }
          : med
      )
    );
  };

  const checkedCount = medications.flatMap(m => m.doses.filter(d => d.checked)).length;
  const totalCount = medications.flatMap(m => m.doses).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Today's Medication Dose Tracker</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add medications and track doses throughout the day
        </p>
      </div>

      {/* Add Medication Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Medication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMedication}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input 
                placeholder="Medication Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input 
                placeholder="Dosage (e.g., 500mg, 2 tablets)"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                required
              />
              <div className="flex gap-2">
                <Input 
                  type="number"
                  min="1"
                  max="4"
                  placeholder="Frequency (1-4)"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    frequency: Math.max(1, Math.min(4, parseInt(e.target.value) || 1)) as 1 | 2 | 3 | 4
                  })}
                  required
                />
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Today's Schedule Table */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Medication Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {medications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No medications added yet. Add your first medication above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medication Name</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Time Slot</TableHead>
                    <TableHead className="w-[100px]">Dose Taken?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medications.flatMap(med => 
                    med.doses.map(dose => (
                      <TableRow 
                        key={dose.id}
                        className={dose.checked ? 'bg-[#d4f8d4] hover:bg-[#c5f0c5]' : ''}
                      >
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>{dose.timeSlot}</TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={dose.checked}
                            onCheckedChange={() => handleToggleDose(med.id, dose.id)}
                            className="h-5 w-5"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Counter */}
      {medications.length > 0 && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              <p className="text-lg font-semibold text-center">
                Progress: {checkedCount} / {totalCount} Doses Taken
              </p>
              <Progress value={totalCount > 0 ? (checkedCount / totalCount) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
