import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Download, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MAREntryForm } from "@/components/forms/MAREntryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MAREntry {
  id: string;
  medication_id: string;
  medication_name: string;
  medication_dosage: string;
  carer_id: string | null;
  carer_name: string | null;
  scheduled_time: string;
  administered_time: string | null;
  dose_given: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface MARSectionProps {
  familyId: string;
  userRole?: string;
}

export const MARSection = ({ familyId, userRole }: MARSectionProps) => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<MAREntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<MAREntry | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<any[]>([]);

  const canEdit = userRole === 'family_admin' || userRole === 'disabled_person' || userRole === 'carer';

  useEffect(() => {
    if (familyId) {
      loadMAREntries();
      loadMedications();
    }
  }, [familyId, selectedDate]);

  const loadMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      setMedications(data || []);
    } catch (error: any) {
      console.error('Error loading medications:', error);
    }
  };

  const loadMAREntries = async () => {
    try {
      setLoading(true);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .rpc('get_mar_entries_for_family' as any, {
          _family_id: familyId,
          _start: startOfDay.toISOString(),
          _end: endOfDay.toISOString()
        }) as any;

      if (error) throw error;
      setEntries((data || []) as MAREntry[]);
    } catch (error: any) {
      console.error('Error loading MAR entries:', error);
      toast({
        title: "Error",
        description: "Failed to load medication records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (entryData: any) => {
    try {
      const { error } = await supabase
        .from('medication_administrations' as any)
        .insert({
          ...entryData,
          family_id: familyId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Medication administration recorded"
      });
      setShowForm(false);
      loadMAREntries();
    } catch (error: any) {
      console.error('Error adding MAR entry:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateEntry = async (entryData: any) => {
    if (!editEntry) return;

    try {
      const { error } = await supabase
        .from('medication_administrations' as any)
        .update(entryData)
        .eq('id', editEntry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Record updated successfully"
      });
      setShowForm(false);
      setEditEntry(null);
      loadMAREntries();
    } catch (error: any) {
      console.error('Error updating MAR entry:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    try {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      const { data, error } = await supabase.functions.invoke('export-mar', {
        body: {
          familyId,
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString()
        }
      });

      if (error) throw error;

      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MAR_${format(selectedDate, 'yyyy-MM')}.csv`;
      a.click();

      toast({
        title: "Success",
        description: "MAR exported successfully"
      });
    } catch (error: any) {
      console.error('Error exporting MAR:', error);
      toast({
        title: "Error",
        description: "Failed to export MAR",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'administered':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'missed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'refused':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      administered: "default",
      pending: "secondary",
      missed: "destructive",
      refused: "secondary"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const groupedEntries = entries.reduce((acc, entry) => {
    const med = entry.medication_name;
    if (!acc[med]) acc[med] = [];
    acc[med].push(entry);
    return acc;
  }, {} as Record<string, MAREntry[]>);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Medication Administration Record</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Track medication administration</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button 
              onClick={() => { setEditEntry(null); setShowForm(true); }}
              size="sm"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Record</span>
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={handleExport}
            size="sm"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
        >
          Previous Day
        </Button>
        <div className="flex-1 text-center py-2">
          <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
        </div>
        <Button
          variant="outline"
          onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
        >
          Next Day
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No medication records for this date
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedEntries).map(([medName, medEntries]) => (
            <Card key={medName}>
              <CardHeader>
                <CardTitle className="text-lg">{medName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {medEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => canEdit && (setEditEntry(entry), setShowForm(true))}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(entry.status)}
                        <div>
                          <div className="font-medium">
                            {format(new Date(entry.scheduled_time), 'h:mm a')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {entry.medication_dosage}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {entry.carer_name && (
                          <span className="text-sm text-muted-foreground">{entry.carer_name}</span>
                        )}
                        {getStatusBadge(entry.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editEntry ? 'Update Administration' : 'Record Administration'}
            </DialogTitle>
          </DialogHeader>
          <MAREntryForm
            medications={medications}
            entry={editEntry}
            onSubmit={editEntry ? handleUpdateEntry : handleAddEntry}
            onCancel={() => { setShowForm(false); setEditEntry(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
