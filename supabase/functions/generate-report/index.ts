import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract and verify JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const { familyId, dateRangeStart, dateRangeEnd, careRecipientName } = await req.json();

    console.log('Generate report request:', { familyId, dateRangeStart, dateRangeEnd, careRecipientName });

    if (!familyId || !dateRangeStart || !dateRangeEnd || !careRecipientName) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role for data access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT token and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Invalid token or user not found:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user is a member of the requested family
    const { data: membership, error: membershipError } = await supabase
      .from('user_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .maybeSingle();

    if (membershipError || !membership) {
      console.error('User not authorized for this family:', user.id, familyId);
      return new Response(JSON.stringify({ error: 'Forbidden: You do not have access to this family' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authorized:', user.id, 'for family:', familyId);

    // Fetch all relevant care data
    const [careNotesResult, bodyLogsResult, dietEntriesResult, marDosesResult, tasksResult] = await Promise.all([
      supabase
        .from('care_notes')
        .select('*')
        .eq('family_id', familyId)
        .gte('created_at', dateRangeStart)
        .lte('created_at', dateRangeEnd + 'T23:59:59')
        .eq('is_archived', false)
        .order('created_at', { ascending: true }),
      
      supabase
        .from('body_logs')
        .select('*')
        .eq('family_id', familyId)
        .gte('incident_datetime', dateRangeStart)
        .lte('incident_datetime', dateRangeEnd + 'T23:59:59')
        .eq('is_archived', false)
        .order('incident_datetime', { ascending: true }),
      
      supabase
        .from('diet_entries')
        .select('*')
        .eq('family_id', familyId)
        .gte('entry_date', dateRangeStart)
        .lte('entry_date', dateRangeEnd)
        .eq('is_archived', false)
        .order('entry_date', { ascending: true }),
      
      supabase
        .from('mar_doses')
        .select('*, medications(name, dosage)')
        .eq('family_id', familyId)
        .gte('due_date', dateRangeStart)
        .lte('due_date', dateRangeEnd)
        .order('due_date', { ascending: true }),
      
      supabase
        .from('tasks')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_archived', false)
        .or(`created_at.gte.${dateRangeStart},due_date.gte.${dateRangeStart}`)
        .order('created_at', { ascending: true })
    ]);

    // Format the data for the AI prompt
    const formatCareNotes = (notes: any[]) => {
      if (!notes || notes.length === 0) return 'No care notes recorded.';
      return notes.map(note => {
        const parts = [];
        if (note.created_at) parts.push(`Date: ${new Date(note.created_at).toLocaleDateString('en-GB')}`);
        
        // New structured fields
        if (note.activity_support) parts.push(`Activity: ${note.activity_support}`);
        if (note.observations) parts.push(`Observations: ${note.observations}`);
        if (note.mood) parts.push(`Mood: ${note.mood}`);
        if (note.eating_drinking) parts.push(`Eating/Drinking: ${note.eating_drinking}`);
        if (note.eating_drinking_notes) parts.push(`Eating Notes: ${note.eating_drinking_notes}`);
        if (note.bathroom_usage) parts.push(`Bathroom: ${note.bathroom_usage}`);
        if (note.incidents) parts.push(`Incidents: ${note.incidents}`);
        if (note.next_steps) parts.push(`Next Steps: ${note.next_steps}`);
        if (note.outcome_response) parts.push(`Outcome: ${note.outcome_response}`);
        if (note.activity_tags && note.activity_tags.length > 0) parts.push(`Tags: ${note.activity_tags.join(', ')}`);
        
        // Legacy fields fallback - only use if no new structured data exists
        const hasStructuredData = note.activity_support || note.observations || note.mood || 
                                   note.eating_drinking || note.bathroom_usage || note.incidents;
        if (!hasStructuredData) {
          if (note.title) parts.push(`Title: ${note.title}`);
          if (note.content) parts.push(`Content: ${note.content}`);
        }
        
        // If still no meaningful content, try any available text
        if (parts.length <= 1) {
          if (note.title && !parts.includes(`Title: ${note.title}`)) parts.push(`Title: ${note.title}`);
          if (note.content && !parts.includes(`Content: ${note.content}`)) parts.push(`Content: ${note.content}`);
        }
        
        return parts.length > 1 ? parts.join('\n') : 'Note recorded (no details)';
      }).join('\n---\n');
    };

    const formatBodyLogs = (logs: any[]) => {
      if (!logs || logs.length === 0) return 'No body/injury logs recorded.';
      return logs.map(log => 
        `Date: ${new Date(log.incident_datetime).toLocaleDateString('en-GB')}\nLocation: ${log.body_location}\nType: ${log.type_severity}\nDescription: ${log.description}`
      ).join('\n---\n');
    };

    const formatDietEntries = (entries: any[]) => {
      if (!entries || entries.length === 0) return 'No diet entries recorded.';
      return entries.map(entry =>
        `Date: ${entry.entry_date}\nMeal: ${entry.meal_type || 'Unspecified'}\nDescription: ${entry.description}${entry.portion_left ? `\nPortion Left: ${entry.portion_left}` : ''}${entry.notes ? `\nNotes: ${entry.notes}` : ''}`
      ).join('\n---\n');
    };

    const formatMARDoses = (doses: any[]) => {
      if (!doses || doses.length === 0) return 'No medication records.';
      const given = doses.filter(d => d.status === 'given').length;
      const refused = doses.filter(d => d.status === 'refused').length;
      const missed = doses.filter(d => d.status === 'missed').length;
      const summary = `Total doses: ${doses.length}, Given: ${given}, Refused: ${refused}, Missed: ${missed}`;
      
      const details = doses.slice(0, 20).map(dose =>
        `${dose.due_date} ${dose.due_time}: ${dose.medications?.name || 'Unknown'} (${dose.medications?.dosage || ''}) - ${dose.status}${dose.note ? ` - Note: ${dose.note}` : ''}`
      ).join('\n');
      
      return `${summary}\n\nRecent records:\n${details}`;
    };

    const formatTasks = (tasks: any[]) => {
      if (!tasks || tasks.length === 0) return 'No tasks recorded.';
      const completed = tasks.filter(t => t.completed).length;
      const pending = tasks.filter(t => !t.completed).length;
      const summary = `Total tasks: ${tasks.length}, Completed: ${completed}, Pending: ${pending}`;
      
      const details = tasks.slice(0, 15).map(task =>
        `${task.title}${task.description ? `: ${task.description}` : ''} - ${task.completed ? 'Completed' : 'Pending'}${task.due_date ? ` (Due: ${task.due_date})` : ''}`
      ).join('\n');
      
      return `${summary}\n\nRecent tasks:\n${details}`;
    };

    const logsText = `
## CARE NOTES
${formatCareNotes(careNotesResult.data || [])}

## BODY/INJURY LOGS
${formatBodyLogs(bodyLogsResult.data || [])}

## DIET & NUTRITION
${formatDietEntries(dietEntriesResult.data || [])}

## MEDICATION ADMINISTRATION RECORDS
${formatMARDoses(marDosesResult.data || [])}

## TASKS & ACTIVITIES
${formatTasks(tasksResult.data || [])}
`;

    const systemPrompt = `You are an expert UK social care report writer. Your task is to generate a clear, professional, evidence-based report based on care logs provided. Follow the formatting and tone used in reports for Direct Payments, Social Work reviews, and Care Inspectorate/CQC evidence.

Use UK English and a neutral, professional tone.
Return clean Markdown with headings.
Do not invent or assume information not present in the source logs.
If a section has no relevant data, state "No data recorded for this period."`;

    const userPrompt = `Generate a comprehensive care report for the following:

**Person Supported:** ${careRecipientName}
**Reporting Period:** ${new Date(dateRangeStart).toLocaleDateString('en-GB')} to ${new Date(dateRangeEnd).toLocaleDateString('en-GB')}

**Source Logs:**
${logsText}

---

Please produce a structured, well-formatted report containing:

1. **Overview** - Brief summary of the reporting period
2. **Evidence of Support Provided** - Key care activities and support delivered
3. **Progress Toward Outcomes** - Any observed improvements or changes
4. **Incidents / Concerns** - Any notable incidents, refused medications, or concerns
5. **Recommendations** - Suggested next steps or areas requiring attention

End with: "Report generated automatically by CareHub AI."`;

    console.log('Calling Lovable AI Gateway...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to generate report' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const reportText = aiData.choices?.[0]?.message?.content || 'Failed to generate report content.';

    console.log('Report generated successfully');

    return new Response(JSON.stringify({ 
      report: reportText,
      metadata: {
        careNotesCount: careNotesResult.data?.length || 0,
        bodyLogsCount: bodyLogsResult.data?.length || 0,
        dietEntriesCount: dietEntriesResult.data?.length || 0,
        marDosesCount: marDosesResult.data?.length || 0,
        tasksCount: tasksResult.data?.length || 0,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-report function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
