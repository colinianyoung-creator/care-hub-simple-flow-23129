import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

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
          <Select
            value={formData.mood}
            onValueChange={(value) => setFormData({ ...formData, mood: value })}
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

        {/* Eating & Drinking */}
        <div>
          <Label htmlFor="eating_drinking">Eating & Drinking</Label>
          <Select
            value={formData.eating_drinking}
            onValueChange={(value) => setFormData({ ...formData, eating_drinking: value })}
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
            Mark as incident requiring follow-up
          </Label>
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
    </form>
  );
}
