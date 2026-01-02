-- Create function to grant signup bonus credits
CREATE OR REPLACE FUNCTION public.grant_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
  bonus_credits INTEGER := 10;
  current_credits INTEGER;
BEGIN
  -- Get current credits (should be 0 for new profiles)
  current_credits := COALESCE(NEW.credits, 0);
  
  -- Update the profile with bonus credits
  NEW.credits := current_credits + bonus_credits;
  
  -- Record the transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    type,
    description,
    balance_after,
    metadata
  ) VALUES (
    NEW.user_id,
    bonus_credits,
    'subscription',
    'Welcome bonus - 10 free credits',
    NEW.credits,
    '{"source": "signup_bonus", "bonus_type": "welcome"}'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to grant bonus on profile creation
DROP TRIGGER IF EXISTS on_profile_created_grant_bonus ON public.profiles;
CREATE TRIGGER on_profile_created_grant_bonus
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_signup_bonus();