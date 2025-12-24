-- Create atomic credit deduction function
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_credits integer;
  new_credits integer;
BEGIN
  -- Get current credits with row-level lock
  SELECT credits INTO current_credits
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF current_credits IS NULL THEN
    RETURN -1; -- User not found
  END IF;
  
  IF current_credits < p_amount THEN
    RETURN -2; -- Insufficient credits
  END IF;
  
  -- Calculate new credits
  new_credits := GREATEST(current_credits - p_amount, 0);
  
  -- Update credits
  UPDATE profiles
  SET credits = new_credits, updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN new_credits;
END;
$$;

-- Create function to add credits atomically
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_credits integer;
BEGIN
  UPDATE profiles
  SET credits = credits + p_amount, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits INTO new_credits;
  
  RETURN COALESCE(new_credits, -1);
END;
$$;

-- Create table for credit transactions (audit trail)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase', 'deduction', 'subscription', 'referral', 'refund', 'adjustment')),
  description text,
  balance_after integer NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transactions" 
ON public.credit_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- Enable realtime for profiles to sync credits in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;