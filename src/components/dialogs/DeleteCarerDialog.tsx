import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, UserMinus, Users, UserPlus, Download, Loader2, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ExportTimesheetDialog } from './ExportTimesheetDialog';

interface DeleteCarerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  carerType: 'registered' | 'placeholder';
  carerId: string;
  carerName: string;
  membershipId?: string; // For registered carers
  onDeleted: () => void;
  onScheduleChange?: () => void;
}

interface CarerOption {
  id: string;
  name: string;
  type: 'registered' | 'placeholder';
}

interface ShiftStats {
  futureShiftCount: number;
  hasTimesheetData: boolean;
  lastExportDate: string | null;
  lastWorkedMonth: string | null;
}

export const DeleteCarerDialog = ({
  isOpen,
  onClose,
  familyId,
  carerType,
  carerId,
  carerName,
  membershipId,
  onDeleted,
  onScheduleChange
}: DeleteCarerDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deletionOption, setDeletionOption] = useState<'reassign' | 'invite' | 'delete'>('reassign');
  const [selectedReassignee, setSelectedReassignee] = useState('');
  const [availableCarers, setAvailableCarers] = useState<CarerOption[]>([]);
  const [shiftStats, setShiftStats] = useState<ShiftStats>({
    futureShiftCount: 0,
    hasTimesheetData: false,
    lastExportDate: null,
    lastWorkedMonth: null
  });
  const [confirmText, setConfirmText] = useState('');
  const [exportBeforeDelete, setExportBeforeDelete] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setDeletionOption('reassign');
      setSelectedReassignee('');
      setConfirmText('');
      setExportBeforeDelete(false);
      setGeneratedInviteCode(null);
    }
  }, [isOpen, carerId, familyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load other carers for reassignment
      const { data: membersData } = await supabase
        .from('user_memberships')
        .select(`
          user_id,
          role,
          profiles!user_memberships_user_id_fkey(full_name)
        `)
        .eq('family_id', familyId)
        .eq('role', 'carer')
        .neq('user_id', carerType === 'registered' ? carerId : '');

      const { data: placeholdersData } = await supabase
        .from('placeholder_carers')
        .select('id, full_name')
        .eq('family_id', familyId)
        .eq('is_linked', false)
        .neq('id', carerType === 'placeholder' ? carerId : '');

      const carers: CarerOption[] = [
        ...(membersData?.map(m => ({
          id: m.user_id,
          name: m.profiles?.full_name || 'Unnamed Carer',
          type: 'registered' as const
        })) || []),
        ...(placeholdersData?.map(p => ({
          id: p.id,
          name: `${p.full_name} (pending)`,
          type: 'placeholder' as const
        })) || [])
      ];

      setAvailableCarers(carers);

      // Count future shifts
      const today = new Date().toISOString().split('T')[0];
      let shiftQuery = supabase
        .from('shift_assignments')
        .select('id', { count: 'exact' })
        .eq('family_id', familyId)
        .eq('active', true);

      if (carerType === 'registered') {
        shiftQuery = shiftQuery.eq('carer_id', carerId);
      } else {
        shiftQuery = shiftQuery.eq('placeholder_carer_id', carerId);
      }

      const { count: shiftCount } = await shiftQuery;

      // Check for time entries (timesheet data)
      let hasTimesheet = false;
      let lastWorked: string | null = null;
      
      if (carerType === 'registered') {
        const { data: timeEntries, count: timeCount } = await supabase
          .from('time_entries')
          .select('clock_in', { count: 'exact' })
          .eq('user_id', carerId)
          .eq('family_id', familyId)
          .order('clock_in', { ascending: false })
          .limit(1);

        hasTimesheet = (timeCount || 0) > 0;
        if (timeEntries && timeEntries.length > 0) {
          lastWorked = format(new Date(timeEntries[0].clock_in), 'MMMM yyyy');
        }
      }

      // Check last export date
      const { data: exports } = await supabase
        .from('timesheet_exports')
        .select('exported_at, end_date')
        .eq('family_id', familyId)
        .eq(carerType === 'registered' ? 'carer_id' : 'placeholder_carer_id', carerId)
        .order('exported_at', { ascending: false })
        .limit(1);

      setShiftStats({
        futureShiftCount: shiftCount || 0,
        hasTimesheetData: hasTimesheet,
        lastExportDate: exports?.[0]?.exported_at ? format(new Date(exports[0].exported_at), 'dd MMM yyyy') : null,
        lastWorkedMonth: lastWorked
      });
    } catch (error) {
      console.error('Error loading carer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReassignShifts = async (targetCarerId: string, targetType: 'registered' | 'placeholder') => {
    const updateData = targetType === 'registered'
      ? { carer_id: targetCarerId, placeholder_carer_id: null }
      : { carer_id: null, placeholder_carer_id: targetCarerId };

    let query = supabase
      .from('shift_assignments')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('family_id', familyId)
      .eq('active', true);

    if (carerType === 'registered') {
      query = query.eq('carer_id', carerId);
    } else {
      query = query.eq('placeholder_carer_id', carerId);
    }

    const { error } = await query;
    if (error) throw error;
  };

  const handleDeleteShifts = async () => {
    // Delete shift assignments for this carer
    let query = supabase
      .from('shift_assignments')
      .delete()
      .eq('family_id', familyId);

    if (carerType === 'registered') {
      query = query.eq('carer_id', carerId);
    } else {
      query = query.eq('placeholder_carer_id', carerId);
    }

    const { error } = await query;
    if (error) throw error;
  };

  const handleGenerateInviteForShifts = async () => {
    try {
      // Generate an invite code for a new carer
      const { data: code, error } = await supabase.rpc('generate_invite', {
        _family_id: familyId,
        _role: 'carer' as const
      });

      if (error) throw error;
      
      setGeneratedInviteCode(code);
      return code;
    } catch (error) {
      console.error('Error generating invite:', error);
      throw error;
    }
  };

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      // Handle shifts based on selected option
      if (deletionOption === 'reassign' && selectedReassignee) {
        const target = availableCarers.find(c => c.id === selectedReassignee);
        if (target) {
          await handleReassignShifts(target.id, target.type);
          toast({
            title: "Shifts Reassigned",
            description: `All shifts have been reassigned to ${target.name}`,
          });
        }
      } else if (deletionOption === 'invite') {
        const code = await handleGenerateInviteForShifts();
        // Keep shifts as-is for now, they'll be reassigned when the new carer joins
        toast({
          title: "Invite Generated",
          description: `Invite code ${code} created. Shifts will be available for the new carer.`,
        });
      } else if (deletionOption === 'delete') {
        await handleDeleteShifts();
        toast({
          title: "Shifts Deleted",
          description: `All future shifts for ${carerName} have been removed`,
        });
      }

      // Now remove the carer/membership
      if (carerType === 'registered' && membershipId) {
        const { error } = await supabase
          .from('user_memberships')
          .delete()
          .eq('id', membershipId);

        if (error) throw error;
      } else if (carerType === 'placeholder') {
        const { error } = await supabase
          .from('placeholder_carers')
          .delete()
          .eq('id', carerId);

        if (error) throw error;
      }

      toast({
        title: "Carer Removed",
        description: `${carerName} has been removed from the care team`,
      });

      onDeleted();
      onScheduleChange?.();
      onClose();
    } catch (error) {
      console.error('Error removing carer:', error);
      toast({
        title: "Error",
        description: "Failed to remove carer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const canConfirm = () => {
    if (deletionOption === 'reassign' && !selectedReassignee) return false;
    if (deletionOption === 'delete' && confirmText.toUpperCase() !== 'DELETE') return false;
    return true;
  };

  const copyInviteCode = () => {
    if (generatedInviteCode) {
      navigator.clipboard.writeText(generatedInviteCode);
      toast({
        title: "Copied",
        description: "Invite code copied to clipboard",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" />
              Remove {carerName}
            </DialogTitle>
            <DialogDescription>
              Choose how to handle their scheduled shifts
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Summary */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Scheduled shifts
                  </span>
                  <Badge variant={shiftStats.futureShiftCount > 0 ? "default" : "secondary"}>
                    {shiftStats.futureShiftCount}
                  </Badge>
                </div>
                
                {carerType === 'registered' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Timesheet data
                      </span>
                      <Badge variant={shiftStats.hasTimesheetData ? "default" : "secondary"}>
                        {shiftStats.hasTimesheetData ? `Through ${shiftStats.lastWorkedMonth}` : 'None'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Last export
                      </span>
                      {shiftStats.lastExportDate ? (
                        <Badge variant="secondary">{shiftStats.lastExportDate}</Badge>
                      ) : (
                        <Badge variant="destructive">Never exported</Badge>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Export Warning */}
              {carerType === 'registered' && shiftStats.hasTimesheetData && !shiftStats.lastExportDate && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This carer has timesheet data that hasn't been exported yet. Their historical time entries will remain available for export after removal.
                  </AlertDescription>
                </Alert>
              )}

              {/* Deletion Options */}
              <RadioGroup value={deletionOption} onValueChange={(v) => setDeletionOption(v as any)}>
                {/* Option 1: Reassign */}
                <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${deletionOption === 'reassign' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}`}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="reassign" id="reassign" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="reassign" className="flex items-center gap-2 cursor-pointer font-medium">
                        <Users className="h-4 w-4" />
                        Reassign shifts to existing carer
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Transfer all scheduled shifts to another team member
                      </p>
                      
                      {deletionOption === 'reassign' && (
                        <Select value={selectedReassignee} onValueChange={setSelectedReassignee}>
                          <SelectTrigger className="w-full mt-2">
                            <SelectValue placeholder="Select a carer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCarers.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                No other carers available
                              </div>
                            ) : (
                              availableCarers.map(carer => (
                                <SelectItem key={carer.id} value={carer.id}>
                                  {carer.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Option 2: Invite new carer */}
                <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${deletionOption === 'invite' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}`}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="invite" id="invite" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="invite" className="flex items-center gap-2 cursor-pointer font-medium">
                        <UserPlus className="h-4 w-4" />
                        Invite a new carer to take over
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Generate an invite code. Shifts will remain unassigned until claimed.
                      </p>
                      
                      {deletionOption === 'invite' && generatedInviteCode && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-background rounded border">
                          <span className="text-sm">Code:</span>
                          <code className="font-mono font-bold">{generatedInviteCode}</code>
                          <Button size="sm" variant="ghost" onClick={copyInviteCode}>
                            Copy
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Option 3: Delete without reassignment */}
                <div className={`border rounded-lg p-4 cursor-pointer transition-colors ${deletionOption === 'delete' ? 'border-destructive bg-destructive/5' : 'hover:border-muted-foreground/50'}`}>
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="delete" id="delete" className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer font-medium text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Delete without reassignment
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Permanently remove all {shiftStats.futureShiftCount} scheduled shifts from all schedules.
                      </p>
                      
                      {deletionOption === 'delete' && (
                        <div className="mt-2 space-y-2">
                          <Label htmlFor="confirm-delete" className="text-sm">
                            Type <strong>DELETE</strong> to confirm:
                          </Label>
                          <Input
                            id="confirm-delete"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </RadioGroup>

              {/* Export before delete option */}
              {carerType === 'registered' && shiftStats.hasTimesheetData && (
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <Checkbox
                    id="export-first"
                    checked={exportBeforeDelete}
                    onCheckedChange={(checked) => setExportBeforeDelete(checked === true)}
                  />
                  <Label htmlFor="export-first" className="text-sm cursor-pointer">
                    Export timesheet before removing (recommended)
                  </Label>
                  {exportBeforeDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      onClick={() => setShowExportDialog(true)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!canConfirm() || processing || loading}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Confirm Removal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <ExportTimesheetDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        familyId={familyId}
        userRole="family_admin"
      />
    </>
  );
};
