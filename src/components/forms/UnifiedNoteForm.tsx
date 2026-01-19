import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Trash2, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface UnifiedNoteFormProps {
  familyId: string;
  editData?: any | null;
  onSuccess: () => void;
  onCancel: () => void;
  onDelete?: () => void;
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

export default function UnifiedNoteForm({ 
  familyId, 
  editData, 
  onSuccess, 
  onCancel,
  onDelete 
}: UnifiedNoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [carers, setCarers] = useState<Carer[]>([]);
  
  // Determine initial mode based on existing data
  const [formMode, setFormMode] = useState<'daily_note' | 'incident'>(
    editData?.is_incident ? 'incident' : 'daily_note'
  );
  
  // Daily note form data
  const [dailyNoteData, setDailyNoteData] = useState({
    activity_support: editData?.activity_support || "",
    observations: editData?.observations || "",
    outcome_response: editData?.outcome_response || "",
    next_steps: editData?.next_steps || "",
    mood: editData?.mood || "",
    eating_drinking: editData?.eating_drinking || "",
    eating_drinking_notes: editData?.eating_drinking_notes || "",
    bathroom_usage: editData?.bathroom_usage || "",
    incidents: editData?.incidents || "",
  });

  // Incident form data
  const [incidentData, setIncidentData] = useState({
    incident_type: "",
    incident_date: format(new Date(), 'yyyy-MM-dd'),
    incident_time: "",
    location: "",
    people_involved: [] as string[],
    witnesses: "",
    description: "",
    immediate_actions: "",
    medical_attention_required: false,
    medical_attention_details: "",
    outcome: "",
    follow_up_required: false,
    follow_up_details: "",
    reported_to: [] as string[],
    reported_to_other: "",
  });

  // Load existing incident report if editing
  useEffect(() => {
    const loadExistingIncidentReport = async () => {
      if (!editData?.id || !editData?.is_incident) return;
      
      try {
        const { data, error } = await supabase
          .from('incident_reports')
          .select('*')
          .eq('care_note_id', editData.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setIncidentData({
            incident_type: data.incident_type || "",
            incident_date: data.incident_date || format(new Date(), 'yyyy-MM-dd'),
            incident_time: data.incident_time || "",
            location: data.location || "",
            people_involved: data.people_involved || [],
            witnesses: data.witnesses || "",
            description: data.description || "",
            immediate_actions: data.immediate_actions || "",
            medical_attention_required: data.medical_attention_required || false,
            medical_attention_details: data.medical_attention_details || "",
            outcome: data.outcome || "",
            follow_up_required: data.follow_up_required || false,
            follow_up_details: data.follow_up_details || "",
            reported_to: data.reported_to || [],
            reported_to_other: data.reported_to_other || "",
          });
        }
      } catch (error) {
        console.error('Error loading incident report:', error);
      }
    };

    loadExistingIncidentReport();
  }, [editData?.id, editData?.is_incident]);

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

  const togglePeopleInvolved = (carerId: string) => {
    setIncidentData(prev => ({
      ...prev,
      people_involved: prev.people_involved.includes(carerId)
        ? prev.people_involved.filter(id => id !== carerId)
        : [...prev.people_involved, carerId]
    }));
  };

  const toggleReportedTo = (value: string) => {
    setIncidentData(prev => ({
      ...prev,
      reported_to: prev.reported_to.includes(value)
        ? prev.reported_to.filter(v => v !== value)
        : [...prev.reported_to, value]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (formMode === 'incident') {
        // Validate incident fields
        if (!incidentData.incident_type || !incidentData.description.trim()) {
          toast.error("Please fill in incident type and description");
          setIsSubmitting(false);
          return;
        }

        // Prepare care note data for incident
        const noteData = {
          family_id: familyId,
          author_id: user.id,
          activity_support: incidentData.description,
          observations: incidentData.immediate_actions,
          outcome_response: incidentData.outcome,
          next_steps: incidentData.follow_up_details,
          is_incident: true,
          title: `Incident: ${INCIDENT_TYPES.find(t => t.value === incidentData.incident_type)?.label || incidentData.incident_type}`,
          content: incidentData.description,
        };

        let careNoteId = editData?.id;

        if (editData?.id) {
          // Update existing note
          const { error } = await supabase
            .from('care_notes')
            .update(noteData)
            .eq('id', editData.id);

          if (error) throw error;
        } else {
          // Create new note
          const { data: newNote, error } = await supabase
            .from('care_notes')
            .insert([noteData])
            .select()
            .single();

          if (error) throw error;
          careNoteId = newNote.id;
        }

        // Prepare incident report data
        const incidentReportData = {
          care_note_id: careNoteId,
          family_id: familyId,
          incident_type: incidentData.incident_type,
          incident_date: incidentData.incident_date,
          incident_time: incidentData.incident_time || null,
          location: incidentData.location || null,
          people_involved: incidentData.people_involved.length > 0 ? incidentData.people_involved : null,
          witnesses: incidentData.witnesses || null,
          description: incidentData.description,
          immediate_actions: incidentData.immediate_actions || null,
          medical_attention_required: incidentData.medical_attention_required,
          medical_attention_details: incidentData.medical_attention_required ? incidentData.medical_attention_details : null,
          outcome: incidentData.outcome || null,
          follow_up_required: incidentData.follow_up_required,
          follow_up_details: incidentData.follow_up_required ? incidentData.follow_up_details : null,
          reported_to: incidentData.reported_to.length > 0 ? incidentData.reported_to : null,
          reported_to_other: incidentData.reported_to.includes('other') ? incidentData.reported_to_other : null,
          reported_by: user.id,
        };

        // Check if incident report already exists
        const { data: existingReport } = await supabase
          .from('incident_reports')
          .select('id')
          .eq('care_note_id', careNoteId)
          .maybeSingle();

        if (existingReport) {
          // Update existing incident report
          const { error: incidentError } = await supabase
            .from('incident_reports')
            .update(incidentReportData)
            .eq('id', existingReport.id);

          if (incidentError) throw incidentError;
        } else {
          // Create new incident report
          const { error: incidentError } = await supabase
            .from('incident_reports')
            .insert([incidentReportData]);

          if (incidentError) throw incidentError;
        }

        toast.success(editData ? "Incident record updated" : "Incident record created");
      } else {
        // Daily note mode
        if (!dailyNoteData.activity_support.trim()) {
          toast.error("Please fill in the activity/support field");
          setIsSubmitting(false);
          return;
        }

        const noteData = {
          family_id: familyId,
          author_id: user.id,
          activity_support: dailyNoteData.activity_support,
          observations: dailyNoteData.observations,
          outcome_response: dailyNoteData.outcome_response,
          next_steps: dailyNoteData.next_steps,
          mood: dailyNoteData.mood,
          eating_drinking: dailyNoteData.eating_drinking,
          eating_drinking_notes: dailyNoteData.eating_drinking_notes,
          bathroom_usage: dailyNoteData.bathroom_usage,
          incidents: dailyNoteData.incidents,
          is_incident: false,
          title: dailyNoteData.activity_support || "Daily Note",
          content: dailyNoteData.activity_support || "",
        };

        if (editData?.id) {
          const { error } = await supabase
            .from('care_notes')
            .update(noteData)
            .eq('id', editData.id);

          if (error) throw error;
          toast.success("Note updated successfully");
        } else {
          const { error } = await supabase
            .from('care_notes')
            .insert([noteData]);

          if (error) throw error;
          toast.success("Note added successfully");
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error("Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode Toggle */}
      <Tabs value={formMode} onValueChange={(v) => setFormMode(v as 'daily_note' | 'incident')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="daily_note" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Daily Note</span>
          </TabsTrigger>
          <TabsTrigger value="incident" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Incident</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {formMode === 'daily_note' ? (
          <>
            {/* Daily Note Fields */}
            <div>
              <Label htmlFor="activity_support">Activity/Support Provided *</Label>
              <Textarea
                id="activity_support"
                value={dailyNoteData.activity_support}
                onChange={(e) => setDailyNoteData({ ...dailyNoteData, activity_support: e.target.value })}
                placeholder="Describe what activities were done and support provided..."
                required
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                value={dailyNoteData.observations}
                onChange={(e) => setDailyNoteData({ ...dailyNoteData, observations: e.target.value })}
                placeholder="Any observations about the care recipient..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="mood">Mood</Label>
              <Select
                value={dailyNoteData.mood}
                onValueChange={(value) => setDailyNoteData({ ...dailyNoteData, mood: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="happy">😊 Happy</SelectItem>
                  <SelectItem value="content">😌 Content</SelectItem>
                  <SelectItem value="neutral">😐 Neutral</SelectItem>
                  <SelectItem value="anxious">😟 Anxious</SelectItem>
                  <SelectItem value="sad">😢 Sad</SelectItem>
                  <SelectItem value="angry">😠 Angry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="eating_drinking">Eating & Drinking</Label>
              <Select
                value={dailyNoteData.eating_drinking}
                onValueChange={(value) => setDailyNoteData({ ...dailyNoteData, eating_drinking: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select eating status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All consumed</SelectItem>
                  <SelectItem value="most">Most consumed</SelectItem>
                  <SelectItem value="some">Some consumed</SelectItem>
                  <SelectItem value="little">Little consumed</SelectItem>
                  <SelectItem value="none">None consumed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dailyNoteData.eating_drinking && (
              <div>
                <Label htmlFor="eating_drinking_notes">Eating & Drinking Notes</Label>
                <Textarea
                  id="eating_drinking_notes"
                  value={dailyNoteData.eating_drinking_notes}
                  onChange={(e) => setDailyNoteData({ ...dailyNoteData, eating_drinking_notes: e.target.value })}
                  placeholder="Additional details about eating and drinking..."
                  rows={2}
                />
              </div>
            )}

            <div>
              <Label htmlFor="bathroom_usage">Bathroom Usage</Label>
              <Input
                id="bathroom_usage"
                value={dailyNoteData.bathroom_usage}
                onChange={(e) => setDailyNoteData({ ...dailyNoteData, bathroom_usage: e.target.value })}
                placeholder="e.g., 2 times, continent, etc."
              />
            </div>

            <div>
              <Label htmlFor="outcome_response">Outcome/Response</Label>
              <Textarea
                id="outcome_response"
                value={dailyNoteData.outcome_response}
                onChange={(e) => setDailyNoteData({ ...dailyNoteData, outcome_response: e.target.value })}
                placeholder="How did the care recipient respond to activities/support?"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="next_steps">Next Steps</Label>
              <Textarea
                id="next_steps"
                value={dailyNoteData.next_steps}
                onChange={(e) => setDailyNoteData({ ...dailyNoteData, next_steps: e.target.value })}
                placeholder="Any follow-up actions or next steps needed..."
                rows={2}
              />
            </div>
          </>
        ) : (
          <>
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Recording an incident - please provide accurate details
              </p>
            </div>

            <div>
              <Label htmlFor="incident_type">Incident Type *</Label>
              <Select
                value={incidentData.incident_type}
                onValueChange={(value) => setIncidentData({ ...incidentData, incident_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select incident type" />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="incident_date">Date *</Label>
                <Input
                  id="incident_date"
                  type="date"
                  value={incidentData.incident_date}
                  onChange={(e) => setIncidentData({ ...incidentData, incident_date: e.target.value })}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="incident_time">Time (optional)</Label>
                <Input
                  id="incident_time"
                  type="time"
                  value={incidentData.incident_time}
                  onChange={(e) => setIncidentData({ ...incidentData, incident_time: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                value={incidentData.location}
                onChange={(e) => setIncidentData({ ...incidentData, location: e.target.value })}
                placeholder="Where did the incident occur?"
              />
            </div>

            <div>
              <Label htmlFor="description">Description of What Happened *</Label>
              <Textarea
                id="description"
                value={incidentData.description}
                onChange={(e) => setIncidentData({ ...incidentData, description: e.target.value })}
                placeholder="Provide a factual description of the incident..."
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="immediate_actions">Immediate Actions Taken</Label>
              <Textarea
                id="immediate_actions"
                value={incidentData.immediate_actions}
                onChange={(e) => setIncidentData({ ...incidentData, immediate_actions: e.target.value })}
                placeholder="What actions were taken immediately after the incident?"
                rows={2}
              />
            </div>

            <div>
              <Label>People Involved (Carers)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {carers.map((carer) => (
                  <div
                    key={carer.id}
                    className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors ${
                      incidentData.people_involved.includes(carer.id)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => togglePeopleInvolved(carer.id)}
                  >
                    {carer.full_name}
                  </div>
                ))}
                {carers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No carers found</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="witnesses">Other Witnesses</Label>
              <Textarea
                id="witnesses"
                value={incidentData.witnesses}
                onChange={(e) => setIncidentData({ ...incidentData, witnesses: e.target.value })}
                placeholder="Names of any other witnesses..."
                rows={2}
              />
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="medical_attention"
                  checked={incidentData.medical_attention_required}
                  onCheckedChange={(checked) => 
                    setIncidentData({ ...incidentData, medical_attention_required: !!checked })
                  }
                />
                <Label htmlFor="medical_attention">Medical attention required?</Label>
              </div>
              {incidentData.medical_attention_required && (
                <Textarea
                  value={incidentData.medical_attention_details}
                  onChange={(e) => setIncidentData({ ...incidentData, medical_attention_details: e.target.value })}
                  placeholder="Details of medical attention provided..."
                  rows={2}
                />
              )}
            </div>

            <div>
              <Label htmlFor="outcome">Outcome</Label>
              <Textarea
                id="outcome"
                value={incidentData.outcome}
                onChange={(e) => setIncidentData({ ...incidentData, outcome: e.target.value })}
                placeholder="What was the outcome of the incident?"
                rows={2}
              />
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="follow_up"
                  checked={incidentData.follow_up_required}
                  onCheckedChange={(checked) => 
                    setIncidentData({ ...incidentData, follow_up_required: !!checked })
                  }
                />
                <Label htmlFor="follow_up">Follow-up required?</Label>
              </div>
              {incidentData.follow_up_required && (
                <Textarea
                  value={incidentData.follow_up_details}
                  onChange={(e) => setIncidentData({ ...incidentData, follow_up_details: e.target.value })}
                  placeholder="Details of required follow-up actions..."
                  rows={2}
                />
              )}
            </div>

            <div className="border-t pt-4">
              <Label>Reported To</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {REPORTED_TO_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`reported_${option.value}`}
                      checked={incidentData.reported_to.includes(option.value)}
                      onCheckedChange={() => toggleReportedTo(option.value)}
                    />
                    <Label htmlFor={`reported_${option.value}`} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
              {incidentData.reported_to.includes('other') && (
                <Input
                  className="mt-2"
                  value={incidentData.reported_to_other}
                  onChange={(e) => setIncidentData({ ...incidentData, reported_to_other: e.target.value })}
                  placeholder="Specify other..."
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-4 border-t">
        <div className="order-2 sm:order-1">
          {editData && onDelete && (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={onDelete}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-2 order-1 sm:order-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel} 
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editData ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    </form>
  );
}
