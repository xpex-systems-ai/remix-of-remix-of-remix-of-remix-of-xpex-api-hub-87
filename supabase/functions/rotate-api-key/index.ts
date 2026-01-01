import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { keyId, expirationDays = 90 } = body;

    if (!keyId) {
      return new Response(
        JSON.stringify({ error: 'Key ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the key belongs to the user
    const { data: existingKey, error: keyError } = await supabaseClient
      .from('api_keys')
      .select('id, name, user_id, status, is_sandbox, environment')
      .eq('id', keyId)
      .eq('user_id', user.id)
      .single();

    if (keyError || !existingKey) {
      return new Response(
        JSON.stringify({ error: 'API key not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingKey.status === 'rotated') {
      return new Response(
        JSON.stringify({ error: 'This key has already been rotated' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new key
    const newKeyValue = 'gm_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    // Deactivate old key
    await supabaseClient
      .from('api_keys')
      .update({ status: 'rotated' })
      .eq('id', keyId);

    // Create new key
    const { data: newKey, error: insertError } = await supabaseClient
      .from('api_keys')
      .insert({
        user_id: user.id,
        name: existingKey.name.replace(' (rotated)', '') + ' (rotated)',
        key: newKeyValue,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        rotated_from: keyId,
        is_sandbox: existingKey.is_sandbox,
        environment: existingKey.environment,
      })
      .select()
      .single();

    if (insertError) {
      // Rollback: reactivate old key
      await supabaseClient
        .from('api_keys')
        .update({ status: 'active' })
        .eq('id', keyId);

      return new Response(
        JSON.stringify({ error: 'Failed to create new key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the rotation in audit logs
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'api_key_rotated',
      resource_type: 'api_key',
      resource_id: keyId,
      details: {
        old_key_id: keyId,
        new_key_id: newKey.id,
        expires_at: expiresAt.toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        oldKeyId: keyId,
        newKey: {
          id: newKey.id,
          key: newKeyValue,
          name: newKey.name,
          expiresAt: expiresAt.toISOString(),
          environment: newKey.environment,
          isSandbox: newKey.is_sandbox,
        },
        message: 'API key rotated successfully. Update your integration with the new key.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Key rotation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
