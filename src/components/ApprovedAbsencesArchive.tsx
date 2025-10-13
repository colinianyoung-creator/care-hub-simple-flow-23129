import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ApprovedAbsencesArchiveProps {
  familyId: string;
  userRole: string;
  currentUserId?: string;
}

interface ApprovedAbsence {
  id: string;
  date: string;
  carer_name: string;
  carer_id: string;
  type: string;
  hours: number;
  notes?: string;
  created_at: string;
}

export const ApprovedAbsencesArchive = ({ familyId, userRole, currentUserId }: ApprovedAbsencesArchiveProps) => {
  const [absences, setAbsences] = useState<ApprovedAbsence[]>([]);
  const [filteredAbsences, setFilteredAbsences] = useState<ApprovedAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    carer: 'all-carers',
    type: 'all-types',
    startDate: '',
    endDate: ''
  });
  const [carers, setCarers] = useState<Array<{id: string, name: string}>>([]);
  const { toast } = useToast();

  const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person';
  const isCarer = userRole === 'carer';
  const canExport = isAdmin;

  const leaveTypes = [
    { value: 'annual_leave', label: 'Annual Leave', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'sickness', label: 'Sickness', color: 'bg-red-100 text-red-800' },
    { value: 'public_holiday', label: 'Public Holiday', color: 'bg-blue-100 text-blue-800' }
  ];

  useEffect(() => {
    loadApprovedAbsences();
  }, [familyId, userRole, currentUserId]);

  useEffect(() => {
    applyFilters();
  }, [absences, filters]);

  const loadApprovedAbsences = async () => {
    try {
      setLoading(true);
      
      // Get approved leave requests
      const { data: leaveRequests, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'approved')
        .order('date', { ascending: false });

      if (error) throw error;

      // Get carer profiles for the leave requests
      const carerIds = leaveRequests?.map(leave => leave.carer_id).filter(Boolean) || [];
      let carerProfiles: any[] = [];
      
      if (carerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', carerIds);
        carerProfiles = profiles || [];
      }

      // Transform data with carer names
      const transformedData = (leaveRequests || []).map(request => ({
        id: request.id,
        date: request.date,
        carer_id: request.carer_id,
        carer_name: carerProfiles.find(p => p.id === request.carer_id)?.full_name || 'Unknown Carer',
        type: request.type,
        hours: request.hours,
        notes: request.notes,
        created_at: request.created_at
      }));

      // Filter for carers if they're not admin
      const filteredData = isCarer && currentUserId 
        ? transformedData.filter(absence => absence.carer_id === currentUserId)
        : transformedData;

      setAbsences(filteredData);

      // Extract unique carers for filter dropdown
      const uniqueCarers = Array.from(new Set(transformedData.map(a => a.carer_id)))
        .map(carerId => {
          const absence = transformedData.find(a => a.carer_id === carerId);
          return {
            id: carerId,
            name: absence?.carer_name || 'Unknown Carer'
          };
        });
      setCarers(uniqueCarers);

    } catch (error) {
      console.error('Error loading approved absences:', error);
      toast({
        title: "Error",
        description: "Failed to load approved absences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...absences];

    if (filters.carer && filters.carer !== 'all-carers') {
      filtered = filtered.filter(absence => absence.carer_id === filters.carer);
    }

    if (filters.type && filters.type !== 'all-types') {
      filtered = filtered.filter(absence => absence.type === filters.type);
    }

    if (filters.startDate) {
      filtered = filtered.filter(absence => absence.date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter(absence => absence.date <= filters.endDate);
    }

    setFilteredAbsences(filtered);
  };

  const exportToCSV = () => {
    if (!canExport) return;

    const headers = ['Date', 'Carer', 'Type', 'Hours', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...filteredAbsences.map(absence => [
        absence.date,
        `"${absence.carer_name}"`,
        absence.type.replace('_', ' '),
        absence.hours,
        `"${absence.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `approved-absences-${familyId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Approved absences exported to CSV",
    });
  };

  const getTypeConfig = (type: string) => {
    return leaveTypes.find(t => t.value === type) || { 
      value: type, 
      label: type.replace('_', ' '), 
      color: 'bg-gray-100 text-gray-800' 
    };
  };

  const getTotalHours = () => {
    return filteredAbsences.reduce((total, absence) => total + absence.hours, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approved Absences Archive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading approved absences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle>Approved Absences Archive</CardTitle>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(isAdmin || carers.length > 1) && (
            <div>
              <Label htmlFor="carer-filter">Filter by Carer</Label>
              <Select value={filters.carer} onValueChange={(value) => setFilters(prev => ({ ...prev, carer: value }))}>
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
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">All types</SelectItem>
                {leaveTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start-date">From Date</Label>
            <Input
              id="start-date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="end-date">To Date</Label>
            <Input
              id="end-date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredAbsences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No approved absences found
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredAbsences.length} approved absence{filteredAbsences.length !== 1 ? 's' : ''} 
              • Total Hours: {getTotalHours().toFixed(1)}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {(isAdmin || carers.length > 1) && <TableHead>Carer</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.map((absence) => {
                    const typeConfig = getTypeConfig(absence.type);
                    return (
                      <TableRow key={absence.id}>
                        <TableCell>{format(new Date(absence.date), 'MMM d, yyyy')}</TableCell>
                        {(isAdmin || carers.length > 1) && (
                          <TableCell className="font-medium">{absence.carer_name}</TableCell>
                        )}
                        <TableCell>
                          <Badge variant="secondary" className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{absence.hours}h</TableCell>
                        <TableCell className="text-muted-foreground">
                          {absence.notes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
        </TableBody>
      </Table>
    </div>
    
    
    {/* Export Button */}
    {canExport && filteredAbsences.length > 0 && (
      <div className="mt-4">
        <Button onClick={exportToCSV} variant="outline" className="w-full md:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};