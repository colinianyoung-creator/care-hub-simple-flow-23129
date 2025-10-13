import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns';

interface RecurringShiftGeneratorProps {
  familyId: string;
  assignments: any[];
}

export const RecurringShiftGenerator = ({ familyId, assignments }: RecurringShiftGeneratorProps) => {
  useEffect(() => {
    const generateFutureShifts = async () => {
      if (!assignments.length) return;

      try {
        const today = new Date();
        const currentWeekStart = startOfWeek(today);
        const futureWeekStart = addDays(currentWeekStart, 7);
        const futureWeekEnd = addDays(futureWeekStart, 6);

        for (const assignment of assignments) {
          if (!assignment.is_recurring || !assignment.active) continue;

          // Check if shifts already exist for next week
          const { data: existingShifts } = await supabase
            .from('shift_instances')
            .select('scheduled_date')
            .eq('shift_assignment_id', assignment.id)
            .gte('scheduled_date', format(futureWeekStart, 'yyyy-MM-dd'))
            .lte('scheduled_date', format(futureWeekEnd, 'yyyy-MM-dd'));

          if (existingShifts && existingShifts.length > 0) continue;

          // Generate shifts for the week
          const { error } = await supabase.rpc('generate_shift_instances', {
            _assignment_id: assignment.id,
            _start_date: format(futureWeekStart, 'yyyy-MM-dd'),
            _end_date: format(futureWeekEnd, 'yyyy-MM-dd')
          });

          if (error) {
            console.error('Error generating recurring shifts:', error);
          }
        }
      } catch (error) {
        console.error('Error in recurring shift generation:', error);
      }
    };

    // Generate shifts when component mounts and assignments change
    generateFutureShifts();
  }, [familyId, assignments]);

  return null; // This is a utility component that doesn't render anything
};