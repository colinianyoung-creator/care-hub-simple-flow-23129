import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { bodyLogSchema } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Tables } from "@/integrations/supabase/types";

type BodyLogFormData = z.infer<typeof bodyLogSchema>;

interface BodyRegion {
  id: string;
  label: string;
}

interface BodyLogFormProps {
  familyId: string;
  selectedRegion: BodyRegion | null;
  viewType: 'front' | 'back';
  onSuccess: () => void;
  onCancel: () => void;
  editData?: Tables<'body_logs'> | null;
}

const SEVERITY_OPTIONS = [
  'Minor Bruise',
  'Moderate Bruise',
  'Severe Bruise',
  'Minor Cut/Scrape',
  'Moderate Cut/Laceration',
  'Severe Cut/Laceration',
  'Burn (1st degree)',
  'Burn (2nd degree)',
  'Burn (3rd degree)',
  'Swelling',
  'Redness/Rash',
  'Pressure Sore (Stage 1)',
  'Pressure Sore (Stage 2)',
  'Pressure Sore (Stage 3)',
  'Pressure Sore (Stage 4)',
  'Sprain/Strain',
  'Fracture (suspected)',
  'Other'
];

export const BodyLogForm = ({
  familyId,
  selectedRegion,
  viewType,
  onSuccess,
  onCancel,
  editData
}: BodyLogFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultDateTime = new Date().toISOString().slice(0, 16);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<BodyLogFormData>({
    resolver: zodResolver(bodyLogSchema),
    defaultValues: editData ? {
      body_location: editData.body_location,
      body_region_code: editData.body_region_code,
      view_type: editData.view_type as 'front' | 'back',
      description: editData.description,
      type_severity: editData.type_severity,
      incident_datetime: editData.incident_datetime.slice(0, 16)
    } : {
      body_location: selectedRegion?.label || '',
      body_region_code: selectedRegion?.id || '',
      view_type: viewType,
      description: '',
      type_severity: '',
      incident_datetime: defaultDateTime
    }
  });

  const selectedSeverity = watch('type_severity');

  const onSubmit = async (data: BodyLogFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const logData = {
        body_location: data.body_location,
        body_region_code: data.body_region_code,
        view_type: data.view_type,
        description: data.description,
        type_severity: data.type_severity,
        family_id: familyId,
        created_by: user.id,
        incident_datetime: new Date(data.incident_datetime).toISOString()
      };

      if (editData) {
        const { error } = await supabase
          .from('body_logs')
          .update(logData)
          .eq('id', editData.id);

        if (error) throw error;

        toast({
          title: 'Injury log updated',
          description: 'The injury record has been updated successfully.'
        });
      } else {
        const { error } = await supabase
          .from('body_logs')
          .insert([logData]);

        if (error) throw error;

        toast({
          title: 'Injury logged',
          description: `Recorded injury to ${data.body_location}`
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving body log:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save injury log',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="body_location">Body Location</Label>
        <Input
          id="body_location"
          {...register('body_location')}
          placeholder="e.g., Left Shoulder"
          disabled
          className="bg-muted"
        />
        {errors.body_location && (
          <p className="text-sm text-destructive">{errors.body_location.message}</p>
        )}
      </div>

      <input type="hidden" {...register('body_region_code')} />
      <input type="hidden" {...register('view_type')} />

      <div className="space-y-2">
        <Label htmlFor="type_severity">Type / Severity</Label>
        <Select
          value={selectedSeverity}
          onValueChange={(value) => setValue('type_severity', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select injury type or severity" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type_severity && (
          <p className="text-sm text-destructive">{errors.type_severity.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="incident_datetime">Incident Date & Time</Label>
        <Input
          id="incident_datetime"
          type="datetime-local"
          {...register('incident_datetime')}
        />
        {errors.incident_datetime && (
          <p className="text-sm text-destructive">{errors.incident_datetime.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description of Injury or Illness</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Describe the injury, how it occurred, visible symptoms, etc."
          rows={4}
          className="resize-none"
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {watch('description')?.length || 0} / 1000 characters
        </p>
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editData ? 'Update Log' : 'Save Log'}
        </Button>
      </div>
    </form>
  );
};
