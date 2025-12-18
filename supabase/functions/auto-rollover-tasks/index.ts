import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringTask {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  recurrence_type: string;
  due_date: string | null;
  parent_task_id: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[auto-rollover-tasks] Starting weekly task rollover...');

    const today = new Date().toISOString().split('T')[0];
    
    // Find overdue recurring tasks that haven't been completed
    // These are tasks that are past their due date and still active
    const { data: overdueTasks, error: overdueError } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_recurring', true)
      .eq('completed', false)
      .eq('is_archived', false)
      .lt('due_date', today);

    if (overdueError) {
      console.error('[auto-rollover-tasks] Error fetching overdue tasks:', overdueError);
      throw overdueError;
    }

    console.log(`[auto-rollover-tasks] Found ${overdueTasks?.length || 0} overdue recurring tasks`);

    let archivedCount = 0;
    let createdCount = 0;

    for (const task of (overdueTasks || []) as RecurringTask[]) {
      console.log(`[auto-rollover-tasks] Processing overdue task: ${task.id} - ${task.title}`);
      
      // Archive the overdue task
      const { error: archiveError } = await supabase
        .from('tasks')
        .update({ 
          is_archived: true,
          completed: true  // Mark as completed (missed)
        })
        .eq('id', task.id);

      if (archiveError) {
        console.error(`[auto-rollover-tasks] Failed to archive task ${task.id}:`, archiveError);
        continue;
      }
      
      archivedCount++;

      // Calculate next visible_from based on recurrence type
      const nextVisibleFrom = calculateNextVisibleFrom(task.recurrence_type);
      const nextDueDate = calculateNextDueDate(task.due_date, task.recurrence_type);

      // Use the safe function to create next instance (includes duplicate check)
      const { data: result, error: createError } = await supabase.rpc(
        'create_recurring_task_instance',
        {
          _parent_task_id: task.parent_task_id || task.id,
          _family_id: task.family_id,
          _title: task.title,
          _description: task.description,
          _assigned_to: task.assigned_to,
          _created_by: task.created_by,
          _recurrence_type: task.recurrence_type,
          _next_due_date: nextDueDate,
          _visible_from: nextVisibleFrom
        }
      );

      if (createError) {
        console.error(`[auto-rollover-tasks] Failed to create next instance for ${task.id}:`, createError);
        continue;
      }

      if (result?.success) {
        createdCount++;
        console.log(`[auto-rollover-tasks] Created next instance for ${task.title}, visible from ${nextVisibleFrom}`);
      } else {
        console.log(`[auto-rollover-tasks] Skipped creating instance for ${task.title}: ${result?.reason}`);
      }
    }

    const summary = {
      success: true,
      processed_at: new Date().toISOString(),
      overdue_tasks_found: overdueTasks?.length || 0,
      tasks_archived: archivedCount,
      new_instances_created: createdCount
    };

    console.log('[auto-rollover-tasks] Rollover complete:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[auto-rollover-tasks] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper functions (duplicated from frontend for edge function context)
function calculateNextVisibleFrom(recurrenceType: string): string {
  const today = new Date();
  
  switch (recurrenceType) {
    case 'daily':
      return addDays(today, 1);
    case 'weekly':
      return getNextMonday(today);
    case 'monthly':
      return getFirstOfNextMonth(today);
    default:
      return addDays(today, 1);
  }
}

function calculateNextDueDate(currentDueDate: string | null, recurrenceType: string): string {
  const baseDate = currentDueDate ? new Date(currentDueDate) : new Date();
  
  switch (recurrenceType) {
    case 'daily':
      return addDays(baseDate, 1);
    case 'weekly':
      return addDays(baseDate, 7);
    case 'monthly':
      const nextMonth = new Date(baseDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return formatDate(nextMonth);
    default:
      return addDays(baseDate, 1);
  }
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return formatDate(result);
}

function getNextMonday(date: Date): string {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  result.setDate(result.getDate() + daysUntilMonday);
  return formatDate(result);
}

function getFirstOfNextMonth(date: Date): string {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(1);
  return formatDate(result);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
