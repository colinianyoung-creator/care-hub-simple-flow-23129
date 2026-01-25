import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdaptiveSelect } from "@/components/adaptive";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface IncidentReportFormProps {
  careNoteId: string;
  familyId: string;
  incidentDate?: string;
  existingReport?: IncidentReport | null;
  onSuccess: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

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

interface Carer {
  id: string;
  full_name: string;
}

const INCIDENT_TYPES = [
  { value: 'fall', label: 'Fall' },
  { value: 'injury', label: 'Injury' },
  { value: 'medication_error', label: 'Medication Error' },
  { value: 'behavioural', label: 'Behavioural' },
  { value: 'safeguarding', label: 'Safeguarding' },
  { value: 'other', label: 'Other' },
];

const REPORTED_TO_OPTIONS = [
  { value: 'gp', label: 'GP' },
  { value: 'family', label: 'Family Member' },
  { value: 'safeguarding', label: 'Safeguarding Team' },
  { value: 'emergency_services', label: 'Emergency Services' },
  { value: 'other', label: 'Other' },
];

export default function IncidentReportForm({
  careNoteId,
  familyId,
  incidentDate,
  existingReport,
  onSuccess,
  onCancel,
  onDelete,
  canEdit = true,
}: IncidentReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carers, setCarers] = useState<Carer[]>([]);
  const [formData, setFormData] = useState({
    incident_type: existingReport?.incident_type || "",
    incident_date: existingReport?.incident_date || incidentDate || format(new Date(), 'yyyy-MM-dd'),
    incident_time: existingReport?.incident_time || "",
    location: existingReport?.location || "",
    people_involved: existingReport?.people_involved || [] as string[],
    witnesses: existingReport?.witnesses || "",
    description: existingReport?.description || "",
    immediate_actions: existingReport?.immediate_actions || "",
    medical_attention_required: existingReport?.medical_attention_required || false,
    medical_attention_details: existingReport?.medical_attention_details || "",
    outcome: existingReport?.outcome || "",
    follow_up_required: existingReport?.follow_up_required || false,
    follow_up_details: existingReport?.follow_up_details || "",
    reported_to: existingReport?.reported_to || [] as string[],
    reported_to_other: existingReport?.reported_to_other || "",
  });

  // Load carers for multi-select
  useEffect(() => {
    const loadCarers = async () => {
      try {
        const { data, error } = await supabase
          .from('user_memberships')
          .select('user_id, profiles!inner(id, full_name)')
          .eq('family_id', familyId)
          .eq('role', 'carer');

        if (error) throw error;

        const carersList = (data || []).map((item: any) => ({
          id: item.profiles.id,
          full_name: item.profiles.full_name || 'Unknown',
        }));
        setCarers(carersList);
      } catch (error) {
        console.error('Error loading carers:', error);
      }
    };

    loadCarers();
  }, [familyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.incident_type || !formData.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const reportData = {
        care_note_id: careNoteId,
        family_id: familyId,
        incident_type: formData.incident_type,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time || null,
        location: formData.location || null,
        people_involved: formData.people_involved.length > 0 ? formData.people_involved : null,
        witnesses: formData.witnesses || null,
        description: formData.description,
        immediate_actions: formData.immediate_actions || null,
        medical_attention_required: formData.medical_attention_required,
        medical_attention_details: formData.medical_attention_required ? formData.medical_attention_details : null,
        outcome: formData.outcome || null,
        follow_up_required: formData.follow_up_required,
        follow_up_details: formData.follow_up_required ? formData.follow_up_details : null,
        reported_to: formData.reported_to.length > 0 ? formData.reported_to : null,
        reported_to_other: formData.reported_to.includes('other') ? formData.reported_to_other : null,
        reported_by: user.id,
      };

      if (existingReport?.id) {
        const { error } = await supabase
          .from('incident_reports')
          .update(reportData)
          .eq('id', existingReport.id);

        if (error) throw error;
        toast.success("Incident record updated");
      } else {
        const { error } = await supabase
          .from('incident_reports')
          .insert([reportData]);

        if (error) throw error;
        toast.success("Incident record created");
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving incident report:', error);
      toast.error("Failed to save incident record");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePeopleInvolved = (carerId: string) => {
    setFormData(prev => ({
      ...prev,
      people_involved: prev.people_involved.includes(carerId)
        ? prev.people_involved.filter(id => id !== carerId)
        : [...prev.people_involved, carerId]
    }));
  };

  const toggleReportedTo = (value: string) => {
    setFormData(prev => ({
      ...prev,
      reported_to: prev.reported_to.includes(value)
        ? prev.reported_to.filter(v => v !== value)
        : [...prev.reported_to, value]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Incident Type */}
        <div>
          <Label htmlFor="incident_type">Incident Type *</Label>
          <AdaptiveSelect
            value={formData.incident_type}
            onValueChange={(value) => setFormData({ ...formData, incident_type: value })}
            disabled={!canEdit}
            placeholder="Select incident type"
            title="Incident Type"
            options={INCIDENT_TYPES}
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="incident_date">Date *</Label>
            <Input
              id="incident_date"
              type="date"
              value={formData.incident_date}
              onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
              disabled={!canEdit}
              required
            />
          </div>
          <div>
            <Label htmlFor="incident_time">Time (optional)</Label>
            <Input
              id="incident_time"
              type="time"
              value={formData.incident_time}
              onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
              disabled={!canEdit}
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location">Location (optional)</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Where did the incident occur?"
            disabled={!canEdit}
          />
        </div>

        {/* People Involved */}
        <div>
          <Label>People Involved (Carers)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {carers.map((carer) => (
              <div
                key={carer.id}
                className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                  formData.people_involved.includes(carer.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
                onClick={() => canEdit && togglePeopleInvolved(carer.id)}
              >
                {carer.full_name}
              </div>
            ))}
            {carers.length === 0 && (
              <p className="text-sm text-muted-foreground">No carers found</p>
            )}
          </div>
        </div>

        {/* Witnesses */}
        <div>
          <Label htmlFor="witnesses">Other Witnesses</Label>
          <Textarea
            id="witnesses"
            value={formData.witnesses}
            onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
            placeholder="Names of any other witnesses..."
            rows={2}
            disabled={!canEdit}
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description of What Happened *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Provide a factual description of the incident..."
            rows={4}
            required
            disabled={!canEdit}
          />
        </div>

        {/* Immediate Actions */}
        <div>
          <Label htmlFor="immediate_actions">Immediate Actions Taken</Label>
          <Textarea
            id="immediate_actions"
            value={formData.immediate_actions}
            onChange={(e) => setFormData({ ...formData, immediate_actions: e.target.value })}
            placeholder="What actions were taken immediately after the incident?"
            rows={2}
            disabled={!canEdit}
          />
        </div>

        {/* Medical Attention */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="medical_attention"
              checked={formData.medical_attention_required}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, medical_attention_required: !!checked })
              }
              disabled={!canEdit}
            />
            <Label htmlFor="medical_attention">Medical attention required?</Label>
          </div>
          {formData.medical_attention_required && (
            <Textarea
              value={formData.medical_attention_details}
              onChange={(e) => setFormData({ ...formData, medical_attention_details: e.target.value })}
              placeholder="Details of medical attention provided..."
              rows={2}
              disabled={!canEdit}
            />
          )}
        </div>

        {/* Outcome */}
        <div>
          <Label htmlFor="outcome">Outcome</Label>
          <Textarea
            id="outcome"
            value={formData.outcome}
            onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
            placeholder="What was the outcome of the incident?"
            rows={2}
            disabled={!canEdit}
          />
        </div>

        {/* Follow-up Required */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="follow_up"
              checked={formData.follow_up_required}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, follow_up_required: !!checked })
              }
              disabled={!canEdit}
            />
            <Label htmlFor="follow_up">Follow-up required?</Label>
          </div>
          {formData.follow_up_required && (
            <Textarea
              value={formData.follow_up_details}
              onChange={(e) => setFormData({ ...formData, follow_up_details: e.target.value })}
              placeholder="Details of required follow-up actions..."
              rows={2}
              disabled={!canEdit}
            />
          )}
        </div>

        {/* Reported To */}
        <div className="border-t pt-4">
          <Label>Reported To</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {REPORTED_TO_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`reported_${option.value}`}
                  checked={formData.reported_to.includes(option.value)}
                  onCheckedChange={() => toggleReportedTo(option.value)}
                  disabled={!canEdit}
                />
                <Label htmlFor={`reported_${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {formData.reported_to.includes('other') && (
            <Input
              className="mt-2"
              value={formData.reported_to_other}
              onChange={(e) => setFormData({ ...formData, reported_to_other: e.target.value })}
              placeholder="Specify other..."
              disabled={!canEdit}
            />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex gap-2 justify-between pt-4 border-t">
          <div>
            {existingReport && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Report
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
              {existingReport ? 'Update Report' : 'Save Report'}
            </Button>
          </div>
        </div>
      )}

      {!canEdit && (
        <div className="flex justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      )}
    </form>
  );
}
