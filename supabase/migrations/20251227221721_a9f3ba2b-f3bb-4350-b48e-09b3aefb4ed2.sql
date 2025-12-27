-- Update the handle_new_user function to grant signup bonus credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  signup_bonus INTEGER := 10;
BEGIN
  -- Create profile with signup bonus credits
  INSERT INTO public.profiles (user_id, email, full_name, credits)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name', signup_bonus);
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  -- Record the signup bonus transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description, balance_after)
  VALUES (new.id, signup_bonus, 'signup_bonus', 'Welcome bonus - 10 free credits', signup_bonus);
  
  RETURN new;
END;
$function$;