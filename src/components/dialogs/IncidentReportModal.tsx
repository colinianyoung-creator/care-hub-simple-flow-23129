import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import IncidentReportForm from "@/components/forms/IncidentReportForm";

interface IncidentReport {
  id: string;
  care_note_id: string;
  family_id: string;
  incident_type: string;
  incident_date: string;
  incident_time: string | null;
  location: string | null;
  people_involved: string[] | null;
  witnesses: string | null;
  description: string;
  immediate_actions: string | null;
  medical_attention_required: boolean;
  medical_attention_details: string | null;
  outcome: string | null;
  follow_up_required: boolean;
  follow_up_details: string | null;
  reported_to: string[] | null;
  reported_to_other: string | null;
  reported_by: string;
  created_at: string;
  updated_at: string;
}

interface IncidentReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  careNoteId: string;
  familyId: string;
  incidentDate?: string;
  existingReport?: IncidentReport | null;
  onSuccess: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

export default function IncidentReportModal({
  open,
  onOpenChange,
  careNoteId,
  familyId,
  incidentDate,
  existingReport,
  onSuccess,
  onDelete,
  canEdit = true,
}: IncidentReportModalProps) {
  const handleSuccess = () => {
    onSuccess();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[85vh] max-h-[800px] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {existingReport ? 'Edit Incident Record' : 'New Incident Record'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="pr-4">
            <IncidentReportForm
              careNoteId={careNoteId}
              familyId={familyId}
              incidentDate={incidentDate}
              existingReport={existingReport}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              onDelete={onDelete ? handleDelete : undefined}
              canEdit={canEdit}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
