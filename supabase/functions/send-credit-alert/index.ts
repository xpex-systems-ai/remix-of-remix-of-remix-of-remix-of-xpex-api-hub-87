import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface CreditAlertRequest {
  userId: string;
  currentCredits: number;
  thresholdPercent: number;
  maxCredits?: number;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREDIT-ALERT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting credit alert processing");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, currentCredits, thresholdPercent, maxCredits = 1000 }: CreditAlertRequest = await req.json();

    logStep("Alert request received", { userId, currentCredits, thresholdPercent });

    // Get user profile and preferences
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile?.email) {
      logStep("No email found for user", { userId, error: profileError });
      return new Response(
        JSON.stringify({ success: false, error: "No email found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check notification preferences
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("usage_alerts, email_enabled")
      .eq("user_id", userId)
      .single();

    if (prefs && (!prefs.usage_alerts || !prefs.email_enabled)) {
      logStep("User has disabled credit alerts");
      return new Response(
        JSON.stringify({ success: false, reason: "Alerts disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create in-app notification
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title: thresholdPercent === 0 
        ? "Credits Depleted" 
        : `Low Credit Warning (${thresholdPercent}%)`,
      message: thresholdPercent === 0
        ? "Your credits have been depleted. Top up now to continue using the API."
        : `Your credit balance is at ${thresholdPercent}% (${currentCredits} credits). Consider topping up soon.`,
      type: thresholdPercent <= 5 ? "error" : "warning",
      action_url: "/credits",
    });

    logStep("In-app notification created");

    // Send email if RESEND_API_KEY is configured
    if (RESEND_API_KEY) {
      const emailSubject = thresholdPercent === 0
        ? "⚠️ Your GoldMail Validator Credits Are Depleted"
        : `⚠️ Low Credit Alert - ${thresholdPercent}% Remaining`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #00bcd4, #9c27b0); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .alert-box { background: ${thresholdPercent <= 5 ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${thresholdPercent <= 5 ? '#ef4444' : '#f59e0b'}; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .credits-display { font-size: 48px; font-weight: bold; text-align: center; color: ${thresholdPercent <= 5 ? '#ef4444' : '#f59e0b'}; margin: 20px 0; }
            .btn { display: inline-block; background: linear-gradient(135deg, #00bcd4, #9c27b0); color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>GoldMail Validator</h1>
            </div>
            <div class="content">
              <h2>Hi ${profile.full_name || 'there'},</h2>
              <div class="alert-box">
                ${thresholdPercent === 0 
                  ? '<strong>Your credits have been depleted!</strong> API requests will fail until you top up.'
                  : `<strong>Your credit balance is running low.</strong> You have ${thresholdPercent}% of your credits remaining.`
                }
              </div>
              <div class="credits-display">${currentCredits.toLocaleString()}</div>
              <p style="text-align: center; color: #6b7280;">credits remaining</p>
              <p style="text-align: center;">
                <a href="${Deno.env.get('SITE_URL') || 'https://your-app.lovable.app'}/credits" class="btn">
                  Top Up Credits Now →
                </a>
              </p>
            </div>
            <div class="footer">
              <p>You're receiving this because you have credit alerts enabled.</p>
              <p>Manage your notification preferences in your dashboard settings.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "GoldMail Validator <alerts@yourdomain.com>",
          to: [profile.email],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      if (emailRes.ok) {
        logStep("Email sent successfully");
      } else {
        const emailError = await emailRes.text();
        logStep("Email sending failed", { error: emailError });
      }
    } else {
      logStep("RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error in credit alert", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
