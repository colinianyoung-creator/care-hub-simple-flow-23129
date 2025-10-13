import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation helper functions
function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeCSV(value: string | number): string {
  const str = String(value);
  // Prevent formula injection
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    return "'" + str;
  }
  // Escape quotes and wrap in quotes if contains comma
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('supabase.co');
  } catch {
    return false;
  }
}

function validateTimesheetData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Validate required string fields
  if (typeof data.employerName !== 'string' || data.employerName.length > 200) return false;
  if (typeof data.employeeName !== 'string' || data.employeeName.length > 200) return false;
  if (typeof data.periodEnding !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.periodEnding)) return false;
  
  // Validate weeks array
  if (!Array.isArray(data.weeks)) return false;
  for (const week of data.weeks) {
    if (typeof week.weekEnding !== 'string') return false;
    if (typeof week.basic !== 'number' || week.basic < 0 || week.basic > 168) return false;
    if (typeof week.cover !== 'number' || week.cover < 0 || week.cover > 168) return false;
    if (week.sickness !== undefined && (typeof week.sickness !== 'number' || week.sickness < 0 || week.sickness > 168)) return false;
    if (week.annual_leave !== undefined && (typeof week.annual_leave !== 'number' || week.annual_leave < 0 || week.annual_leave > 168)) return false;
    if (week.public_holiday !== undefined && (typeof week.public_holiday !== 'number' || week.public_holiday < 0 || week.public_holiday > 168)) return false;
  }
  
  // Validate totals
  if (!data.totals || typeof data.totals !== 'object') return false;
  const totals = ['basic', 'cover', 'sickness', 'annual_leave', 'public_holiday'];
  for (const key of totals) {
    if (data.totals[key] !== undefined && (typeof data.totals[key] !== 'number' || data.totals[key] < 0 || data.totals[key] > 1000)) return false;
  }
  
  return true;
}

