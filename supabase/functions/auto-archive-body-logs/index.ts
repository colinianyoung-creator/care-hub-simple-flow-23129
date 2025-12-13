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
    console.log('🗄️ Starting auto-archive body logs job...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString();

    console.log(`📅 Archiving body logs older than: ${cutoffDate}`);

    // Update body logs older than 7 days to is_archived = true
    const { data, error, count } = await supabase
      .from('body_logs')
      .update({ is_archived: true })
      .eq('is_archived', false)
      .lt('incident_datetime', cutoffDate)
      .select('id');

    if (error) {
      console.error('❌ Error archiving body logs:', error);
      throw error;
    }

    const archivedCount = data?.length || 0;
    console.log(`✅ Successfully archived ${archivedCount} body log(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Archived ${archivedCount} body log(s) older than 7 days`,
        archivedCount,
        cutoffDate
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Auto-archive body logs error:', errorMessage);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
