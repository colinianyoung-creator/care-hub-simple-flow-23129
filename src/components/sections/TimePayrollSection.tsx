import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarView } from "../CalendarView";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import { format } from 'date-fns';

interface TimePayrollSectionProps {
  familyId: string;
  userRole: string;
}

export const TimePayrollSection = ({ familyId, userRole }: TimePayrollSectionProps) => {
  const { toast } = useToast();
  const [weeklyHours, setWeeklyHours] = useState(0);

  // Listen for export timesheet events from ActionMenu
  useEffect(() => {
    const handleExportTimesheets = () => {
      handleExportPayroll();
    };

    window.addEventListener('export-timesheets', handleExportTimesheets);
    return () => window.removeEventListener('export-timesheets', handleExportTimesheets);
  }, []);

  const loadWeeklyHours = async () => {
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('time_entries')
        .select('clock_in, clock_out')
        .eq('family_id', familyId)
        .gte('clock_in', startOfWeek.toISOString())
        .lte('clock_in', endOfWeek.toISOString())
        .not('clock_out', 'is', null);

      if (error) throw error;

      const totalHours = data?.reduce((total, entry) => {
        const start = new Date(entry.clock_in);
        const end = new Date(entry.clock_out);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0) || 0;

      setWeeklyHours(totalHours);
    } catch (error) {
      console.error('Error loading weekly hours:', error);
    }
  };

  const handleExportPayroll = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Call the export timesheet edge function
      const { data: response, error } = await supabase.functions.invoke('export-timesheet', {
        body: {
          familyId,
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString()
        }
      });

      if (error) throw error;

      // Create and download the CSV file
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `timesheet-${format(new Date(), 'yyyy-MM')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Timesheet exported",
        description: "The timesheet has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error exporting timesheet:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the timesheet.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadWeeklyHours();
  }, [familyId]);

  const canManagePayroll = userRole === 'family_admin' || userRole === 'disabled_person' || userRole === 'manager';

  return (
    <div className="space-y-6">
      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>This Week's Summary</span>
            <Badge variant="secondary">{weeklyHours.toFixed(1)} hours</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total hours logged this week</span>
            {canManagePayroll && (
              <Button onClick={handleExportPayroll} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Payroll
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <CalendarView familyId={familyId} userRole={userRole} />
    </div>
  );
};