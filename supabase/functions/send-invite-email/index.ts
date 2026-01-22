import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteCode: string;
  role?: string;
  expiresIn?: string;
}

const roleLabels: Record<string, string> = {
  family_admin: "Family Admin",
  disabled_person: "Care Recipient",
  carer: "Carer",
  family_viewer: "Family Viewer",
  manager: "Manager",
};

const generateInviteHtml = (
  inviterName: string,
  familyName: string,
  inviteCode: string,
  role: string,
  signupUrl: string,
  expiresIn: string,
) => {
  const roleLabel = roleLabels[role] || roleLabels.carer;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;">
  <div style="margin:0 auto;padding:40px 20px;max-width:580px;">
    <!-- Header -->
    <div style="background-color:#3b82f6;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0;letter-spacing:-0.5px;">💙 CareHub</h1>
    </div>
    
    <!-- Content -->
    <div style="background-color:#ffffff;padding:40px;border-radius:0 0 12px 12px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <h2 style="color:#1e293b;font-size:24px;font-weight:700;margin:0 0 24px;line-height:1.3;text-align:center;">You're Invited to Join CareHub!</h2>
      
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;text-align:center;">
        <strong>${inviterName}</strong> has invited you to join <strong>${familyName}</strong> as a <strong>${roleLabel}</strong> on CareHub.
      </p>

      <!-- Info Box -->
      <div style="background-color:#f0fdf4;border-radius:8px;padding:20px;margin-bottom:28px;border-left:4px solid #22c55e;">
        <p style="color:#166534;font-size:14px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">What is CareHub?</p>
        <p style="color:#15803d;font-size:14px;line-height:1.5;margin:0;">
          CareHub is a care coordination platform that helps families and carers work together seamlessly. Track schedules, share notes, manage medications, and stay connected with your care team.
        </p>
      </div>

      <!-- Invite Code -->
      <div style="background-color:#1e293b;border-radius:12px;padding:28px;margin-bottom:28px;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;font-weight:600;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Your Invite Code</p>
        <p style="color:#ffffff;font-size:32px;font-weight:700;font-family:Monaco,Consolas,'Courier New',monospace;letter-spacing:4px;margin:0 0 12px;">${inviteCode}</p>
        <p style="color:#94a3b8;font-size:13px;margin:0;">Use this code when signing up to join the team</p>
      </div>

      <!-- Button -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${signupUrl}" style="background-color:#3b82f6;border-radius:8px;color:#ffffff;display:inline-block;font-size:16px;font-weight:600;padding:14px 40px;text-decoration:none;">Accept Invitation</a>
      </div>

      <!-- Steps -->
      <div style="background-color:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="color:#334155;font-size:14px;font-weight:600;margin:0 0 12px;">How to join:</p>
        <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0;">1. Click the button above or go to CareHub</p>
        <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0;">2. Create your account</p>
        <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0;">3. Enter your invite code: <strong>${inviteCode}</strong></p>
        <p style="color:#64748b;font-size:14px;line-height:1.8;margin:0;">4. Start collaborating with your team!</p>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">

      <!-- Expiry Notice -->
      <div style="background-color:#fef3c7;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
        <p style="color:#92400e;font-size:14px;margin:0;">⏰ This invitation expires in <strong>${expiresIn}</strong></p>
      </div>

      <!-- Fallback Link -->
      <div style="background-color:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="color:#64748b;font-size:13px;margin:0 0 8px;text-align:center;">
          If the button doesn't work, copy and paste this link:
        </p>
        <p style="color:#1e3a5f;font-size:12px;word-break:break-all;margin:0;text-align:center;">
          ${signupUrl}
        </p>
      </div>

      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;text-align:center;">
        Questions about this invitation? Contact ${inviterName} directly or reply to this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:24px 0;text-align:center;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">© ${new Date().getFullYear()} CareHub. Empowering care, together.</p>
      <p style="color:#cbd5e1;font-size:12px;margin:0;">If you weren't expecting this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for API key upfront
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Validate JWT and get authenticated user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    console.error("No authorization header provided");
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized - no auth header" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // User-authenticated client for permission checks
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  // Service role client for bypassing RLS on invite_codes lookup
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Invalid or expired token:", userError);
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized - invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  console.log(`Authenticated user: ${user.id}`);

  const resend = new Resend(RESEND_API_KEY);

  try {
    const {
      email,
      inviteCode,
      role,
      expiresIn = "7 days",
    }: InviteEmailRequest = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!inviteCode) {
      console.error("Missing invite code");
      return new Response(
        JSON.stringify({ success: false, error: "Invite code is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Normalize invite code to lowercase (codes are stored as lowercase hex)
    const normalizedCode = inviteCode.trim().toLowerCase();
    console.log(`Looking up invite code: raw="${inviteCode}", normalized="${normalizedCode}"`);

    // Validate invite code exists and get associated family
    // Use admin client to bypass RLS (invite lookup by code requires bypassing RLS)
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invite_codes')
      .select('id, family_id, code, created_by, role, used_at')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (inviteError) {
      console.error("Error fetching invite code:", inviteError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to validate invite code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!invite) {
      console.error(`Invalid invite code: "${normalizedCode}" not found in database`);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid invite code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (invite.used_at) {
      console.error("Invite code already used");
      return new Response(
        JSON.stringify({ success: false, error: "This invite code has already been used" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user has admin/disabled_person role in the family
    const { data: membership, error: membershipError } = await supabase
      .from('user_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('family_id', invite.family_id)
      .single();

    if (membershipError || !membership) {
      console.error("User is not a member of this family:", membershipError);
      return new Response(
        JSON.stringify({ success: false, error: "Not authorized for this family" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!['family_admin', 'disabled_person'].includes(membership.role)) {
      console.error("User does not have admin privileges:", membership.role);
      return new Response(
        JSON.stringify({ success: false, error: "Only admins and care recipients can send invites" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: max 10 invite emails per hour per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from('rate_limit_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', user.id)
      .eq('action_type', 'send_invite_email')
      .gte('attempted_at', oneHourAgo);

    if (!countError && count !== null && count >= 10) {
      console.error("Rate limit exceeded for user:", user.id);
      return new Response(
        JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Record rate limit attempt
    await supabase.from('rate_limit_attempts').insert({
      identifier: user.id,
      action_type: 'send_invite_email',
      success: true,
      metadata: { email, invite_code: inviteCode }
    });

    // Fetch inviter name from database (don't trust client)
    const { data: inviterProfile } = await supabase
      .from('profiles_secure')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Fetch family name from database (don't trust client)
    const { data: family } = await supabase
      .from('families')
      .select('name')
      .eq('id', invite.family_id)
      .single();

    const inviterName = inviterProfile?.full_name || 'A team member';
    const familyName = family?.name || 'Care Team';
    const inviteRole = role || invite.role || 'carer';

    // Display code as uppercase for readability, but keep canonical lowercase for URL
    const displayCode = normalizedCode.toUpperCase();
    console.log(`Sending invite email to ${email} for family ${familyName} with code ${displayCode}`);

    const appUrl = req.headers.get("origin") || "https://lovable.dev";
    const signupUrl = `${appUrl}/auth?invite=${encodeURIComponent(normalizedCode)}&email=${encodeURIComponent(email)}&role=${encodeURIComponent(inviteRole)}`;
    const html = generateInviteHtml(
      inviterName,
      familyName,
      displayCode,
      inviteRole,
      signupUrl,
      expiresIn,
    );

    const emailResponse = await resend.emails.send({
      from: "CareHub <no-reply@mycarehub.uk>",
      to: [email],
      subject: `${inviterName} invited you to join ${familyName} on CareHub 💙`,
      html,
    });

    // Check if Resend returned an error
    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResponse.error.message || "Failed to send email" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Invite email sent successfully:", emailResponse);
    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-invite-email function:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
