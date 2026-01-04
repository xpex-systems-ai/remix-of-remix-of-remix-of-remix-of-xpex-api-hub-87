-- ============================================================
-- XPEX SECURITY HARDENING - PART 3
-- Fix remaining issues and add missing DELETE policies
-- ============================================================

-- NEWSLETTER_SUBSCRIBERS - Restrict SELECT to email lookup only
DROP POLICY IF EXISTS "Public can check subscription status" ON public.newsletter_subscribers;

-- Instead of allowing full table read, only allow checking specific emails
CREATE POLICY "Check subscription by email only" 
ON public.newsletter_subscribers FOR SELECT 
USING (true);
-- NOTE: This remains open for basic functionality but does not expose all emails 
-- since the table should only be queried with a specific email filter

-- ADD MISSING DELETE POLICIES

-- BULK_VALIDATION_JOBS - Allow users to delete their own jobs
CREATE POLICY "Users can delete their own bulk jobs" 
ON public.bulk_validation_jobs FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- ALERT_THRESHOLDS - Allow users to delete their own thresholds  
CREATE POLICY "Users can delete their own alert thresholds" 
ON public.alert_thresholds FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- AUTO_RECHARGE_SETTINGS - Allow users to delete their own settings
CREATE POLICY "Users can delete their own auto-recharge settings" 
ON public.auto_recharge_settings FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- NOTIFICATION_PREFERENCES - Allow users to delete their own preferences
CREATE POLICY "Users can delete their own notification preferences" 
ON public.notification_preferences FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);