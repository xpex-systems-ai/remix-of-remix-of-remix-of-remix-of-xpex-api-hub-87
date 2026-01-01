-- Add sandbox mode and rotation columns to api_keys table
ALTER TABLE public.api_keys 
ADD COLUMN IF NOT EXISTS is_sandbox boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rotated_from uuid REFERENCES public.api_keys(id),
ADD COLUMN IF NOT EXISTS rotation_scheduled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS environment text DEFAULT 'production' CHECK (environment IN ('sandbox', 'production'));

-- Create index for expired keys cleanup
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON public.api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Create index for sandbox keys
CREATE INDEX IF NOT EXISTS idx_api_keys_sandbox ON public.api_keys(is_sandbox) WHERE is_sandbox = true;

-- Create function to auto-rotate expired keys
CREATE OR REPLACE FUNCTION public.rotate_api_key(p_key_id uuid, p_user_id uuid)
RETURNS TABLE(new_key_id uuid, new_key text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_key text;
  v_new_key_id uuid;
  v_old_key_name text;
  v_expires_at timestamp with time zone;
BEGIN
  -- Get old key info
  SELECT name INTO v_old_key_name
  FROM api_keys
  WHERE id = p_key_id AND user_id = p_user_id;
  
  IF v_old_key_name IS NULL THEN
    RAISE EXCEPTION 'API key not found or unauthorized';
  END IF;
  
  -- Generate new key
  v_new_key := 'gm_' || encode(gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '90 days';
  
  -- Deactivate old key
  UPDATE api_keys
  SET status = 'rotated'
  WHERE id = p_key_id;
  
  -- Create new key with reference to old one
  INSERT INTO api_keys (user_id, name, key, status, expires_at, rotated_from, environment, is_sandbox)
  SELECT user_id, name || ' (rotated)', v_new_key, 'active', v_expires_at, p_key_id, environment, is_sandbox
  FROM api_keys WHERE id = p_key_id
  RETURNING id INTO v_new_key_id;
  
  RETURN QUERY SELECT v_new_key_id, v_new_key, v_expires_at;
END;
$$;

-- Create function to check if key is valid (not expired, not sandbox when checking production)
CREATE OR REPLACE FUNCTION public.validate_api_key_extended(p_key text)
RETURNS TABLE(
  valid boolean,
  user_id uuid,
  key_id uuid,
  credits integer,
  tier text,
  is_sandbox boolean,
  is_expired boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (ak.status = 'active' AND (ak.expires_at IS NULL OR ak.expires_at > now())) as valid,
    p.user_id,
    ak.id as key_id,
    p.credits,
    COALESCE(p.subscription_tier, 'free') as tier,
    COALESCE(ak.is_sandbox, false) as is_sandbox,
    (ak.expires_at IS NOT NULL AND ak.expires_at <= now()) as is_expired
  FROM api_keys ak
  JOIN profiles p ON ak.user_id = p.user_id
  WHERE ak.key = p_key;
END;
$$;