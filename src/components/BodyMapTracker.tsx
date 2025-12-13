import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, Archive, RotateCcw } from "lucide-react";
import { BodyMap } from "@/components/BodyMap";
import { BodyLogForm } from "@/components/forms/BodyLogForm";
import { BodyMapArchiveSection } from "@/components/sections/BodyMapArchiveSection";
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
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [viewType, setViewType] = useState<'front' | 'back'>('front');
  const [bodyLogs, setBodyLogs] = useState<BodyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState<BodyLog | null>(null);
  const [archiveAllLoading, setArchiveAllLoading] = useState(false);

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

  const handleArchiveLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('body_logs')
        .update({ is_archived: true })
        .eq('id', logId);

      if (error) throw error;

      toast({
        title: "Log Archived",
        description: "The injury log has been archived successfully."
      });

      setShowLogForm(false);
      setEditingLog(null);
      loadBodyLogs();
    } catch (error) {
      console.error('Error archiving log:', error);
      toast({
        title: "Error",
        description: "Failed to archive injury log",
        variant: "destructive"
      });
    }
  };

  const handleArchiveAll = async () => {
    if (bodyLogs.length === 0) return;
    
    setArchiveAllLoading(true);
    try {
      const { error } = await supabase
        .from('body_logs')
        .update({ is_archived: true })
        .eq('family_id', familyId)
        .eq('is_archived', false);

      if (error) throw error;

      toast({
        title: "All Logs Archived",
        description: `${bodyLogs.length} injury log(s) have been archived and the body map cleared.`
      });

      loadBodyLogs();
    } catch (error) {
      console.error('Error archiving all logs:', error);
      toast({
        title: "Error",
        description: "Failed to archive all injury logs",
        variant: "destructive"
      });
    } finally {
      setArchiveAllLoading(false);
    }
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
      {/* Tabs for Active/Archive */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archive')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6 mt-4">
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
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={viewType === 'front' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('front')}
              >
                Front View
              </Button>
              <Button 
                variant={viewType === 'back' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType('back')}
              >
                Back View
              </Button>
              
              {bodyLogs.length > 0 && userRole !== 'family_viewer' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={archiveAllLoading}>
                      <Archive className="h-4 w-4 mr-1" />
                      Archive All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive All Injury Logs?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will archive all {bodyLogs.length} active injury log(s) and clear the body map. 
                        Archived logs can be viewed in the Archive tab. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleArchiveAll} disabled={archiveAllLoading}>
                        {archiveAllLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Archive All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
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

          {/* Body Map Logs List */}
          {bodyLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Injury Log Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bodyLogs.map((log) => (
                    <Card 
                      key={log.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setEditingLog(log);
                        setShowLogForm(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-2 flex-1">
                            {/* Timestamp and Author */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                              <p className="text-sm font-medium">
                                {format(new Date(log.incident_datetime), 'MMM d, yyyy')} at {format(new Date(log.incident_datetime), 'h:mm a')}
                              </p>
                              <Badge variant="outline" className="w-fit">
                                {log.view_type === 'front' ? '🧍 Front' : '🧍‍♂️ Back'}
                              </Badge>
                            </div>

                            {/* Author */}
                            <p className="text-xs text-muted-foreground">
                              Logged by: {log.profiles?.full_name || 'Unknown User'}
                            </p>

                            {/* Body Location and Severity */}
                            <div className="flex flex-wrap gap-2 items-center">
                              <div className="font-semibold text-sm">{log.body_location}</div>
                              <Badge 
                                variant={
                                  log.type_severity.includes('Severe') || 
                                  log.type_severity.includes('Stage 3') || 
                                  log.type_severity.includes('Stage 4') || 
                                  log.type_severity.includes('3rd degree') 
                                    ? 'destructive'
                                    : log.type_severity.includes('Moderate') || 
                                      log.type_severity.includes('Stage 2') || 
                                      log.type_severity.includes('2nd degree')
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {log.type_severity}
                              </Badge>
                            </div>

                            {/* Description */}
                            {log.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {log.description}
                              </p>
                            )}
                          </div>

                          {/* Click to expand hint */}
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            Click to view/edit
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archive" className="mt-4">
          <BodyMapArchiveSection 
            familyId={familyId} 
            userRole={userRole}
            onUnarchive={loadBodyLogs}
          />
        </TabsContent>
      </Tabs>

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
              onArchive={editingLog ? () => handleArchiveLog(editingLog.id) : undefined}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
};
