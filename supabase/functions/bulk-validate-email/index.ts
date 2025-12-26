import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Disposable email domains
const disposableDomains = [
  "tempmail.com", "throwaway.com", "mailinator.com", "guerrillamail.com",
  "temp-mail.org", "10minutemail.com", "fakeinbox.com", "trashmail.com",
  "yopmail.com", "getnada.com", "maildrop.cc", "dispostable.com",
];

const domainTypos: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.co": "gmail.com",
  "gamil.com": "gmail.com", "gnail.com": "gmail.com", "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com", "outlok.com": "outlook.com", "yahooo.com": "yahoo.com",
};

function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateSingleEmail(email: string): {
  email: string;
  valid: boolean;
  score: number;
  risk_level: string;
  checks: Record<string, boolean>;
  suggestion: string | null;
} {
  const domain = email.split("@")[1] || "";
  const formatValid = validateEmailFormat(email);
  const isDisposable = disposableDomains.includes(domain.toLowerCase());
  const typoSuggestion = domainTypos[domain.toLowerCase()] || null;
  const commonDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "protonmail.com"];
  const mxValid = commonDomains.includes(domain.toLowerCase()) || !isDisposable;

  let score = 0;
  if (formatValid) score += 30;
  if (!isDisposable) score += 25;
  if (!typoSuggestion) score += 20;
  if (mxValid) score += 25;

  return {
    email,
    valid: formatValid && !isDisposable && score >= 50,
    score,
    risk_level: score >= 80 ? "low" : score >= 50 ? "medium" : "high",
    checks: {
      format_valid: formatValid,
      is_disposable: isDisposable,
      mx_valid: mxValid,
      has_typo: !!typoSuggestion,
    },
    suggestion: typoSuggestion ? email.replace(domain, typoSuggestion) : null,
  };
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[BULK-VALIDATE] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { jobId, emails, fileName, scheduledAt } = await req.json();

    logStep("Bulk validation request", { userId: user.id, emailCount: emails?.length, jobId, scheduledAt });

    // If jobId provided, process in background
    if (jobId) {
      // Mark as processing
      await supabaseAdmin
        .from("bulk_validation_jobs")
        .update({ status: "processing", schedule_status: "processing" })
        .eq("id", jobId);

      // Get user credits
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      const availableCredits = profile?.credits ?? 0;
      const emailList = emails as string[];
      const emailsToProcess = emailList.slice(0, availableCredits);
      
      if (emailsToProcess.length === 0) {
        await supabaseAdmin
          .from("bulk_validation_jobs")
          .update({
            status: "failed",
            schedule_status: "immediate",
            error_message: "Insufficient credits",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        return new Response(
          JSON.stringify({ error: "Insufficient credits" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
        );
      }

      // Process emails
      const results: Array<ReturnType<typeof validateSingleEmail>> = [];
      let validCount = 0;
      let invalidCount = 0;

      for (let i = 0; i < emailsToProcess.length; i++) {
        const result = validateSingleEmail(emailsToProcess[i].trim());
        results.push(result);
        
        if (result.valid) validCount++;
        else invalidCount++;

        // Update progress every 50 emails
        if ((i + 1) % 50 === 0 || i === emailsToProcess.length - 1) {
          await supabaseAdmin
            .from("bulk_validation_jobs")
            .update({
              processed_emails: i + 1,
              valid_emails: validCount,
              invalid_emails: invalidCount,
            })
            .eq("id", jobId);
        }
      }

      // Deduct credits
      const creditsToDeduct = emailsToProcess.length;
      const { data: newCredits } = await supabaseAdmin.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: creditsToDeduct,
      });

      // Log transaction
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: user.id,
        amount: -creditsToDeduct,
        type: "deduction",
        description: `Bulk validation: ${emailsToProcess.length} emails (${fileName})`,
        balance_after: newCredits ?? 0,
      });

      // Complete job
      await supabaseAdmin
        .from("bulk_validation_jobs")
        .update({
          status: "completed",
          schedule_status: "immediate",
          processed_emails: emailsToProcess.length,
          valid_emails: validCount,
          invalid_emails: invalidCount,
          credits_used: creditsToDeduct,
          results: results,
          completed_at: new Date().toISOString(),
          pending_emails: null, // Clear stored emails
        })
        .eq("id", jobId);

      logStep("Bulk validation completed", {
        jobId,
        processed: emailsToProcess.length,
        valid: validCount,
        invalid: invalidCount,
      });

      return new Response(
        JSON.stringify({
          success: true,
          processed: emailsToProcess.length,
          valid: validCount,
          invalid: invalidCount,
          credits_used: creditsToDeduct,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new job
    const emailList = emails as string[];
    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
    
    const jobData: Record<string, unknown> = {
      user_id: user.id,
      file_name: fileName || "bulk_validation.csv",
      total_emails: emailList.length,
      status: "pending",
      schedule_status: isScheduled ? "scheduled" : "immediate",
      scheduled_at: isScheduled ? scheduledAt : null,
      pending_emails: isScheduled ? emailList : null, // Store emails for scheduled jobs
    };

    const { data: job, error: jobError } = await supabaseAdmin
      .from("bulk_validation_jobs")
      .insert(jobData)
      .select()
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Failed to create job" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    logStep("Job created", { jobId: job.id, totalEmails: emailList.length, scheduled: isScheduled });

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        total_emails: emailList.length,
        scheduled: isScheduled,
        scheduled_at: isScheduled ? scheduledAt : null,
        message: isScheduled 
          ? `Job scheduled for ${scheduledAt}` 
          : "Job created. Call again with jobId to process.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error in bulk validation", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