function validateSignatures(sigs: any): boolean {
  if (!sigs || typeof sigs !== 'object') return true; // Optional
  
  if (sigs.employerSignature && !validateUrl(sigs.employerSignature)) return false;
  if (sigs.employeeSignature && !validateUrl(sigs.employeeSignature)) return false;
  
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token from Bearer header
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);

    // Create Supabase client with anon key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get user from token directly
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    console.log('Auth validation - User ID:', user?.id, 'Error:', authError?.message);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { familyId, format, timesheetData, signatures, exportDate } = await req.json();

    // Validate inputs
    if (!familyId || typeof familyId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid family ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!format || !['pdf', 'excel'].includes(format)) {
      return new Response(
        JSON.stringify({ error: 'Invalid format. Must be pdf or excel' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!validateTimesheetData(timesheetData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid timesheet data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!validateSignatures(signatures)) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature URLs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is member of this family with detailed logging
    console.log('Checking membership for user:', user.id, 'family:', familyId);
    
    // Use service role for more reliable membership check
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data: membership, error: membershipError } = await supabaseService
      .from('user_memberships')
      .select('*')
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .maybeSingle();

    console.log('Membership query result:', { membership: !!membership, membershipError });

    if (membershipError) {
      console.error('Database error during membership check:', membershipError.message);
      return new Response(
        JSON.stringify({ 
          error: 'An error occurred while validating your access'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!membership) {
      // Get all families user belongs to for server logging only
      const { data: allMemberships } = await supabaseService
        .from('user_memberships')
        .select('family_id')
        .eq('user_id', user.id);
      
      console.error('Authorization failed:', {
        user_id: user.id,
        requested_family: familyId,
        accessible_families: allMemberships?.map(m => m.family_id) || [],
        timestamp: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'You do not have permission to access this family'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (format === 'pdf') {
      return generatePDF(timesheetData, signatures, exportDate);
    } else if (format === 'excel') {
      return generateExcel(timesheetData, signatures, exportDate);
    } else {
      throw new Error('Unsupported format');
    }

  } catch (error) {
    console.error('Error in export-timesheet function:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while processing your request' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generatePDF(timesheetData: any, signatures: any, exportDate: string) {
  // Generate HTML that will be used as a PDF with sanitized inputs
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 0.5in; }
        body { font-family: Arial, sans-serif; margin: 0; line-height: 1.4; }
        .header { text-align: center; margin-bottom: 30px; }
        .info-section { margin-bottom: 20px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .totals-row { background-color: #f0f0f0; font-weight: bold; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 40px; }
        .signature-box { text-align: center; }
        .signature-line { border-bottom: 1px solid #000; height: 40px; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; }
        .signature-img { max-height: 30px; max-width: 150px; }
        .disclaimer { font-size: 10px; color: #666; text-align: center; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; }
        h1 { margin: 0 0 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Monthly Timesheet</h1>
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="text-align: left; margin-bottom: 10px;"><strong>Name of Employer:</strong> ${escapeHtml(timesheetData.employerName)}</div>
        <div style="text-align: left; margin-bottom: 10px;"><strong>Name of Employee:</strong> ${escapeHtml(timesheetData.employeeName)}</div>
        <div style="text-align: left;"><strong>Period Ending:</strong> ${escapeHtml(timesheetData.periodEnding)}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Basic Shifts</th>
            <th>Cover</th>
            <th>Annual Leave</th>
            <th>Public Holiday</th>
            <th>Sickness</th>
          </tr>
        </thead>
        <tbody>
          ${timesheetData.weeks.map((week: any) => `
            <tr>
              <td>${escapeHtml(week.weekEnding)}</td>
              <td>${escapeHtml((week.basic || 0).toFixed(1))}</td>
              <td>${escapeHtml((week.cover || 0).toFixed(1))}</td>
              <td>${escapeHtml((week.annual_leave || 0).toFixed(1))}</td>
              <td>${escapeHtml((week.public_holiday || 0).toFixed(1))}</td>
              <td>${escapeHtml((week.sickness || 0).toFixed(1))}</td>
            </tr>
          `).join('')}
          <tr class="totals-row">
            <td>Total</td>
            <td>${escapeHtml((timesheetData.totals.basic || 0).toFixed(1))}</td>
            <td>${escapeHtml((timesheetData.totals.cover || 0).toFixed(1))}</td>
            <td>${escapeHtml((timesheetData.totals.annual_leave || 0).toFixed(1))}</td>
            <td>${escapeHtml((timesheetData.totals.public_holiday || 0).toFixed(1))}</td>
            <td>${escapeHtml((timesheetData.totals.sickness || 0).toFixed(1))}</td>
          </tr>
        </tbody>
      </table>

      <div class="signatures">
        <div class="signature-box">
          <div>Signature of Employer:</div>
          <div class="signature-line">
            ${signatures?.employerSignature && validateUrl(signatures.employerSignature) ? `<img src="${escapeHtml(signatures.employerSignature)}" class="signature-img" alt="Employer Signature">` : ''}
          </div>
        </div>
        <div class="signature-box">
          <div>Signature of Employee:</div>
          <div class="signature-line">
            ${signatures?.employeeSignature && validateUrl(signatures.employeeSignature) ? `<img src="${escapeHtml(signatures.employeeSignature)}" class="signature-img" alt="Employee Signature">` : ''}
          </div>
        </div>
        <div class="signature-box">
          <div>Date:</div>
          <div class="signature-line">${escapeHtml(exportDate)}</div>
        </div>
      </div>

      <div class="disclaimer">
        This timesheet is a generic template generated by CareHub. It is not associated with any council or employer.
      </div>
    </body>
    </html>
  `;

  // Return HTML as text for PDF generation by browser
  return new Response(html, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline; filename="monthly-timesheet.html"'
    }
  });
}

function generateExcel(timesheetData: any, signatures: any, exportDate: string) {
  // Generate CSV for Excel compatibility with proper escaping
  const headers = ['Date', 'Basic Shifts', 'Cover', 'Annual Leave', 'Public Holiday', 'Sickness'];
  
  let csv = `Monthly Timesheet\n`;
  csv += `Name of Employer,${escapeCSV(timesheetData.employerName)}\n`;
  csv += `Name of Employee,${escapeCSV(timesheetData.employeeName)}\n`;
  csv += `Period Ending,${escapeCSV(timesheetData.periodEnding)}\n\n`;
  
  csv += headers.join(',') + '\n';
  
  timesheetData.weeks.forEach((week: any) => {
    csv += `${escapeCSV(week.weekEnding)},${escapeCSV((week.basic || 0).toFixed(1))},${escapeCSV((week.cover || 0).toFixed(1))},${escapeCSV((week.annual_leave || 0).toFixed(1))},${escapeCSV((week.public_holiday || 0).toFixed(1))},${escapeCSV((week.sickness || 0).toFixed(1))}\n`;
  });
  
  csv += `Total,${escapeCSV((timesheetData.totals.basic || 0).toFixed(1))},${escapeCSV((timesheetData.totals.cover || 0).toFixed(1))},${escapeCSV((timesheetData.totals.annual_leave || 0).toFixed(1))},${escapeCSV((timesheetData.totals.public_holiday || 0).toFixed(1))},${escapeCSV((timesheetData.totals.sickness || 0).toFixed(1))}\n\n`;
  
  csv += `Signature of Employer,\n`;
  csv += `Signature of Employee,\n`;
  csv += `Export Date,${escapeCSV(exportDate)}\n\n`;
  csv += `"This timesheet is a generic template generated by CareHub. It is not associated with any council or employer."\n`;

  return new Response(csv, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="monthly-timesheet.csv"'
    }
  });
}