import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdaptiveSelect } from "@/components/adaptive";
import { Loader2, Sparkles } from "lucide-react";

interface RiskAssessmentFormProps {
  activity: string;
  setting: string;
  mainHazards: string;
  location: string;
  onActivityChange: (value: string) => void;
  onSettingChange: (value: string) => void;
  onMainHazardsChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export const RiskAssessmentForm = ({
  activity,
  setting,
  mainHazards,
  location,
  onActivityChange,
  onSettingChange,
  onMainHazardsChange,
  onLocationChange,
  onGenerate,
  isGenerating
}: RiskAssessmentFormProps) => {
  const isValid = activity.trim() && setting.trim() && mainHazards.trim() && location.trim();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="activity">Activity *</Label>
          <Input
            id="activity"
            placeholder="e.g., Community outing, Personal care, Cooking"
            value={activity}
            onChange={(e) => onActivityChange(e.target.value)}
            disabled={isGenerating}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="setting">Setting/Environment *</Label>
          <AdaptiveSelect
            value={setting}
            onValueChange={onSettingChange}
            disabled={isGenerating}
            placeholder="Select setting"
            title="Setting/Environment"
            options={[
              { value: "Home - Indoor", label: "Home - Indoor" },
              { value: "Home - Garden/Outdoor", label: "Home - Garden/Outdoor" },
              { value: "Community - Indoor", label: "Community - Indoor" },
              { value: "Community - Outdoor", label: "Community - Outdoor" },
              { value: "Transport - Car", label: "Transport - Car" },
              { value: "Transport - Public", label: "Transport - Public" },
              { value: "Healthcare Setting", label: "Healthcare Setting" },
              { value: "Workplace", label: "Workplace" },
              { value: "Other", label: "Other" },
            ]}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location *</Label>
        <Input
          id="location"
          placeholder="e.g., Local park, Kitchen, Shopping centre"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          disabled={isGenerating}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hazards">Main Hazards *</Label>
        <Textarea
          id="hazards"
          placeholder="Describe the main hazards you're concerned about, e.g., Uneven terrain, weather exposure, fatigue, medication side effects..."
          value={mainHazards}
          onChange={(e) => onMainHazardsChange(e.target.value)}
          rows={3}
          disabled={isGenerating}
        />
      </div>

      <Button 
        onClick={onGenerate} 
        disabled={!isValid || isGenerating}
        className="w-full md:w-auto"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating Assessment...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Risk Assessment
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        The AI will use information from care notes, medications, and medical history to generate a tailored risk assessment.
      </p>
    </div>
  );
};
