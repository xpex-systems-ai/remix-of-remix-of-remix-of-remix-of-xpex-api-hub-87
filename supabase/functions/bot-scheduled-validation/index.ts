import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledJob {
  id: string;
  name: string;
  emails: string[];
  schedule_type: 'once' | 'daily' | 'weekly' | 'monthly';
  schedule_time: string; // HH:MM format
  schedule_day?: number; // 0-6 for weekly, 1-31 for monthly
  timezone: string;
  use_ai: boolean;
  callback_url?: string;
  enabled: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    switch (req.method) {
      case 'GET': {
        if (action === 'list') {
          // List all scheduled jobs for user
          const { data: jobs, error } = await supabase
            .from('bulk_validation_jobs')
            .select('*')
            .eq('user_id', user.id)
            .eq('schedule_status', 'scheduled')
            .order('scheduled_at', { ascending: true });

          if (error) throw error;

          return new Response(
            JSON.stringify({ jobs: jobs || [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (action === 'history') {
          // Get completed scheduled jobs
          const { data: jobs, error } = await supabase
            .from('bulk_validation_jobs')
            .select('*')
            .eq('user_id', user.id)
            .neq('schedule_status', 'scheduled')
            .not('scheduled_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(50);

          if (error) throw error;

          return new Response(
            JSON.stringify({ jobs: jobs || [] }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        break;
      }

      case 'POST': {
        const body = await req.json();
        const { 
          name,
          emails, 
          scheduled_at, 
          use_ai = false,
          callback_url 
        } = body;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
          return new Response(
            JSON.stringify({ error: 'emails array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!scheduled_at) {
          return new Response(
            JSON.stringify({ error: 'scheduled_at is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const scheduledDate = new Date(scheduled_at);
        if (scheduledDate <= new Date()) {
          return new Response(
            JSON.stringify({ error: 'scheduled_at must be in the future' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check user credits
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('user_id', user.id)
          .single();

        if (!profile || profile.credits < emails.length) {
          return new Response(
            JSON.stringify({ 
              error: 'Insufficient credits',
              credits_available: profile?.credits || 0,
              credits_needed: emails.length
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create scheduled job
        const { data: job, error } = await supabase
          .from('bulk_validation_jobs')
          .insert({
            user_id: user.id,
            file_name: name || `Scheduled Validation - ${emails.length} emails`,
            total_emails: emails.length,
            pending_emails: emails,
            scheduled_at: scheduledDate.toISOString(),
            schedule_status: 'scheduled',
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;

        console.log(`[BOT-SCHEDULED-VALIDATION] Created job ${job.id} for user ${user.id}, scheduled for ${scheduled_at}`);

        return new Response(
          JSON.stringify({
            success: true,
            job: {
              id: job.id,
              name: job.file_name,
              total_emails: job.total_emails,
              scheduled_at: job.scheduled_at,
              status: job.status,
            }
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'DELETE': {
        const jobId = url.searchParams.get('job_id');
        
        if (!jobId) {
          return new Response(
            JSON.stringify({ error: 'job_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify job belongs to user and is still scheduled
        const { data: job } = await supabase
          .from('bulk_validation_jobs')
          .select('*')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .eq('schedule_status', 'scheduled')
          .single();

        if (!job) {
          return new Response(
            JSON.stringify({ error: 'Job not found or cannot be cancelled' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Cancel the job
        const { error } = await supabase
          .from('bulk_validation_jobs')
          .update({ 
            status: 'cancelled',
            schedule_status: 'immediate',
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);

        if (error) throw error;

        console.log(`[BOT-SCHEDULED-VALIDATION] Cancelled job ${jobId} for user ${user.id}`);

        return new Response(
          JSON.stringify({ success: true, message: 'Job cancelled' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BOT-SCHEDULED-VALIDATION] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
