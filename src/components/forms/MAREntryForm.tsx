import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface MAREntryFormProps {
  medications: any[];
  entry?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const MAREntryForm = ({ medications, entry, onSubmit, onCancel }: MAREntryFormProps) => {
  const [formData, setFormData] = useState({
    medication_id: entry?.medication_id || '',
    scheduled_time: entry?.scheduled_time 
      ? format(new Date(entry.scheduled_time), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    administered_time: entry?.administered_time
      ? format(new Date(entry.administered_time), "yyyy-MM-dd'T'HH:mm")
      : '',
    dose_given: entry?.dose_given || '',
    status: entry?.status || 'pending',
    notes: entry?.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      scheduled_time: new Date(formData.scheduled_time).toISOString(),
      administered_time: formData.administered_time 
        ? new Date(formData.administered_time).toISOString()
        : null
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="medication_id">Medication</Label>
        <Select
          value={formData.medication_id}
          onValueChange={(value) => setFormData({ ...formData, medication_id: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select medication" />
          </SelectTrigger>
          <SelectContent>
            {medications.map((med) => (
              <SelectItem key={med.id} value={med.id}>
                {med.name} - {med.dosage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="scheduled_time">Scheduled Time</Label>
        <Input
          id="scheduled_time"
          type="datetime-local"
          value={formData.scheduled_time}
          onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
          required
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="administered">Administered</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="refused">Refused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.status === 'administered' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="administered_time">Actual Administration Time</Label>
            <Input
              id="administered_time"
              type="datetime-local"
              value={formData.administered_time}
              onChange={(e) => setFormData({ ...formData, administered_time: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dose_given">Dose Given</Label>
            <Input
              id="dose_given"
              value={formData.dose_given}
              onChange={(e) => setFormData({ ...formData, dose_given: e.target.value })}
              placeholder="e.g., 1 tablet, 5ml"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any observations or notes..."
          rows={3}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {entry ? 'Update' : 'Record'}
        </Button>
      </div>
    </form>
  );
};
