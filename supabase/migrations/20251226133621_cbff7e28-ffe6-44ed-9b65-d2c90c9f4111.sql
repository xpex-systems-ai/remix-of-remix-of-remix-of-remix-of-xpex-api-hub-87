-- Add scheduling columns to bulk_validation_jobs
ALTER TABLE public.bulk_validation_jobs 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN schedule_status TEXT DEFAULT 'immediate' CHECK (schedule_status IN ('immediate', 'scheduled', 'processing'));

-- Create index for efficient scheduled job queries
CREATE INDEX idx_bulk_validation_scheduled ON public.bulk_validation_jobs(scheduled_at, status) WHERE scheduled_at IS NOT NULL;