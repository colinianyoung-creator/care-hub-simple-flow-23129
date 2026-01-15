import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  userName?: string;
  verificationUrl: string;
}

const generateVerificationHtml = (userName: string, verificationUrl: string) => {
  const displayName = userName || "there";

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
      <h2 style="color:#1e293b;font-size:24px;font-weight:700;margin:0 0 24px;line-height:1.3;text-align:center;">Verify Your Email Address</h2>
      
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;text-align:center;">
        Hi <strong>${displayName}</strong>! Thanks for signing up for CareHub. Please verify your email address to complete your registration and start coordinating care with your team.
      </p>

      <!-- Info Box -->
      <div style="background-color:#eff6ff;border-radius:8px;padding:20px;margin-bottom:28px;border-left:4px solid #3b82f6;">
        <p style="color:#1e40af;font-size:14px;font-weight:600;margin:0 0 8px;">Why verify?</p>
        <p style="color:#1e3a5f;font-size:14px;line-height:1.5;margin:0;">
          Email verification helps us keep your account secure and ensures you receive important updates about your care team.
        </p>
      </div>

      <!-- Button -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${verificationUrl}" style="background-color:#22c55e;border-radius:8px;color:#ffffff;display:inline-block;font-size:16px;font-weight:600;padding:14px 40px;text-decoration:none;">Verify Email Address</a>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">

      <!-- Expiry Notice -->
      <div style="background-color:#fef3c7;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
        <p style="color:#92400e;font-size:14px;margin:0;">⏰ This verification link expires in <strong>24 hours</strong></p>
      </div>

      <!-- Link fallback -->
      <div style="background-color:#f8fafc;border-radius:8px;padding:16px;margin-bottom:20px;">
        <p style="color:#64748b;font-size:13px;margin:0 0 8px;text-align:center;">If the button doesn't work, copy and paste this link:</p>
        <p style="color:#3b82f6;font-size:12px;word-break:break-all;margin:0;text-align:center;">${verificationUrl}</p>
      </div>

      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;text-align:center;">
        If you didn't create a CareHub account, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:24px 0;text-align:center;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">© ${new Date().getFullYear()} CareHub. Empowering care, together.</p>
      <p style="color:#cbd5e1;font-size:12px;margin:0;">Questions? Reply to this email for support.</p>
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

  // IP-based rate limiting for unauthenticated requests
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Rate limiting: max 5 verification emails per hour per IP
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('rate_limit_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', clientIp)
    .eq('action_type', 'send_verification_email')
    .gte('attempted_at', oneHourAgo);

  if (!countError && count !== null && count >= 5) {
    console.error("Rate limit exceeded for IP:", clientIp);
    return new Response(
      JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { email, userName, verificationUrl }: VerificationEmailRequest = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!verificationUrl) {
      console.error("Missing verification URL");
      return new Response(
        JSON.stringify({ success: false, error: "Verification URL is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Basic URL validation - must be a valid URL and not point to suspicious domains
    try {
      const parsedUrl = new URL(verificationUrl);
      // Only allow HTTPS URLs
      if (parsedUrl.protocol !== 'https:') {
        throw new Error("Only HTTPS URLs allowed");
      }
    } catch (urlError) {
      console.error("Invalid verification URL:", urlError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid verification URL" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate userName length
    if (userName && userName.length > 100) {
      console.error("User name too long");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid user name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Record rate limit attempt
    await supabase.from('rate_limit_attempts').insert({
      identifier: clientIp,
      action_type: 'send_verification_email',
      success: true,
      metadata: { email }
    });

    console.log(`Sending verification email to ${email} for user ${userName || 'unknown'}`);

    const html = generateVerificationHtml(userName || "", verificationUrl);

    const emailResponse = await resend.emails.send({
      from: "CareHub <no-reply@mycarehub.uk>",
      to: [email],
      subject: "Verify your CareHub email address 💙",
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

    console.log("Verification email sent successfully:", emailResponse);
    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
