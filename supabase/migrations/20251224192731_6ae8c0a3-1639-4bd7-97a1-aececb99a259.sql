-- Create auto-recharge settings table
CREATE TABLE public.auto_recharge_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  threshold_credits INTEGER NOT NULL DEFAULT 100,
  recharge_amount INTEGER NOT NULL DEFAULT 1000,
  recharge_package TEXT NOT NULL DEFAULT 'starter',
  stripe_payment_method_id TEXT,
  last_recharge_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_recharge_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own auto-recharge settings" 
ON public.auto_recharge_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own auto-recharge settings" 
ON public.auto_recharge_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own auto-recharge settings" 
ON public.auto_recharge_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create bulk validation jobs table
CREATE TABLE public.bulk_validation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  total_emails INTEGER NOT NULL DEFAULT 0,
  processed_emails INTEGER NOT NULL DEFAULT 0,
  valid_emails INTEGER NOT NULL DEFAULT 0,
  invalid_emails INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  results JSONB,
  error_message TEXT,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_validation_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own bulk jobs" 
ON public.bulk_validation_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bulk jobs" 
ON public.bulk_validation_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bulk jobs" 
ON public.bulk_validation_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Enable realtime for jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_validation_jobs;

-- Add trigger for updated_at
CREATE TRIGGER update_auto_recharge_updated_at
BEFORE UPDATE ON public.auto_recharge_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bulk_validation_updated_at
BEFORE UPDATE ON public.bulk_validation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();