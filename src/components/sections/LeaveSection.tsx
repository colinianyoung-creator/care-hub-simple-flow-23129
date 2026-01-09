import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarDays, Clock, Download, Loader2, Pencil, Trash2, Check } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, isAfter, startOfDay } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface LeaveSectionProps {
  familyId: string;
  userRole: string;
  currentUserId?: string | null;
  onScheduleRefresh?: () => void;
}

interface LeaveEntry {
  id: string;
  type: 'leave_request' | 'time_entry';
  shift_type: string;
  start_date: string;
  end_date: string;
  carer_id: string;
  carer_name: string;
  reason?: string;
  status?: string;
}

export const LeaveSection = ({ familyId, userRole, currentUserId, onScheduleRefresh }: LeaveSectionProps) => {
  const [leaveEntries, setLeaveEntries] = useState<LeaveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'taken'>('upcoming');
  const [filters, setFilters] = useState({
    carer: 'all-carers',
    type: 'all-types'
  });
  const [carers, setCarers] = useState<Array<{ id: string; name: string }>>([]);
  const [upcomingLimit, setUpcomingLimit] = useState(10);
  const [takenLimit, setTakenLimit] = useState(10);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';
  const isCarer = userRole === 'carer';

  const leaveShiftTypes = ['annual_leave', 'sickness', 'public_holiday'];

  useEffect(() => {
    loadLeaveData();
  }, [familyId, userRole, currentUserId]);

  const loadLeaveData = async () => {
    try {
      setLoading(true);

      // Get all carers from family
      const { data: carerMemberships } = await supabase
        .from('user_memberships')
        .select('user_id')
        .eq('family_id', familyId)
        .eq('role', 'carer');

      const allCarerIds = carerMemberships?.map(m => m.user_id) || [];

      // Get profiles for all carers
      let carerProfiles: any[] = [];
      if (allCarerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', allCarerIds);
        carerProfiles = profiles || [];
      }

      setCarers(carerProfiles.map(p => ({ id: p.id, name: p.full_name || 'Unknown' })));

      // Get approved leave requests
      let leaveQuery = supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .order('start_date', { ascending: false });

      // Filter by current user if carer
      if (isCarer && currentUserId) {
        leaveQuery = leaveQuery.eq('user_id', currentUserId);
      }

      const { data: leaveRequests, error: leaveError } = await leaveQuery;
      if (leaveError) throw leaveError;

      // Get time entries with leave shift types
      let timeEntriesQuery = supabase
        .from('time_entries')
        .select('*')
        .eq('family_id', familyId)
        .in('shift_type', leaveShiftTypes)
        .order('clock_in', { ascending: false });

      // Filter by current user if carer
      if (isCarer && currentUserId) {
        timeEntriesQuery = timeEntriesQuery.eq('user_id', currentUserId);
      }

      const { data: timeEntries, error: timeError } = await timeEntriesQuery;
      if (timeError) throw timeError;

      // Transform leave requests
      const leaveFromRequests: LeaveEntry[] = (leaveRequests || []).map(req => ({
        id: `leave-${req.id}`,
        type: 'leave_request',
        shift_type: 'leave',
        start_date: req.start_date,
        end_date: req.end_date,
        carer_id: req.user_id,
        carer_name: carerProfiles.find(p => p.id === req.user_id)?.full_name || 'Unknown',
        reason: req.reason,
        status: req.status
      }));

      // Transform time entries
      const leaveFromTimeEntries: LeaveEntry[] = (timeEntries || []).map(entry => {
        const clockInDate = new Date(entry.clock_in);
        const clockOutDate = entry.clock_out ? new Date(entry.clock_out) : clockInDate;
        
        return {
          id: `time-${entry.id}`,
          type: 'time_entry',
          shift_type: entry.shift_type || 'leave',
          start_date: format(clockInDate, 'yyyy-MM-dd'),
          end_date: format(clockOutDate, 'yyyy-MM-dd'),
          carer_id: entry.user_id,
          carer_name: carerProfiles.find(p => p.id === entry.user_id)?.full_name || 'Unknown',
          reason: entry.notes
        };
      });

      // Combine and deduplicate (prefer leave_request over time_entry for same date/carer)
      const allLeave = [...leaveFromRequests, ...leaveFromTimeEntries];
      
      // Sort by start_date descending
      allLeave.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

      setLeaveEntries(allLeave);
    } catch (error) {
      console.error('Error loading leave data:', error);
      toast({
        title: "Error",
        description: "Failed to load leave data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLeave = (applyLimit = true) => {
    const today = startOfDay(new Date());
    let filtered = [...leaveEntries];

    // Filter by upcoming/taken
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(entry => {
        const startDate = new Date(entry.start_date);
        return isAfter(startDate, today) || format(startDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      });
      // Sort upcoming by start date ascending (soonest first)
      filtered.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    } else {
      filtered = filtered.filter(entry => {
        const endDate = new Date(entry.end_date);
        return isBefore(endDate, today);
      });
      // Sort taken by start date descending (most recent first)
      filtered.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }

    // Filter by carer
    if (filters.carer && filters.carer !== 'all-carers') {
      filtered = filtered.filter(entry => entry.carer_id === filters.carer);
    }

    // Filter by type
    if (filters.type && filters.type !== 'all-types') {
      filtered = filtered.filter(entry => entry.shift_type === filters.type);
    }

    // Apply limit for pagination
    if (applyLimit) {
      const limit = activeTab === 'upcoming' ? upcomingLimit : takenLimit;
      return { entries: filtered.slice(0, limit), total: filtered.length };
    }

    return { entries: filtered, total: filtered.length };
  };

  const getShiftTypeBadge = (shiftType: string) => {
    const typeConfig: Record<string, { className: string; label: string }> = {
      'annual_leave': { className: 'bg-yellow-500 text-white', label: 'Annual Leave' },
      'sickness': { className: 'bg-red-500 text-white', label: 'Sickness' },
      'public_holiday': { className: 'bg-purple-500 text-white', label: 'Public Holiday' },
      'leave': { className: 'bg-muted text-muted-foreground', label: 'Leave' }
    };

    const config = typeConfig[shiftType] || { className: 'bg-muted', label: shiftType.replace(/_/g, ' ') };
    
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const { entries: data } = getFilteredLeave(false);
    if (data.length === 0) return;

    const headers = ['Start Date', 'End Date', 'Carer', 'Type', 'Reason'];
    const csvContent = [
      headers.join(','),
      ...data.map(entry => [
        entry.start_date,
        entry.end_date,
        `"${entry.carer_name}"`,
        entry.shift_type.replace(/_/g, ' '),
        `"${entry.reason || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Leave data exported to CSV"
    });
  };

  const handleEditLeaveType = async (entryId: string, sourceType: 'leave_request' | 'time_entry', newShiftType: string) => {
    try {
      const realId = entryId.replace(/^(leave-|time-)/, '');

      if (sourceType === 'time_entry') {
        const { error } = await supabase
          .from('time_entries')
          .update({ shift_type: newShiftType })
          .eq('id', realId);

        if (error) throw error;
      }
      // For leave_request type, we don't change the type as it's just a request record

      toast({
        title: "Success",
        description: "Leave type updated"
      });

      await loadLeaveData();
      onScheduleRefresh?.();
    } catch (error) {
      console.error('Error updating leave type:', error);
      toast({
        title: "Error",
        description: "Failed to update leave type",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLeave = async (entryId: string, sourceType: 'leave_request' | 'time_entry', entry: LeaveEntry) => {
    try {
      const realId = entryId.replace(/^(leave-|time-)/, '');

      if (sourceType === 'time_entry') {
        // Step 1: Check for cover shifts on the same date(s)
        const { data: coverShifts, error: coverError } = await supabase
          .from('time_entries')
          .select('id, user_id, clock_in, clock_out')
          .eq('family_id', familyId)
          .eq('shift_type', 'cover')
          .gte('clock_in', `${entry.start_date}T00:00:00`)
          .lte('clock_in', `${entry.end_date}T23:59:59`)
          .neq('user_id', entry.carer_id);

        if (coverError) throw coverError;

        // Step 2: If no conflicts, revert immediately
        if (!coverShifts || coverShifts.length === 0) {
          const { data: updatedEntry, error } = await supabase
            .from('time_entries')
            .update({ shift_type: 'basic' })
            .eq('id', realId)
            .select('id')
            .maybeSingle();

          if (error) throw error;
          
          // Check if the update actually happened (RLS may have blocked it)
          if (!updatedEntry) {
            throw new Error('Failed to update the shift. The entry may not be linked to your account.');
          }

          toast({
            title: "Success",
            description: "Leave reverted to basic shift"
          });
        } else {
          // Step 3: Conflicts found - create cancellation request
          // Get cover carer names for display
          const coverCarerIds = [...new Set(coverShifts.map(s => s.user_id).filter(Boolean))];
          const { data: coverProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', coverCarerIds);

          const conflictDetails = coverShifts.map(cs => ({
            shift_id: cs.id,
            carer_id: cs.user_id,
            carer_name: coverProfiles?.find(p => p.id === cs.user_id)?.full_name || 'Unknown',
            date: format(new Date(cs.clock_in), 'MMM d, yyyy'),
            time: `${format(new Date(cs.clock_in), 'HH:mm')} - ${cs.clock_out ? format(new Date(cs.clock_out), 'HH:mm') : 'ongoing'}`
          }));

          const { error: insertError } = await supabase
            .from('leave_cancellation_requests')
            .insert({
              family_id: familyId,
              time_entry_id: realId,
              requested_by: currentUserId,
              conflict_shift_ids: coverShifts.map(s => s.id),
              conflict_details: conflictDetails,
              status: 'pending'
            });

          if (insertError) throw insertError;

          toast({
            title: "Cancellation Request Submitted",
            description: `Cover shift conflict detected. Admin approval required to cancel leave and remove ${coverShifts.length} cover shift(s).`,
          });
        }
      } else if (sourceType === 'leave_request') {
        // For leave_requests (pending), just cancel directly
        const { error } = await supabase
          .from('leave_requests')
          .update({ status: 'cancelled' })
          .eq('id', realId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Leave request cancelled"
        });
      }

      await loadLeaveData();
      onScheduleRefresh?.();
    } catch (error) {
      console.error('Error deleting leave:', error);
      toast({
        title: "Error",
        description: "Failed to process leave cancellation",
        variant: "destructive"
      });
    }
  };

  const canEditEntry = (entry: LeaveEntry) => {
    if (userRole === 'family_viewer') return false;
    if (isAdmin) return true;
    return entry.carer_id === currentUserId;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin h-4 w-4" />
            Loading leave data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Leave Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upcoming' | 'taken')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {!isMobile && <span>Upcoming</span>}
            </TabsTrigger>
            <TabsTrigger value="taken" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {!isMobile && <span>Taken</span>}
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {isAdmin && carers.length > 0 && (
              <div>
                <Label htmlFor="carer-filter">Filter by Carer</Label>
                <Select 
                  value={filters.carer} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, carer: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All carers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-carers">All carers</SelectItem>
                    {carers.map(carer => (
                      <SelectItem key={carer.id} value={carer.id}>
                        {carer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="type-filter">Filter by Type</Label>
              <Select 
                value={filters.type} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">All types</SelectItem>
                  <SelectItem value="annual_leave">Annual Leave</SelectItem>
                  <SelectItem value="sickness">Sickness</SelectItem>
                  <SelectItem value="public_holiday">Public Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="upcoming" className="mt-4">
            {(() => {
              const { entries, total } = getFilteredLeave();
              return entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming leave scheduled
                </div>
              ) : (
                <div className="space-y-4">
                  <LeaveList 
                    entries={entries} 
                    showCarer={isAdmin} 
                    onEdit={handleEditLeaveType}
                    onDelete={handleDeleteLeave}
                    canEditEntry={canEditEntry}
                  />
                  {entries.length < total && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setUpcomingLimit(prev => prev + 10)}
                    >
                      Load more ({total - entries.length} remaining)
                    </Button>
                  )}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="taken" className="mt-4">
            {(() => {
              const { entries, total } = getFilteredLeave();
              return entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No leave taken yet
                </div>
              ) : (
                <div className="space-y-4">
                  <LeaveList 
                    entries={entries} 
                    showCarer={isAdmin} 
                    onEdit={handleEditLeaveType}
                    onDelete={handleDeleteLeave}
                    canEditEntry={canEditEntry}
                  />
                  {entries.length < total && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setTakenLimit(prev => prev + 10)}
                    >
                      Load older ({total - entries.length} remaining)
                    </Button>
                  )}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

        {/* Export Button */}
        {isAdmin && getFilteredLeave(false).entries.length > 0 && (
          <div className="pt-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Leave type options for edit dropdown
const leaveTypeOptions = [
  { value: 'annual_leave', label: 'Annual Leave' },
  { value: 'sickness', label: 'Sickness' },
  { value: 'public_holiday', label: 'Public Holiday' }
];

// Sub-component props
interface LeaveListProps {
  entries: LeaveEntry[];
  showCarer?: boolean;
  onEdit: (entryId: string, sourceType: 'leave_request' | 'time_entry', newShiftType: string) => void;
  onDelete: (entryId: string, sourceType: 'leave_request' | 'time_entry', entry: LeaveEntry) => void;
  canEditEntry: (entry: LeaveEntry) => boolean;
}

const getShiftTypeConfig = (shiftType: string) => {
  const typeConfig: Record<string, { bgClass: string; label: string }> = {
    'annual_leave': { bgClass: 'bg-yellow-500', label: 'Annual Leave' },
    'sickness': { bgClass: 'bg-red-500', label: 'Sickness' },
    'public_holiday': { bgClass: 'bg-purple-500', label: 'Public Holiday' },
    'leave': { bgClass: 'bg-muted', label: 'Leave' }
  };
  return typeConfig[shiftType] || { bgClass: 'bg-muted', label: shiftType.replace(/_/g, ' ') };
};

// Mobile card-based layout - compact sizing
const LeaveCardList = ({ entries, showCarer, onEdit, onDelete, canEditEntry }: LeaveListProps) => {
  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const canEdit = canEditEntry(entry);
        const config = getShiftTypeConfig(entry.shift_type);
        
        return (
          <div
            key={entry.id}
            className={`${config.bgClass} rounded-lg p-2 text-white`}
          >
            <div className="flex justify-between items-center gap-2">
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {showCarer && (
                  <span className="font-medium text-xs truncate">
                    {entry.carer_name}
                  </span>
                )}
                <span className="text-[10px] font-medium">{config.label}</span>
                <span className="text-[10px] opacity-90">
                  {format(new Date(entry.start_date), 'MMM d')}
                  {entry.start_date !== entry.end_date && (
                    <span> – {format(new Date(entry.end_date), 'MMM d')}</span>
                  )}
                </span>
              </div>
              {canEdit && (
                <div className="flex flex-col gap-1 shrink-0">
                  {entry.type === 'time_entry' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 bg-white/20 hover:bg-white/30 text-white"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {leaveTypeOptions.map((type) => (
                          <DropdownMenuItem
                            key={type.value}
                            onClick={() => onEdit(entry.id, entry.type, type.value)}
                            className="flex items-center justify-between"
                          >
                            {type.label}
                            {entry.shift_type === type.value && (
                              <Check className="h-4 w-4 ml-2" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 bg-white/20 hover:bg-white/30 text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Leave Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will revert the shift back to a basic shift and remove it from leave tracking. Continue?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(entry.id, entry.type, entry)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Desktop table layout
const LeaveTable = ({ entries, showCarer, onEdit, onDelete, canEditEntry }: LeaveListProps) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dates</TableHead>
            {showCarer && <TableHead>Carer</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const canEdit = canEditEntry(entry);
            const config = getShiftTypeConfig(entry.shift_type);
            
            return (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="font-medium">
                    {format(new Date(entry.start_date), 'MMM d, yyyy')}
                  </div>
                  {entry.start_date !== entry.end_date && (
                    <div className="text-sm text-muted-foreground">
                      to {format(new Date(entry.end_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </TableCell>
                {showCarer && (
                  <TableCell className="font-medium">{entry.carer_name}</TableCell>
                )}
                <TableCell>
                  <Badge className={`${config.bgClass} text-white`}>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      {entry.type === 'time_entry' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {leaveTypeOptions.map((type) => (
                              <DropdownMenuItem
                                key={type.value}
                                onClick={() => onEdit(entry.id, entry.type, type.value)}
                                className="flex items-center justify-between"
                              >
                                {type.label}
                                {entry.shift_type === type.value && (
                                  <Check className="h-4 w-4 ml-2" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Leave Entry</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will revert the shift back to a basic shift and remove it from leave tracking. Continue?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(entry.id, entry.type, entry)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

// Wrapper component that switches between mobile/desktop
const LeaveList = (props: LeaveListProps) => {
  const isMobile = useIsMobile();
  return isMobile ? <LeaveCardList {...props} /> : <LeaveTable {...props} />;
};
