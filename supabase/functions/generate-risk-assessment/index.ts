import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, recordRateLimitAttempt, createRateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit config: 5 risk assessments per hour per user
const RATE_LIMIT_CONFIG = { maxAttempts: 5, windowMinutes: 60 };

const SYSTEM_PROMPT = `You are an AI assistant embedded within CareHub, a UK-based care and support management platform.

Your role is to help users create clear, structured, and practical risk assessments for care, support, and workplace settings.

IMPORTANT LIMITS:
• You are not a legal authority and must never claim to replace professional judgement, employer sign-off, or regulatory approval.
• All outputs must include a disclaimer stating that the risk assessment is AI-generated and must be reviewed and approved by a responsible person.
• Do not provide medical diagnoses or treatment advice.

CONTEXT & STANDARDS:
• Assume UK and Scotland contexts by default.
• Use terminology appropriate for health & social care, support work, education, and community settings.
• Align language with Care Inspectorate (Scotland), HSE, and person-centred care principles.
• Use plain English that is accessible to carers, support workers, and service managers.

WHEN GENERATING A RISK ASSESSMENT:

Always structure the output using the following sections:

1. Risk Assessment Overview
   - Title
   - Date created
   - Setting / environment
   - Who may be at risk

2. Identified Hazards
   - Clearly list hazards relevant to the scenario
   - Avoid generic wording where specific risks are known

3. Existing Control Measures
   - What is already in place to reduce risk

4. Risk Rating
   - Use a simple Likelihood × Severity approach
   - Explain ratings briefly in words, not just numbers

5. Additional Control Measures Required
   - Practical, realistic actions
   - Proportionate to the risk
   - Person-centred where applicable

6. Residual Risk
   - State whether risk is low, medium, or high after controls

7. Review & Responsibility
   - Who should review it
   - Suggested review timeframe

8. Disclaimer
   - Clearly state this is an AI-generated draft requiring human review and sign-off

STYLE RULES:
• Be calm, professional, and supportive
• Avoid alarmist or defensive language
• Focus on prevention, dignity, and wellbeing
• Do not over-medicalise non-medical risks
• Do not invent policies, laws, or qualifications

ADAPTATION:
• Tailor each risk assessment to the user's inputs (environment, people involved, specific needs).
• If information is missing, make reasonable assumptions and clearly state them.
• Where appropriate, consider trauma-informed care, lone working risks, and safeguarding awareness.

OUTPUT FORMAT:
• Use clear headings and bullet points
• Use markdown formatting
• Suitable for copying into CareHub records or exporting as a document`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { activity, setting, mainHazards, location, familyId } = await req.json();

    if (!activity || !setting || !mainHazards || !location || !familyId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user and family membership
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check family membership
    const { data: membership, error: membershipError } = await supabase
      .from('user_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this family' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit before processing
    const rateLimitResult = await checkRateLimit(user.id, 'generate_risk_assessment', RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      console.warn('Rate limit exceeded for user:', user.id);
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Fetch context data from CareHub
    console.log('Fetching context data for family:', familyId);

    // Get key information (medical history, house details)
    const { data: keyInfo } = await supabase
      .from('key_information')
      .select('medical_history, house_details, additional_info')
      .eq('family_id', familyId)
      .maybeSingle();

    // Get recent care notes (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: careNotes } = await supabase
      .from('care_notes')
      .select('title, content, observations, incidents, mood, created_at')
      .eq('family_id', familyId)
      .eq('is_archived', false)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // Get current medications
    const { data: medications } = await supabase
      .from('medications')
      .select('name, dosage, frequency, instructions')
      .eq('family_id', familyId)
      .eq('is_archived', false);

    // Get recent body logs (injuries, concerns)
    const { data: bodyLogs } = await supabase
      .from('body_logs')
      .select('body_location, description, type_severity, incident_datetime')
      .eq('family_id', familyId)
      .eq('is_archived', false)
      .gte('incident_datetime', thirtyDaysAgo.toISOString())
      .order('incident_datetime', { ascending: false })
      .limit(10);

    // Get care recipient info
    const { data: careRecipients } = await supabase
      .from('care_recipients')
      .select('name, medical_info, emergency_contact')
      .eq('family_id', familyId);

    // Build context for the AI
    let contextData = '';
    
    if (careRecipients && careRecipients.length > 0) {
      contextData += '\n\n### Care Recipient Information:\n';
      careRecipients.forEach(cr => {
        contextData += `- Name: ${cr.name}\n`;
        if (cr.medical_info) contextData += `- Medical Info: ${cr.medical_info}\n`;
      });
    }

    if (keyInfo) {
      if (keyInfo.medical_history) {
        contextData += `\n\n### Medical History:\n${keyInfo.medical_history}`;
      }
      if (keyInfo.house_details) {
        contextData += `\n\n### House/Environment Details:\n${keyInfo.house_details}`;
      }
      if (keyInfo.additional_info) {
        contextData += `\n\n### Additional Information:\n${keyInfo.additional_info}`;
      }
    }

    if (medications && medications.length > 0) {
      contextData += '\n\n### Current Medications:\n';
      medications.forEach(med => {
        contextData += `- ${med.name}${med.dosage ? ` (${med.dosage})` : ''}${med.frequency ? ` - ${med.frequency}` : ''}${med.instructions ? ` - ${med.instructions}` : ''}\n`;
      });
    }

    if (bodyLogs && bodyLogs.length > 0) {
      contextData += '\n\n### Recent Body Map Logs (injuries/concerns):\n';
      bodyLogs.forEach(log => {
        contextData += `- ${log.body_location}: ${log.description} (${log.type_severity}) - ${new Date(log.incident_datetime).toLocaleDateString()}\n`;
      });
    }

    if (careNotes && careNotes.length > 0) {
      contextData += '\n\n### Recent Care Notes (summaries):\n';
      careNotes.forEach(note => {
        const summary = note.title || note.content?.substring(0, 100) || note.observations?.substring(0, 100) || '';
        if (summary) contextData += `- ${summary}\n`;
        if (note.incidents) contextData += `  - Incidents: ${note.incidents}\n`;
      });
    }

    // Get current date formatted for UK
    const currentDate = new Date().toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    // Build the user prompt
    const userPrompt = `Please generate a comprehensive risk assessment based on the following information:

**Current Date:** ${currentDate}

## User Input:
- **Activity:** ${activity}
- **Setting/Environment:** ${setting}
- **Main Hazards Identified:** ${mainHazards}
- **Location:** ${location}

## Available Context from CareHub:
${contextData || 'No additional context available.'}

Please create a thorough, person-centred risk assessment following your standard template structure. Make sure to:
1. Use the current date provided above for the "Date Created" field
2. Consider the specific context and any relevant medical/care information provided
3. Tailor control measures to the specific activity and setting
4. Provide practical, proportionate recommendations
5. Include the required disclaimer at the end`;

    console.log('Calling AI gateway...');

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assessmentContent = aiData.choices?.[0]?.message?.content;

    if (!assessmentContent) {
      throw new Error('No content in AI response');
    }

    // Extract title from the generated content (usually in first heading)
    const titleMatch = assessmentContent.match(/^#\s*(.+?)(?:\n|$)/m) || 
                       assessmentContent.match(/\*\*Title:\*\*\s*(.+?)(?:\n|$)/m);
    const title = titleMatch ? titleMatch[1].trim() : `Risk Assessment: ${activity}`;

    // Try to extract residual risk level
    let residualRiskLevel = 'medium';
    const riskMatch = assessmentContent.toLowerCase().match(/residual\s+risk[:\s]+(?:is\s+)?(\blow\b|\bmedium\b|\bhigh\b)/i);
    if (riskMatch) {
      residualRiskLevel = riskMatch[1].toLowerCase();
    }

    console.log('Risk assessment generated successfully');

    // Record successful rate limit attempt
    await recordRateLimitAttempt(user.id, 'generate_risk_assessment', true);

    return new Response(JSON.stringify({
      title,
      assessmentContent,
      residualRiskLevel,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating risk assessment:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
