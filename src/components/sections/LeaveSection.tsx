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
  const { toast } = useToast();

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

  const getFilteredLeave = () => {
    const today = startOfDay(new Date());
    let filtered = [...leaveEntries];

    // Filter by upcoming/taken
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(entry => {
        const startDate = new Date(entry.start_date);
        return isAfter(startDate, today) || format(startDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
      });
    } else {
      filtered = filtered.filter(entry => {
        const endDate = new Date(entry.end_date);
        return isBefore(endDate, today);
      });
    }

    // Filter by carer
    if (filters.carer && filters.carer !== 'all-carers') {
      filtered = filtered.filter(entry => entry.carer_id === filters.carer);
    }

    // Filter by type
    if (filters.type && filters.type !== 'all-types') {
      filtered = filtered.filter(entry => entry.shift_type === filters.type);
    }

    return filtered;
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
    const data = getFilteredLeave();
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

  const handleDeleteLeave = async (entryId: string, sourceType: 'leave_request' | 'time_entry') => {
    try {
      const realId = entryId.replace(/^(leave-|time-)/, '');

      if (sourceType === 'time_entry') {
        // Revert to basic shift
        const { error } = await supabase
          .from('time_entries')
          .update({ shift_type: 'basic' })
          .eq('id', realId);

        if (error) throw error;
      } else if (sourceType === 'leave_request') {
        // Cancel the leave request
        const { error } = await supabase
          .from('leave_requests')
          .update({ status: 'cancelled' })
          .eq('id', realId);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Leave reverted to basic shift"
      });

      await loadLeaveData();
      onScheduleRefresh?.();
    } catch (error) {
      console.error('Error deleting leave:', error);
      toast({
        title: "Error",
        description: "Failed to delete leave",
        variant: "destructive"
      });
    }
  };

  const canEditEntry = (entry: LeaveEntry) => {
    if (userRole === 'family_viewer') return false;
    if (isAdmin) return true;
    return entry.carer_id === currentUserId;
  };

  const filteredData = getFilteredLeave();

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
              <span>Upcoming</span>
            </TabsTrigger>
            <TabsTrigger value="taken" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span>Taken</span>
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
            {filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No upcoming leave scheduled
              </div>
            ) : (
              <LeaveTable 
                entries={filteredData} 
                showCarer={isAdmin} 
                onEdit={handleEditLeaveType}
                onDelete={handleDeleteLeave}
                canEditEntry={canEditEntry}
              />
            )}
          </TabsContent>

          <TabsContent value="taken" className="mt-4">
            {filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No leave taken yet
              </div>
            ) : (
              <LeaveTable 
                entries={filteredData} 
                showCarer={isAdmin} 
                onEdit={handleEditLeaveType}
                onDelete={handleDeleteLeave}
                canEditEntry={canEditEntry}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Export Button */}
        {isAdmin && filteredData.length > 0 && (
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

// Sub-component for the table
interface LeaveTableProps {
  entries: LeaveEntry[];
  showCarer: boolean;
  onEdit: (entryId: string, sourceType: 'leave_request' | 'time_entry', newShiftType: string) => void;
  onDelete: (entryId: string, sourceType: 'leave_request' | 'time_entry') => void;
  canEditEntry: (entry: LeaveEntry) => boolean;
}

const LeaveTable = ({ entries, showCarer, onEdit, onDelete, canEditEntry }: LeaveTableProps) => {
  const leaveTypes = [
    { value: 'annual_leave', label: 'Annual Leave' },
    { value: 'sickness', label: 'Sickness' },
    { value: 'public_holiday', label: 'Public Holiday' }
  ];

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
                  {getShiftTypeBadge(entry.shift_type)}
                </TableCell>
                <TableCell>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      {/* Edit Button - only for time_entry type */}
                      {entry.type === 'time_entry' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {leaveTypes.map((type) => (
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

                      {/* Delete Button */}
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
                            <AlertDialogAction onClick={() => onDelete(entry.id, entry.type)}>
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
