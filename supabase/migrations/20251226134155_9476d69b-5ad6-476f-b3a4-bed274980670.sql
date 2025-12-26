-- Add pending_emails column to store emails for scheduled jobs
ALTER TABLE public.bulk_validation_jobs 
ADD COLUMN pending_emails TEXT[] DEFAULT NULL;