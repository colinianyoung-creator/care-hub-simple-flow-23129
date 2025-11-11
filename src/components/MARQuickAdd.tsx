import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MARQuickAddProps {
  familyId: string;
  medications: any[];
  onUpdate: () => void;
}

export const MARQuickAdd = ({ familyId, medications, onUpdate }: MARQuickAddProps) => {
  const { toast } = useToast();
  const [recording, setRecording] = useState<string | null>(null);

  const handleQuickRecord = async (medicationId: string, status: 'administered' | 'missed' | 'refused') => {
    setRecording(medicationId);
    try {
      const now = new Date();
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('medication_administrations' as any)
        .insert({
          family_id: familyId,
          medication_id: medicationId,
          scheduled_time: now.toISOString(),
          administered_time: status === 'administered' ? now.toISOString() : null,
          status,
          created_by: user.user?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Medication marked as ${status}`
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error recording medication:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRecording(null);
    }
  };

  if (medications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Quick Record</h3>
      {medications.map((med) => (
        <Card key={med.id}>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div>
                <div className="font-medium">{med.name}</div>
                <div className="text-sm text-muted-foreground">{med.dosage}</div>
              </div>
              
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickRecord(med.id, 'administered')}
                  disabled={recording === med.id}
                  className="flex-1 text-green-600 hover:text-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Given
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickRecord(med.id, 'refused')}
                  disabled={recording === med.id}
                  className="flex-1 text-orange-600 hover:text-orange-700"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Refused
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickRecord(med.id, 'missed')}
                  disabled={recording === med.id}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Missed
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
