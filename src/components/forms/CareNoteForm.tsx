import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdaptiveSelect } from "@/components/adaptive";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
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

interface CareNoteFormProps {
  familyId: string;
  editData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function CareNoteForm({ 
  familyId, 
  editData, 
  onSuccess, 
  onCancel,
  onDelete 
}: CareNoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [existingIncidentReport, setExistingIncidentReport] = useState<IncidentReport | null>(null);
  const [formData, setFormData] = useState({
    activity_support: editData?.activity_support || "",
    observations: editData?.observations || "",
    outcome_response: editData?.outcome_response || "",
    next_steps: editData?.next_steps || "",
    mood: editData?.mood || "",
    eating_drinking: editData?.eating_drinking || "",
    eating_drinking_notes: editData?.eating_drinking_notes || "",
    bathroom_usage: editData?.bathroom_usage || "",
    incidents: editData?.incidents || "",
    is_incident: editData?.is_incident || false,
  });

  // Load existing incident report if editing a care note
  useEffect(() => {
    const loadIncidentReport = async () => {
      if (!editData?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('care_note_id', editData.id)
          .maybeSingle();

        if (error) throw error;
        setExistingIncidentReport(data);
      } catch (error) {
        console.error('Error loading incident report:', error);
      }
    };

    loadIncidentReport();
  }, [editData?.id]);

  const handleIncidentReportSuccess = async () => {
    // Reload the incident report after save
    if (editData?.id) {
      const { data } = await supabase
        .from('incident_reports')
        .select('*')
        .eq('care_note_id', editData.id)
        .maybeSingle();
      setExistingIncidentReport(data);
    }
    setShowIncidentModal(false);
  };

  const handleDeleteIncidentReport = async () => {
    if (!existingIncidentReport) return;
    
    try {
      const { error } = await supabase
        .from('incident_reports')
        .delete()
        .eq('id', existingIncidentReport.id);

      if (error) throw error;
      
      setExistingIncidentReport(null);
      toast.success("Incident record deleted");
    } catch (error) {
      console.error('Error deleting incident report:', error);
      toast.error("Failed to delete incident record");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const noteData = {
        family_id: familyId,
        author_id: user.id,
        activity_support: formData.activity_support,
        observations: formData.observations,
        outcome_response: formData.outcome_response,
        next_steps: formData.next_steps,
        mood: formData.mood,
        eating_drinking: formData.eating_drinking,
        eating_drinking_notes: formData.eating_drinking_notes,
        bathroom_usage: formData.bathroom_usage,
        incidents: formData.incidents,
        is_incident: formData.is_incident,
        // Legacy fields for backwards compatibility
        title: formData.activity_support || "Daily Note",
        content: formData.activity_support || "",
      };

      if (editData?.id) {
        // Update existing note
        const { error } = await supabase
          .from('care_notes')
          .update(noteData)
          .eq('id', editData.id);

        if (error) throw error;

        toast.success("Note updated successfully");
      } else {
        // Create new note
        const { error } = await supabase
          .from('care_notes')
          .insert([noteData]);

        if (error) throw error;

        toast.success("Note added successfully");
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error("Failed to save note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Activity/Support */}
        <div>
          <Label htmlFor="activity_support">Activity/Support Provided *</Label>
          <Textarea
            id="activity_support"
            value={formData.activity_support}
            onChange={(e) => setFormData({ ...formData, activity_support: e.target.value })}
            placeholder="Describe what activities were done and support provided..."
            required
            rows={3}
          />
        </div>

        {/* Observations */}
        <div>
          <Label htmlFor="observations">Observations</Label>
          <Textarea
            id="observations"
            value={formData.observations}
            onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
            placeholder="Any observations about the care recipient..."
            rows={3}
          />
        </div>

        {/* Mood */}
        <div>
          <Label htmlFor="mood">Mood</Label>
          <AdaptiveSelect
            value={formData.mood}
            onValueChange={(value) => setFormData({ ...formData, mood: value })}
            placeholder="Select mood"
            title="Mood"
            options={[
              { value: 'happy', label: '😊 Happy' },
              { value: 'content', label: '😌 Content' },
              { value: 'neutral', label: '😐 Neutral' },
              { value: 'anxious', label: '😟 Anxious' },
              { value: 'sad', label: '😢 Sad' },
              { value: 'angry', label: '😠 Angry' },
            ]}
          />
        </div>

        {/* Eating & Drinking */}
        <div>
          <Label htmlFor="eating_drinking">Eating & Drinking</Label>
          <AdaptiveSelect
            value={formData.eating_drinking}
            onValueChange={(value) => setFormData({ ...formData, eating_drinking: value })}
            placeholder="Select eating status"
            title="Eating & Drinking"
            options={[
              { value: 'all', label: 'All consumed' },
              { value: 'most', label: 'Most consumed' },
              { value: 'some', label: 'Some consumed' },
              { value: 'little', label: 'Little consumed' },
              { value: 'none', label: 'None consumed' },
            ]}
          />
        </div>

        {/* Eating & Drinking Notes */}
        {formData.eating_drinking && (
          <div>
            <Label htmlFor="eating_drinking_notes">Eating & Drinking Notes</Label>
            <Textarea
              id="eating_drinking_notes"
              value={formData.eating_drinking_notes}
              onChange={(e) => setFormData({ ...formData, eating_drinking_notes: e.target.value })}
              placeholder="Additional details about eating and drinking..."
              rows={2}
            />
          </div>
        )}

        {/* Bathroom Usage */}
        <div>
          <Label htmlFor="bathroom_usage">Bathroom Usage</Label>
          <Input
            id="bathroom_usage"
            value={formData.bathroom_usage}
            onChange={(e) => setFormData({ ...formData, bathroom_usage: e.target.value })}
            placeholder="e.g., 2 times, continent, etc."
          />
        </div>

        {/* Outcome/Response */}
        <div>
          <Label htmlFor="outcome_response">Outcome/Response</Label>
          <Textarea
            id="outcome_response"
            value={formData.outcome_response}
            onChange={(e) => setFormData({ ...formData, outcome_response: e.target.value })}
            placeholder="How did the care recipient respond to activities/support?"
            rows={2}
          />
        </div>

        {/* Next Steps */}
        <div>
          <Label htmlFor="next_steps">Next Steps</Label>
          <Textarea
            id="next_steps"
            value={formData.next_steps}
            onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
            placeholder="Any follow-up actions or next steps needed..."
            rows={2}
          />
        </div>

        {/* Incidents */}
        <div>
          <Label htmlFor="incidents">Incidents/Concerns</Label>
          <Textarea
            id="incidents"
            value={formData.incidents}
            onChange={(e) => setFormData({ ...formData, incidents: e.target.value })}
            placeholder="Any incidents, concerns, or unusual events..."
            rows={2}
          />
        </div>

        {/* Is Incident Flag */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_incident"
              checked={formData.is_incident}
              onCheckedChange={(checked) => setFormData({ ...formData, is_incident: checked as boolean })}
            />
            <Label 
              htmlFor="is_incident" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mark as incident
            </Label>
          </div>
          
          {/* Add Incident Details Button - only show when is_incident is checked and we're editing */}
          {formData.is_incident && editData?.id && (
            <div className="ml-6">
              <Button 
                type="button" 
                variant="outline"
                className={existingIncidentReport ? "border-destructive text-destructive hover:bg-destructive/10" : "border-orange-300 text-orange-700 hover:bg-orange-50"}
                onClick={() => setShowIncidentModal(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {existingIncidentReport ? 'Edit Incident Record' : 'Add Incident Details'}
              </Button>
              {existingIncidentReport && (
                <p className="text-xs text-muted-foreground mt-1">
                  Incident record attached ({existingIncidentReport.incident_type})
                </p>
              )}
            </div>
          )}
          
          {formData.is_incident && !editData?.id && (
            <p className="text-xs text-muted-foreground ml-6">
              Save this note first, then you can add detailed incident information.
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-between pt-4">
        <div>
          {editData && onDelete && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={onDelete}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Note
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? 'Update Note' : 'Save Note'}
          </Button>
        </div>
      </div>

      {/* Incident Report Modal */}
      {editData?.id && (
        <IncidentReportModal
          open={showIncidentModal}
          onOpenChange={setShowIncidentModal}
          careNoteId={editData.id}
          familyId={familyId}
          incidentDate={editData.created_at ? format(new Date(editData.created_at), 'yyyy-MM-dd') : undefined}
          existingReport={existingIncidentReport}
          onSuccess={handleIncidentReportSuccess}
          onDelete={existingIncidentReport ? handleDeleteIncidentReport : undefined}
          canEdit={true}
        />
      )}
    </form>
  );
}
