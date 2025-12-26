import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCHEDULED-VALIDATION] ${step}${detailsStr}`);
};

// Email validation functions
const disposableDomains = ['tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com', '10minutemail.com'];

const domainTypos: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'hotmal.com': 'hotmail.com',
  'yaho.com': 'yahoo.com',
};

function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateSingleEmail(email: string) {
  const isValidFormat = validateEmailFormat(email);
  const domain = email.split('@')[1]?.toLowerCase() || '';
  const isDisposable = disposableDomains.includes(domain);
  const typoSuggestion = domainTypos[domain] || null;

  let score = 100;
  if (!isValidFormat) score -= 50;
  if (isDisposable) score -= 30;
  if (typoSuggestion) score -= 10;

  return {
    email,
    valid: isValidFormat && !isDisposable && score >= 70,
    score,
    risk_level: score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high',
    checks: {
      format: isValidFormat,
      disposable: !isDisposable,
      typo: !typoSuggestion,
    },
    suggestion: typoSuggestion ? email.replace(domain, typoSuggestion) : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting scheduled validation processing');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Find scheduled jobs that are due
    const now = new Date().toISOString();
    
    const { data: scheduledJobs, error: fetchError } = await supabaseAdmin
      .from('bulk_validation_jobs')
      .select('*')
      .eq('schedule_status', 'scheduled')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .limit(5); // Process up to 5 jobs at a time

    if (fetchError) {
      logStep('Error fetching scheduled jobs', fetchError);
      throw fetchError;
    }

    if (!scheduledJobs || scheduledJobs.length === 0) {
      logStep('No scheduled jobs to process');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep(`Found ${scheduledJobs.length} scheduled jobs to process`);

    const results: Array<{ jobId: string; status: string; emails: number }> = [];

    for (const job of scheduledJobs) {
      logStep(`Processing job ${job.id}`, { file_name: job.file_name, total_emails: job.total_emails });

      try {
        // Mark job as processing
        await supabaseAdmin
          .from('bulk_validation_jobs')
          .update({ 
            status: 'processing', 
            schedule_status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);

        // Get the emails to validate from the job
        // The emails should have been stored when the job was created
        // For now, we'll check if results exist and re-process if needed
        
        // Fetch user's credit balance
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('credits')
          .eq('user_id', job.user_id)
          .single();

        if (!profile || profile.credits < job.total_emails) {
          logStep(`Insufficient credits for job ${job.id}`, { available: profile?.credits, needed: job.total_emails });
          
          await supabaseAdmin
            .from('bulk_validation_jobs')
            .update({ 
              status: 'failed', 
              schedule_status: 'immediate',
              error_message: 'Insufficient credits at scheduled time',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          results.push({ jobId: job.id, status: 'failed', emails: 0 });
          continue;
        }

        // Since we don't store raw emails, we need to get them from somewhere
        // For scheduled jobs, we'll store the email list in a temporary field
        // Let's check if the job has stored email data
        const storedEmails = (job as Record<string, unknown>).pending_emails as string[] | undefined;
        
        if (!storedEmails || storedEmails.length === 0) {
          logStep(`No stored emails for job ${job.id}, marking as failed`);
          
          await supabaseAdmin
            .from('bulk_validation_jobs')
            .update({ 
              status: 'failed', 
              schedule_status: 'immediate',
              error_message: 'No email data found for scheduled job',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
          
          results.push({ jobId: job.id, status: 'failed', emails: 0 });
          continue;
        }

        // Validate emails
        const validationResults = storedEmails.map(validateSingleEmail);
        const validCount = validationResults.filter(r => r.valid).length;
        const invalidCount = validationResults.filter(r => !r.valid).length;

        // Deduct credits
        const { error: creditError } = await supabaseAdmin.rpc('deduct_credits', {
          p_user_id: job.user_id,
          p_amount: storedEmails.length,
        });

        if (creditError) {
          logStep(`Credit deduction failed for job ${job.id}`, creditError);
        }

        // Update job with results
        await supabaseAdmin
          .from('bulk_validation_jobs')
          .update({
            status: 'completed',
            schedule_status: 'immediate',
            processed_emails: storedEmails.length,
            valid_emails: validCount,
            invalid_emails: invalidCount,
            credits_used: storedEmails.length,
            results: validationResults,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        // Log transaction
        await supabaseAdmin.from('credit_transactions').insert({
          user_id: job.user_id,
          amount: -storedEmails.length,
          balance_after: (profile.credits - storedEmails.length),
          type: 'usage',
          description: `Scheduled bulk validation: ${job.file_name}`,
        });

        // Create notification
        await supabaseAdmin.from('notifications').insert({
          user_id: job.user_id,
          title: 'Scheduled Validation Complete',
          message: `Your scheduled validation for "${job.file_name}" has completed. ${validCount} valid, ${invalidCount} invalid emails found.`,
          type: 'success',
          action_url: '/dashboard',
        });

        logStep(`Completed job ${job.id}`, { valid: validCount, invalid: invalidCount });
        results.push({ jobId: job.id, status: 'completed', emails: storedEmails.length });

      } catch (jobError) {
        logStep(`Error processing job ${job.id}`, jobError);
        
        await supabaseAdmin
          .from('bulk_validation_jobs')
          .update({ 
            status: 'failed', 
            schedule_status: 'immediate',
            error_message: String(jobError),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        results.push({ jobId: job.id, status: 'failed', emails: 0 });
      }
    }

    logStep('Finished processing scheduled validations', { results });

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('Fatal error', { error: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  }
});
