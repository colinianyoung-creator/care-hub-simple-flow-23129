import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { BodyMap } from "@/components/BodyMap";
import { BodyLogForm } from "@/components/forms/BodyLogForm";
import { BodyRegion } from "@/lib/bodyMapRegions";
import type { Tables } from "@/integrations/supabase/types";
import { format } from 'date-fns';

type BodyLog = Tables<'body_logs'> & {
  profiles?: {
    full_name: string | null;
  } | null;
};

interface BodyMapTrackerProps {
  familyId: string;
  userRole: string;
}

export const BodyMapTracker = ({ familyId, userRole }: BodyMapTrackerProps) => {
  const { toast } = useToast();
  const [viewType, setViewType] = useState<'front' | 'back'>('front');
  const [bodyLogs, setBodyLogs] = useState<BodyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState<BodyLog | null>(null);

  useEffect(() => {
    loadBodyLogs();
  }, [familyId]);

  const loadBodyLogs = async () => {
    setLoading(true);
    try {
      // Fetch body logs
      const { data: logsData, error: logsError } = await supabase
        .from('body_logs')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_archived', false)
        .order('incident_datetime', { ascending: false });

      if (logsError) throw logsError;

      // Get unique author IDs
      const authorIds = [...new Set(logsData?.map(log => log.created_by) || [])];

      // Fetch profiles for all authors
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);

      if (profilesError) throw profilesError;

      // Create a map of profile data
      const profilesMap = new Map(
        profilesData?.map(profile => [profile.id, profile]) || []
      );

      // Merge profiles with logs
      const logsWithProfiles = logsData?.map(log => ({
        ...log,
        profiles: profilesMap.get(log.created_by) || null
      })) || [];

      setBodyLogs(logsWithProfiles);
    } catch (error) {
      console.error('Error loading body logs:', error);
      toast({
        title: "Error",
        description: "Failed to load body map data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegionClick = (region: BodyRegion) => {
    setSelectedRegion(region);
    setEditingLog(null);
    setShowLogForm(true);
  };

  const handleFormSuccess = () => {
    setShowLogForm(false);
    setSelectedRegion(null);
    setEditingLog(null);
    loadBodyLogs();
  };

  const handleFormCancel = () => {
    setShowLogForm(false);
    setSelectedRegion(null);
    setEditingLog(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading body map...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Toggle and Count */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Body Map Injury Tracker</h3>
          <p className="text-sm text-muted-foreground">
            {bodyLogs.length === 0 
              ? "No injuries logged" 
              : `${bodyLogs.length} ${bodyLogs.length === 1 ? 'injury' : 'injuries'} logged`
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant={viewType === 'front' ? 'default' : 'outline'}
            onClick={() => setViewType('front')}
          >
            Front View
          </Button>
          <Button 
            variant={viewType === 'back' ? 'default' : 'outline'}
            onClick={() => setViewType('back')}
          >
            Back View
          </Button>
        </div>
      </div>

      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Click on any body region to record a new injury or condition. 
          Existing injuries are marked with colored dots based on severity.
        </AlertDescription>
      </Alert>

      {/* Body Map */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <BodyMap
            viewType={viewType}
            existingLogs={bodyLogs}
            onRegionClick={handleRegionClick}
          />
        </CardContent>
      </Card>

      {/* Severity Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Severity Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[hsl(var(--destructive))]" />
              <span>Severe (fractures, stage 3-4, 3rd degree burns)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(24 95% 53%)' }} />
              <span>Moderate (stage 2, 2nd degree burns)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'hsl(48 96% 53%)' }} />
              <span>Minor (bruises, cuts, rashes)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLog ? 'Edit Injury Log' : 'Record New Injury'}
            </DialogTitle>
          </DialogHeader>
          <BodyLogForm
            familyId={familyId}
            selectedRegion={selectedRegion}
            viewType={viewType}
            editData={editingLog}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
