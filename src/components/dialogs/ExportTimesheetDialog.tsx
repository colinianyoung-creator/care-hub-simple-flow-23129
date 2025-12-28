import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Download, FileText, FileSpreadsheet, Upload, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, addWeeks, isSameMonth } from 'date-fns';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ExportTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  userRole: string;
}

interface CarerOption {
  user_id: string;
  full_name: string;
}

interface WeekData {
  weekEnding: string;
  basic: number;
  cover: number;
  annual_leave: number;
  public_holiday: number;
  sickness: number;
}

interface TimesheetData {
  employerName: string;
  employeeName: string;
  periodEnding: string;
  weeks: WeekData[];
  totals: {
    basic: number;
    cover: number;
    annual_leave: number;
    public_holiday: number;
    sickness: number;
  };
}

interface SignatureData {
  employerSignature: string | null;
  employeeSignature: string | null;
}

export const ExportTimesheetDialog = ({ open, onOpenChange, familyId, userRole }: ExportTimesheetDialogProps) => {
  const { toast } = useToast();
  const [timeframe, setTimeframe] = useState('this_month');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(false);
  const [timesheetData, setTimesheetData] = useState<TimesheetData | null>(null);
  const [signatures, setSignatures] = useState<SignatureData>({
    employerSignature: null,
    employeeSignature: null
  });
  const [uploadingSignature, setUploadingSignature] = useState<'employer' | 'employee' | null>(null);
  const [availableCarers, setAvailableCarers] = useState<CarerOption[]>([]);
  const [selectedCarerId, setSelectedCarerId] = useState<string>('');

  useEffect(() => {
    setDefaultDateRange();
  }, []);

  useEffect(() => {
    if (open && familyId) {
      loadCarers();
    }
  }, [open, familyId]);

  useEffect(() => {
    if (open && familyId && selectedCarerId) {
      loadPreviewData();
      loadSignatures();
    }
  }, [open, familyId, startDate, endDate, selectedCarerId]);

  const setDefaultDateRange = () => {
    const now = new Date();
    setStartDate(startOfMonth(now));
    setEndDate(endOfMonth(now));
  };

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    const now = new Date();
    
    if (value === 'this_month') {
      setStartDate(startOfMonth(now));
      setEndDate(endOfMonth(now));
    } else if (value === 'last_month') {
      const lastMonth = subMonths(now, 1);
      setStartDate(startOfMonth(lastMonth));
      setEndDate(endOfMonth(lastMonth));
    }
  };

  const loadCarers = async () => {
    try {
      // Load registered carers
      const { data: familyMembers } = await supabase
        .from('user_memberships')
        .select(`
          user_id,
          role,
          profiles!inner(full_name)
        `)
        .eq('family_id', familyId)
        .eq('role', 'carer');

      const registeredCarers = familyMembers?.map(m => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name || 'Unnamed Carer'
      })) || [];

      // Load placeholder carers (unlinked only)
      const { data: placeholderCarers } = await supabase
        .from('placeholder_carers')
        .select('id, full_name')
        .eq('family_id', familyId)
        .eq('is_linked', false);

      const placeholders = placeholderCarers?.map(pc => ({
        user_id: `placeholder_${pc.id}`,
        full_name: `${pc.full_name} (awaiting signup)`
      })) || [];

      const allCarers = [...registeredCarers, ...placeholders];
      setAvailableCarers(allCarers);

      // Set default selected carer
      const isAdmin = userRole === 'family_admin' || userRole === 'disabled_person' || userRole === 'manager';
      if (!isAdmin) {
        // Non-admin: select current user if they're a carer
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const currentUserCarer = registeredCarers.find(c => c.user_id === user.id);
          if (currentUserCarer) {
            setSelectedCarerId(currentUserCarer.user_id);
          }
        }
      } else {
        // Admin: select first available carer (prefer registered)
        if (allCarers.length > 0) {
          setSelectedCarerId(allCarers[0].user_id);
        }
      }
    } catch (error) {
      console.error('Error loading carers:', error);
    }
  };

  const loadPreviewData = async () => {
    if (!selectedCarerId) return;
    
    try {
      setLoading(true);
      
      // Get employer and employee names
      const { data: familyMembers } = await supabase
        .from('user_memberships')
        .select(`
          user_id,
          role,
          profiles!inner(full_name)
        `)
        .eq('family_id', familyId)
        .in('role', ['family_admin', 'disabled_person', 'carer']);

      const employer = familyMembers?.find(m => m.role === 'disabled_person' || m.role === 'family_admin');
      const targetEmployee = familyMembers?.find(m => m.user_id === selectedCarerId && m.role === 'carer');

      // Get shift instances and time entries for the date range
      const shiftQuery = supabase
        .rpc('get_shift_instances_with_names', {
          _family_id: familyId,
          _start_date: format(startDate, 'yyyy-MM-dd'),
          _end_date: format(endDate, 'yyyy-MM-dd')
        });
      
      const timeQuery = supabase
        .from('time_entries')
        .select('clock_in, clock_out, user_id, notes, shift_type')
        .eq('family_id', familyId)
        .eq('user_id', selectedCarerId)
        .gte('clock_in', startDate.toISOString())
        .lte('clock_in', endDate.toISOString())
        .not('clock_out', 'is', null);
      
      const { data: timeEntries, error: timeError } = await timeQuery;
      if (timeError) throw timeError;

      // Get shift instances for the period - filter by selected carer
      const { data: allShiftInstances, error: shiftError } = await shiftQuery;
      const shiftInstances = allShiftInstances?.filter(shift => shift.carer_id === selectedCarerId) || [];
      if (shiftError) throw shiftError;

      // Get leave requests for the date range  
      const leaveQuery = supabase
        .from('leave_requests')
        .select('start_date, end_date, reason, user_id')
        .eq('family_id', familyId)
        .eq('user_id', selectedCarerId)
        .eq('status', 'approved')
        .gte('start_date', format(startDate, 'yyyy-MM-dd'))
        .lte('start_date', format(endDate, 'yyyy-MM-dd'));
      
      const { data: leaveRequests, error: leaveError } = await leaveQuery;
      if (leaveError) throw leaveError;

      // Generate Sunday-ending weeks for the period
      const weeks = generateSundayWeeks(startDate, endDate);
      
      // Process data into timesheet format
      const weekData = weeks.map(weekEndingDate => {
        // Fix date boundary: set weekEnding to end of day (23:59:59) to include full day
        const weekEnding = new Date(weekEndingDate);
        weekEnding.setHours(23, 59, 59, 999);
        
        const weekStart = new Date(weekEndingDate);
        weekStart.setDate(weekStart.getDate() - 6); // Sunday to Saturday week
        weekStart.setHours(0, 0, 0, 0); // Start at beginning of day
        
        // Calculate time entry hours for this week
        const weekTimeEntries = timeEntries?.filter(entry => {
          const entryDate = new Date(entry.clock_in);
          return entryDate >= weekStart && entryDate <= weekEnding;
        }) || [];
        
        // Calculate shift instance hours for this week  
        const weekShiftInstances = shiftInstances?.filter(shift => {
          const shiftDate = new Date(shift.scheduled_date);
          return shiftDate >= weekStart && shiftDate <= weekEnding;
        }) || [];
        
        // Calculate leave hours for this week (estimate 8 hours per day if not specified)
        const weekLeaveRequests = leaveRequests?.filter(request => {
          const requestDate = new Date(request.start_date);
          return requestDate >= weekStart && requestDate <= weekEnding;
        }) || [];
        
        // Helper function to calculate hours by shift type from time entries
        const calculateHoursByShiftType = (entries: any[], targetType: string) => {
          return entries
            .filter(entry => entry.shift_type === targetType)
            .reduce((total, entry) => {
              if (entry.clock_in && entry.clock_out) {
                const start = new Date(entry.clock_in);
                const end = new Date(entry.clock_out);
                return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              }
              return total;
            }, 0);
        };
        
        // Helper function to calculate hours from shift_instances that DON'T have time_entries
        // This prevents double-counting while capturing scheduled shifts
        const calculateShiftInstanceHours = (instances: any[], targetType: string) => {
          return instances
            .filter(shift => shift.shift_type === targetType)
            .filter(shift => {
              // Check if this shift_instance already has a time_entry (avoid double count)
              const shiftDate = format(new Date(shift.scheduled_date), 'yyyy-MM-dd');
              const hasTimeEntry = weekTimeEntries.some(entry => {
                const entryDate = format(new Date(entry.clock_in), 'yyyy-MM-dd');
                return entryDate === shiftDate && entry.shift_type === targetType;
              });
              return !hasTimeEntry; // Only count if no time_entry exists
            })
            .reduce((total, shift) => {
              if (shift.start_time && shift.end_time) {
                const start = new Date(`2000-01-01T${shift.start_time}`);
                const end = new Date(`2000-01-01T${shift.end_time}`);
                return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
              }
              return total;
            }, 0);
        };
        
        // Calculate hours from time_entries + unmatched shift_instances
        const basic = calculateHoursByShiftType(weekTimeEntries, 'basic') 
          + calculateShiftInstanceHours(weekShiftInstances, 'basic');
        const cover = calculateHoursByShiftType(weekTimeEntries, 'cover')
          + calculateShiftInstanceHours(weekShiftInstances, 'cover');
          
        // Calculate leave hours from time_entries + unmatched shift_instances
        let annual_leave = calculateHoursByShiftType(weekTimeEntries, 'annual_leave')
          + calculateShiftInstanceHours(weekShiftInstances, 'annual_leave');
        let public_holiday = calculateHoursByShiftType(weekTimeEntries, 'public_holiday')
          + calculateShiftInstanceHours(weekShiftInstances, 'public_holiday');
        let sickness = calculateHoursByShiftType(weekTimeEntries, 'sickness')
          + calculateShiftInstanceHours(weekShiftInstances, 'sickness');
        
        // Only add leave_requests hours as fallback if NO time_entries or shift_instances exist
        if (annual_leave === 0) {
          annual_leave += weekLeaveRequests
            .filter(req => req.reason?.toLowerCase().includes('annual'))
            .reduce((total, req) => total + 8, 0);
        }
        
        if (public_holiday === 0) {
          public_holiday += weekLeaveRequests
            .filter(req => req.reason?.toLowerCase().includes('holiday') && !req.reason?.toLowerCase().includes('annual'))
            .reduce((total, req) => total + 8, 0);
        }
        
        if (sickness === 0) {
          sickness += weekLeaveRequests
            .filter(req => req.reason?.toLowerCase().includes('sick'))
            .reduce((total, req) => total + 8, 0);
        }
        
        return {
          weekEnding: format(weekEndingDate, 'dd/MM/yyyy'),
          basic: Math.round(basic * 100) / 100,
          cover: Math.round(cover * 100) / 100,
          annual_leave: Math.round(annual_leave * 100) / 100,
          public_holiday: Math.round(public_holiday * 100) / 100,
          sickness: Math.round(sickness * 100) / 100,
        };
      });

      // Calculate totals
      const totals = weekData.reduce(
        (acc, week) => ({
          basic: acc.basic + week.basic,
          cover: acc.cover + week.cover,
          annual_leave: acc.annual_leave + week.annual_leave,
          public_holiday: acc.public_holiday + week.public_holiday,
          sickness: acc.sickness + week.sickness,
        }),
        { basic: 0, cover: 0, annual_leave: 0, public_holiday: 0, sickness: 0 }
      );

      setTimesheetData({
        employerName: employer?.profiles?.full_name || 'Employer',
        employeeName: targetEmployee?.profiles?.full_name || 'Employee',
        periodEnding: format(endDate, 'dd/MM/yyyy'),
        weeks: weekData,
        totals
      });

    } catch (error) {
      console.error('Error loading preview data:', error);
      toast({
        title: "Error loading data",
        description: "There was an error loading the timesheet data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSundayWeeks = (start: Date, end: Date) => {
    const weeks: Date[] = [];
    let current = new Date(start);
    
    // Find first Sunday of the period
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0) {
      current.setDate(current.getDate() + (7 - dayOfWeek));
    }
    
    // Generate all Sundays until end date
    while (current <= end) {
      weeks.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    
    // Ensure we have at least 5 weeks for the template
    while (weeks.length < 5) {
      weeks.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    
    return weeks.slice(0, 5); // Limit to 5 weeks max
  };

  const loadSignatures = async () => {
    try {
      const { data: employerSignature, error: employerError } = await supabase.storage
        .from('timesheet-signatures')
        .list(`${familyId}/employer`);
      
      const { data: employeeSignature, error: employeeError } = await supabase.storage
        .from('timesheet-signatures')
        .list(`${familyId}/employee`);

      if (employerError) {
        console.error('Error loading employer signature:', employerError);
      } else if (employerSignature && employerSignature.length > 0) {
        // Use signed URL for private bucket (1 hour expiry)
        const { data, error } = await supabase.storage
          .from('timesheet-signatures')
          .createSignedUrl(`${familyId}/employer/${employerSignature[0].name}`, 3600);
        if (!error && data?.signedUrl) {
          setSignatures(prev => ({ ...prev, employerSignature: data.signedUrl }));
        }
      }

      if (employeeError) {
        console.error('Error loading employee signature:', employeeError);
      } else if (employeeSignature && employeeSignature.length > 0) {
        // Use signed URL for private bucket (1 hour expiry)
        const { data, error } = await supabase.storage
          .from('timesheet-signatures')
          .createSignedUrl(`${familyId}/employee/${employeeSignature[0].name}`, 3600);
        if (!error && data?.signedUrl) {
          setSignatures(prev => ({ ...prev, employeeSignature: data.signedUrl }));
        }
      }
    } catch (error) {
      console.error('Error loading signatures:', error);
    }
  };

  const handleSignatureUpload = async (file: File, type: 'employer' | 'employee') => {
    try {
      setUploadingSignature(type);
      
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PNG, JPEG, or GIF image.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      // Delete existing signature first
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('timesheet-signatures')
        .list(`${familyId}/${type}`);
      
      if (listError) {
        console.error('Error listing existing files:', listError);
      }
      
      if (existingFiles && existingFiles.length > 0) {
        const { error: removeError } = await supabase.storage
          .from('timesheet-signatures')
          .remove([`${familyId}/${type}/${existingFiles[0].name}`]);
          
        if (removeError) {
          console.error('Error removing existing file:', removeError);
        }
      }

      // Upload new signature
      const fileName = `signature_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from('timesheet-signatures')
        .upload(`${familyId}/${type}/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get signed URL for private bucket (1 hour expiry)
      const { data, error: signedUrlError } = await supabase.storage
        .from('timesheet-signatures')
        .createSignedUrl(`${familyId}/${type}/${fileName}`, 3600);

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        throw signedUrlError;
      }

      setSignatures(prev => ({ ...prev, [`${type}Signature`]: data.signedUrl }));
      
      toast({
        title: "Signature uploaded",
        description: `${type === 'employer' ? 'Employer' : 'Employee'} signature uploaded successfully.`,
      });
    } catch (error) {
      console.error('Error uploading signature:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Upload failed",
        description: `Failed to upload signature: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setUploadingSignature(null);
    }
  };

  const removeSignature = async (type: 'employer' | 'employee') => {
    try {
      const { data: existingFiles } = await supabase.storage
        .from('timesheet-signatures')
        .list(`${familyId}/${type}`);
      
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('timesheet-signatures')
          .remove([`${familyId}/${type}/${existingFiles[0].name}`]);
      }

      setSignatures(prev => ({ ...prev, [`${type}Signature`]: null }));
      
      toast({
        title: "Signature removed",
        description: `${type === 'employer' ? 'Employer' : 'Employee'} signature removed successfully.`,
      });
    } catch (error) {
      console.error('Error removing signature:', error);
    }
  };

  const trackExport = async (exportFormat: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine if this is a placeholder carer
      const isPlaceholder = selectedCarerId.startsWith('placeholder_');
      const actualCarerId = isPlaceholder ? null : selectedCarerId;
      const placeholderCarerId = isPlaceholder ? selectedCarerId.replace('placeholder_', '') : null;

      await supabase.from('timesheet_exports').insert({
        family_id: familyId,
        carer_id: actualCarerId,
        placeholder_carer_id: placeholderCarerId,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        exported_by: user.id,
        format: exportFormat
      });
    } catch (error) {
      console.error('Error tracking export:', error);
      // Don't fail the export if tracking fails
    }
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel') => {
    if (!timesheetData) {
      toast({
        title: "No data",
        description: "Please wait for timesheet data to load before exporting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`https://ydfqtfutdziejjqnqudo.supabase.co/functions/v1/export-timesheet`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          familyId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format: exportFormat,
          timesheetData,
          signatures,
          exportDate: format(new Date(), 'dd/MM/yyyy')
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Get the file content
      let blob: Blob;
      let fileName: string;
      
      if (exportFormat === 'pdf') {
        // For PDF, we get HTML content that browser can print as PDF
        const htmlContent = await response.text();
        blob = new Blob([htmlContent], { type: 'text/html' });
        fileName = `monthly-timesheet-${format(endDate, 'yyyy-MM')}.html`;
      } else {
        // For Excel, we get CSV content
        const csvContent = await response.text();
        blob = new Blob([csvContent], { type: 'text/csv' });
        fileName = `monthly-timesheet-${format(endDate, 'yyyy-MM')}.csv`;
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Track the export in the database
      await trackExport(exportFormat);

      toast({
        title: "Timesheet exported",
        description: exportFormat === 'pdf' 
          ? "HTML file downloaded. Open it in your browser and use Ctrl+P to save as PDF."
          : "CSV file downloaded. Open in Excel or other spreadsheet software.",
      });
    } catch (error) {
      console.error('Error exporting timesheet:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "There was an error exporting the timesheet.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Monthly Timesheet</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Carer Selection */}
          <div>
            <label className="text-sm font-medium">Select Carer</label>
            <Select value={selectedCarerId} onValueChange={setSelectedCarerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a carer" />
              </SelectTrigger>
              <SelectContent>
                {availableCarers.map((carer) => (
                  <SelectItem key={carer.user_id} value={carer.user_id}>
                    {carer.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Timeframe</label>
              <Select value={timeframe} onValueChange={handleTimeframeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => date && setStartDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={(date) => date && setEndDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Signature Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Employer Signature</Label>
              {signatures.employerSignature ? (
                <div className="relative">
                  <img src={signatures.employerSignature} alt="Employer signature" className="max-h-20 border rounded" />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={() => removeSignature('employer')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSignatureUpload(file, 'employer');
                    }}
                    disabled={uploadingSignature === 'employer'}
                    className="hidden"
                    id="employer-signature"
                  />
                  <Label htmlFor="employer-signature" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {uploadingSignature === 'employer' ? 'Uploading...' : 'Upload employer signature'}
                    </p>
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Employee Signature</Label>
              {signatures.employeeSignature ? (
                <div className="relative">
                  <img src={signatures.employeeSignature} alt="Employee signature" className="max-h-20 border rounded" />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={() => removeSignature('employee')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSignatureUpload(file, 'employee');
                    }}
                    disabled={uploadingSignature === 'employee'}
                    className="hidden"
                    id="employee-signature"
                  />
                  <Label htmlFor="employee-signature" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {uploadingSignature === 'employee' ? 'Uploading...' : 'Upload employee signature'}
                    </p>
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Timesheet Preview */}
          {loading ? (
            <div className="text-center py-8">Loading timesheet data...</div>
          ) : timesheetData ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-center">Monthly Timesheet</CardTitle>
                <div className="text-center space-y-1 text-sm">
                  <p><strong>Employer:</strong> {timesheetData.employerName}</p>
                  <p><strong>Employee:</strong> {timesheetData.employeeName}</p>
                  <p><strong>Period Ending:</strong> {timesheetData.periodEnding}</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="border border-gray-300">Date</TableHead>
                        <TableHead className="border border-gray-300 text-center">Basic Shifts</TableHead>
                        <TableHead className="border border-gray-300 text-center">Cover</TableHead>
                        <TableHead className="border border-gray-300 text-center">Annual Leave</TableHead>
                        <TableHead className="border border-gray-300 text-center">Public Holiday</TableHead>
                        <TableHead className="border border-gray-300 text-center">Sickness</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timesheetData.weeks.map((week, index) => (
                        <TableRow key={index}>
                          <TableCell className="border border-gray-300">{week.weekEnding}</TableCell>
                          <TableCell className="border border-gray-300 text-center">{week.basic.toFixed(1)}</TableCell>
                          <TableCell className="border border-gray-300 text-center">{week.cover.toFixed(1)}</TableCell>
                          <TableCell className="border border-gray-300 text-center">{week.annual_leave.toFixed(1)}</TableCell>
                          <TableCell className="border border-gray-300 text-center">{week.public_holiday.toFixed(1)}</TableCell>
                          <TableCell className="border border-gray-300 text-center">{week.sickness.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-semibold">
                        <TableCell className="border border-gray-300">Total</TableCell>
                        <TableCell className="border border-gray-300 text-center">{timesheetData.totals.basic.toFixed(1)}</TableCell>
                        <TableCell className="border border-gray-300 text-center">{timesheetData.totals.cover.toFixed(1)}</TableCell>
                        <TableCell className="border border-gray-300 text-center">{timesheetData.totals.annual_leave.toFixed(1)}</TableCell>
                        <TableCell className="border border-gray-300 text-center">{timesheetData.totals.public_holiday.toFixed(1)}</TableCell>
                        <TableCell className="border border-gray-300 text-center">{timesheetData.totals.sickness.toFixed(1)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Signature Section Preview */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">Signature of Employer:</p>
                    {signatures.employerSignature && (
                      <img src={signatures.employerSignature} alt="Employer signature" className="max-h-12 mx-auto" />
                    )}
                    <div className="border-b border-gray-300 mt-2"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">Signature of Employee:</p>
                    {signatures.employeeSignature && (
                      <img src={signatures.employeeSignature} alt="Employee signature" className="max-h-12 mx-auto" />
                    )}
                    <div className="border-b border-gray-300 mt-2"></div>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2">Date:</p>
                    <p className="text-sm">{format(new Date(), 'dd/MM/yyyy')}</p>
                    <div className="border-b border-gray-300 mt-2"></div>
                  </div>
                </div>
                
                {/* Disclaimer in preview */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs text-center text-muted-foreground">
                    This timesheet is a generic template generated by CareHub. It is not associated with any council or employer.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Select a date range to view timesheet preview.</p>
              </CardContent>
            </Card>
          )}

          {/* Export Options */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button 
              onClick={() => handleExport('pdf')} 
              disabled={loading || !timesheetData}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button 
              onClick={() => handleExport('excel')} 
              disabled={loading || !timesheetData}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground text-center p-4 bg-gray-50 rounded">
            <p>This timesheet is a generic template generated by CareHub. It is not associated with any council or employer.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};