import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[auto-cleanup-tasks] Starting cleanup of old completed tasks...');

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    console.log(`[auto-cleanup-tasks] Deleting tasks completed before: ${cutoffDate}`);

    // Delete completed tasks older than 7 days
    const { data: deletedTasks, error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('completed', true)
      .lt('updated_at', cutoffDate)
      .select('id, title');

    if (deleteError) {
      console.error('[auto-cleanup-tasks] Error deleting old tasks:', deleteError);
      throw deleteError;
    }

    const deletedCount = deletedTasks?.length || 0;
    
    console.log(`[auto-cleanup-tasks] Deleted ${deletedCount} old completed tasks`);
    
    if (deletedTasks && deletedTasks.length > 0) {
      console.log('[auto-cleanup-tasks] Deleted tasks:', deletedTasks.map(t => t.title).join(', '));
    }

    const summary = {
      success: true,
      processed_at: new Date().toISOString(),
      cutoff_date: cutoffDate,
      tasks_deleted: deletedCount
    };

    console.log('[auto-cleanup-tasks] Cleanup complete:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[auto-cleanup-tasks] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
