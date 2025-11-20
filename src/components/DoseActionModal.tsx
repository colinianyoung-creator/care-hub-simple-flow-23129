import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DoseActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dose: {
    id: string;
    medicationName: string;
    dosage: string;
    dueTime: string;
    status: string;
  };
  onSuccess: () => void;
}

export const DoseActionModal = ({ 
  open, 
  onOpenChange, 
  dose,
  onSuccess 
}: DoseActionModalProps) => {
  const { toast } = useToast();
  const [showRefusalNote, setShowRefusalNote] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMarkDose = async (status: 'given' | 'refused') => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to mark doses",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.rpc('mark_dose', {
        _dose_id: dose.id,
        _new_status: status,
        _carer_id: user.id,
        _note: note || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Dose marked as ${status}`,
      });

      onSuccess();
      onOpenChange(false);
      setShowRefusalNote(false);
      setNote("");
    } catch (error) {
      console.error('Error marking dose:', error);
      toast({
        title: "Error",
        description: "Failed to mark dose. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Dose</DialogTitle>
          <div className="pt-2 space-y-1">
            <p className="font-semibold text-foreground">{dose.medicationName}</p>
            <p className="text-sm text-muted-foreground">{dose.dosage}</p>
            <p className="text-sm text-muted-foreground">
              Due: {format(new Date(`2000-01-01T${dose.dueTime}`), 'h:mm a')}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!showRefusalNote ? (
            <div className="grid grid-cols-2 gap-4">
              <Button
                className="h-24 flex-col gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleMarkDose('given')}
                disabled={loading}
              >
                <CheckCircle2 className="h-8 w-8" />
                <span className="text-base font-semibold">Mark as Given</span>
              </Button>
              <Button
                className="h-24 flex-col gap-2 bg-orange-600 hover:bg-orange-700"
                onClick={() => setShowRefusalNote(true)}
                disabled={loading}
              >
                <XCircle className="h-8 w-8" />
                <span className="text-base font-semibold">Mark as Refused</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason for refusal (optional)</label>
                <Textarea
                  placeholder="e.g., Patient refused, feeling nauseous..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowRefusalNote(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={() => handleMarkDose('refused')}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  disabled={loading}
                >
                  Confirm Refused
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
