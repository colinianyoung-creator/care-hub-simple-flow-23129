import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { familyId, startDate, endDate } = await req.json();

    if (!familyId || !startDate || !endDate) {
      throw new Error('Missing required parameters');
    }

    console.log('Exporting MAR for family:', familyId, 'from', startDate, 'to', endDate);

    // Fetch MAR entries
    const { data, error } = await supabaseClient.rpc('get_mar_entries_for_family', {
      _family_id: familyId,
      _start: startDate,
      _end: endDate
    });

    if (error) {
      console.error('Error fetching MAR entries:', error);
      throw error;
    }

    console.log('Found', data?.length || 0, 'MAR entries');

    // Generate CSV
    const headers = [
      'Date',
      'Time',
      'Medication',
      'Dosage',
      'Scheduled Time',
      'Administered Time',
      'Dose Given',
      'Status',
      'Administered By',
      'Notes'
    ];

    const rows = (data || []).map((entry: any) => {
      const scheduledDate = new Date(entry.scheduled_time);
      const administeredTime = entry.administered_time 
        ? new Date(entry.administered_time).toLocaleTimeString()
        : '';

      return [
        scheduledDate.toLocaleDateString(),
        scheduledDate.toLocaleTimeString(),
        entry.medication_name || '',
        entry.medication_dosage || '',
        scheduledDate.toLocaleTimeString(),
        administeredTime,
        entry.dose_given || '',
        entry.status || '',
        entry.carer_name || '',
        (entry.notes || '').replace(/"/g, '""') // Escape quotes
      ].map(field => `"${field}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="MAR_export_${new Date().toISOString()}.csv"`
      }
    });

  } catch (error) {
    console.error('Error in export-mar function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
