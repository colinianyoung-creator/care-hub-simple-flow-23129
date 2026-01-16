import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, MapPin, Stethoscope, RotateCcw, Eye } from "lucide-react";
import { format } from "date-fns";
import IncidentReportModal from "@/components/dialogs/IncidentReportModal";

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

interface IncidentReportSummaryProps {
  careNoteId: string;
  familyId: string;
  canEdit?: boolean;
  onUpdate?: () => void;
}

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  fall: 'Fall',
  injury: 'Injury',
  medication_error: 'Medication Error',
  behavioural: 'Behavioural',
  safeguarding: 'Safeguarding',
  other: 'Other',
};

export function IncidentReportSummary({
  careNoteId,
  familyId,
  canEdit = false,
  onUpdate,
}: IncidentReportSummaryProps) {
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('care_note_id', careNoteId)
        .maybeSingle();

      if (error) throw error;
      setReport(data);
    } catch (error) {
      console.error('Error loading incident report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [careNoteId]);

  const handleDelete = async () => {
    if (!report) return;
    
    try {
      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', report.id);

      if (error) throw error;
      
      setReport(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting incident report:', error);
    }
  };

  const handleSuccess = () => {
    loadReport();
    onUpdate?.();
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading incident details...</div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header with type badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <Badge variant="destructive">
              {INCIDENT_TYPE_LABELS[report.incident_type] || report.incident_type}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </Button>
        </div>

        {/* Key details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {format(new Date(report.incident_date), 'MMM d, yyyy')}
              {report.incident_time && ` at ${report.incident_time}`}
            </span>
          </div>
          
          {report.location && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{report.location}</span>
            </div>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex flex-wrap gap-2">
          {report.medical_attention_required && (
            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
              <Stethoscope className="h-3 w-3 mr-1" />
              Medical Attention
            </Badge>
          )}
          
          {report.follow_up_required && (
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
              <RotateCcw className="h-3 w-3 mr-1" />
              Follow-up Required
            </Badge>
          )}
        </div>

        {/* Brief description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {report.description}
        </p>
      </div>

      <IncidentReportModal
        open={showModal}
        onOpenChange={setShowModal}
        careNoteId={careNoteId}
        familyId={familyId}
        existingReport={report}
        onSuccess={handleSuccess}
        onDelete={canEdit ? handleDelete : undefined}
        canEdit={canEdit}
      />
    </>
  );
}
