import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  userName: string;
  userRole: string;
}

const roleMessages: Record<string, string> = {
  family_admin: "As a Family Admin, you can manage your care team, create schedules, and oversee all care activities.",
  disabled_person: "As the person receiving care, you have full visibility into your care schedule and team.",
  carer: "As a Carer, you can view your shifts, log notes, and stay connected with the care team.",
  family_viewer: "As a Family Viewer, you can stay updated on care activities and schedules.",
  manager: "As a Manager, you can oversee care operations and support your team.",
};

const generateWelcomeHtml = (userName: string, userRole: string, loginUrl: string) => {
  const roleMessage = roleMessages[userRole] || roleMessages.carer;
  
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
      <h2 style="color:#1e293b;font-size:24px;font-weight:700;margin:0 0 24px;line-height:1.3;">Welcome to CareHub, ${userName}!</h2>
      
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 20px;">
        We're thrilled to have you join the CareHub community. Your account has been successfully created and you're ready to start coordinating care with ease.
      </p>

      <!-- Role Box -->
      <div style="background-color:#eff6ff;border-radius:8px;padding:20px;margin-bottom:24px;border-left:4px solid #3b82f6;">
        <p style="color:#1e40af;font-size:14px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Your Role</p>
        <p style="color:#1e3a5f;font-size:15px;line-height:1.5;margin:0;">${roleMessage}</p>
      </div>

      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 20px;">Here's what you can do next:</p>

      <div style="margin-bottom:28px;">
        <p style="color:#475569;font-size:15px;line-height:1.8;margin:0;">✓ Set up your profile with your details</p>
        <p style="color:#475569;font-size:15px;line-height:1.8;margin:0;">✓ Explore the dashboard and features</p>
        <p style="color:#475569;font-size:15px;line-height:1.8;margin:0;">✓ Connect with your care team</p>
        <p style="color:#475569;font-size:15px;line-height:1.8;margin:0;">✓ Start logging care activities</p>
      </div>

      <!-- Button -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${loginUrl}" style="background-color:#22c55e;border-radius:8px;color:#ffffff;display:inline-block;font-size:16px;font-weight:600;padding:14px 32px;text-decoration:none;">Go to Dashboard</a>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">

      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0;text-align:center;">
        Need help getting started? Reply to this email and our team will be happy to assist.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:24px 0;text-align:center;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">© ${new Date().getFullYear()} CareHub. Empowering care, together.</p>
    </div>
  </div>
</body>
</html>`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userName, userRole }: WelcomeEmailRequest = await req.json();
    console.log(`Sending welcome email to ${email} for user ${userName} with role ${userRole}`);

    const appUrl = req.headers.get('origin') || 'https://lovable.dev';
    const html = generateWelcomeHtml(userName || 'there', userRole || 'carer', appUrl);

    const emailResponse = await resend.emails.send({
      from: "CareHub <onboarding@resend.dev>",
      to: [email],
      subject: `Welcome to CareHub, ${userName || 'there'}! 💙`,
      html,
    });

    console.log("Welcome email sent successfully:", emailResponse);
    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
