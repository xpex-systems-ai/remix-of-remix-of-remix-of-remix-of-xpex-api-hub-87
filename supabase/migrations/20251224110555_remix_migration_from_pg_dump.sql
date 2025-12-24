CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


SET default_table_access_method = heap;

--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    achievement_id uuid NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: check_achievements(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_achievements(p_user_id uuid) RETURNS SETOF public.user_achievements
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_validation_count INTEGER;
  v_api_key_count INTEGER;
  v_referral_count INTEGER;
  v_achievement RECORD;
  v_profile_id UUID;
BEGIN
  -- Get validation count
  SELECT COUNT(*) INTO v_validation_count
  FROM usage_logs
  WHERE user_id = p_user_id AND endpoint ILIKE '%validate-email%' AND status_code = 200;
  
  -- Get API key count
  SELECT COUNT(*) INTO v_api_key_count
  FROM api_keys
  WHERE user_id = p_user_id;
  
  -- Get referral count
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = p_user_id;
  
  SELECT COUNT(*) INTO v_referral_count
  FROM referrals
  WHERE referrer_id = v_profile_id AND status IN ('completed', 'rewarded');
  
  -- Check each achievement
  FOR v_achievement IN SELECT * FROM achievements LOOP
    -- Skip if already unlocked
    IF EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) THEN
      CONTINUE;
    END IF;
    
    -- Check milestone
    IF (v_achievement.milestone_type = 'validations' AND v_validation_count >= v_achievement.milestone_value)
       OR (v_achievement.milestone_type = 'api_keys' AND v_api_key_count >= v_achievement.milestone_value)
       OR (v_achievement.milestone_type = 'referrals' AND v_referral_count >= v_achievement.milestone_value)
    THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id)
      RETURNING * INTO v_achievement;
      
      RETURN NEXT v_achievement;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;


--
-- Name: complete_referral(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.complete_referral(p_referred_user_id uuid, p_referral_code text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_referrer_profile_id UUID;
  v_referred_profile_id UUID;
  v_referral_id UUID;
  v_reward_credits INTEGER := 100;
BEGIN
  -- Find referrer by code
  SELECT id INTO v_referrer_profile_id
  FROM public.profiles
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Find referred user's profile
  SELECT id INTO v_referred_profile_id
  FROM public.profiles
  WHERE user_id = p_referred_user_id;
  
  IF v_referred_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_profile_id = v_referred_profile_id THEN
    RETURN FALSE;
  END IF;
  
  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, reward_credits, completed_at)
  VALUES (v_referrer_profile_id, v_referred_profile_id, p_referral_code, 'completed', v_reward_credits, now())
  RETURNING id INTO v_referral_id;
  
  -- Update referred user's profile
  UPDATE public.profiles
  SET referred_by = v_referrer_profile_id
  WHERE id = v_referred_profile_id;
  
  -- Credit the referrer
  UPDATE public.profiles
  SET credits = credits + v_reward_credits,
      referral_credits_earned = referral_credits_earned + v_reward_credits
  WHERE id = v_referrer_profile_id;
  
  -- Mark referral as rewarded
  UPDATE public.referrals
  SET status = 'rewarded', rewarded_at = now()
  WHERE id = v_referral_id;
  
  RETURN TRUE;
END;
$$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'XPEX' || UPPER(SUBSTRING(MD5(NEW.id::text || now()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: get_validation_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_validation_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_validations', COALESCE(COUNT(*), 0),
    'avg_latency_ms', COALESCE(ROUND(AVG(response_time_ms))::integer, 47),
    'success_rate', COALESCE(
      ROUND((COUNT(*) FILTER (WHERE status_code = 200)::numeric / NULLIF(COUNT(*), 0)) * 100)::integer,
      99
    )
  ) INTO result
  FROM usage_logs
  WHERE endpoint ILIKE '%validate-email%';
  
  RETURN result;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_api_key_calls(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_api_key_calls(key_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE api_keys 
  SET calls_count = calls_count + 1,
      last_used_at = now()
  WHERE id = key_id;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    milestone_type text NOT NULL,
    milestone_value integer NOT NULL,
    badge_color text DEFAULT 'bronze'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: alert_thresholds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_thresholds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    latency_threshold_ms integer DEFAULT 1000 NOT NULL,
    error_rate_threshold numeric(5,2) DEFAULT 5.00 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    last_alert_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    calls_count integer DEFAULT 0 NOT NULL,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_keys_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'revoked'::text])))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: configuration_backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuration_backups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    backup_type text NOT NULL,
    data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    CONSTRAINT configuration_backups_backup_type_check CHECK ((backup_type = ANY (ARRAY['webhooks'::text, 'notification_preferences'::text, 'full'::text])))
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    template_type text DEFAULT 'notification'::text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed boolean DEFAULT false NOT NULL,
    unsubscribed_at timestamp with time zone
);


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    push_enabled boolean DEFAULT true NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL,
    webhook_failures boolean DEFAULT true NOT NULL,
    usage_alerts boolean DEFAULT true NOT NULL,
    weekly_reports boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    action_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stripe_customer_id text,
    credits integer DEFAULT 0 NOT NULL,
    subscription_tier text DEFAULT 'free'::text,
    referral_code text,
    referred_by uuid,
    referral_credits_earned integer DEFAULT 0
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid,
    referral_code text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reward_credits integer DEFAULT 100,
    completed_at timestamp with time zone,
    rewarded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'rewarded'::text, 'expired'::text])))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_subscription_id text,
    stripe_customer_id text,
    status text DEFAULT 'inactive'::text NOT NULL,
    price_id text,
    product_id text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'investigating'::text NOT NULL,
    severity text DEFAULT 'minor'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    affected_services text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    api_key_id uuid,
    endpoint text NOT NULL,
    status_code integer NOT NULL,
    response_time_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL
);


--
-- Name: webhook_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status_code integer,
    response text,
    success boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    secret text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    events text[] DEFAULT ARRAY['usage.threshold'::text, 'usage.limit_reached'::text, 'credits.low'::text, 'credits.depleted'::text] NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: alert_thresholds alert_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_thresholds
    ADD CONSTRAINT alert_thresholds_pkey PRIMARY KEY (id);


--
-- Name: alert_thresholds alert_thresholds_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_thresholds
    ADD CONSTRAINT alert_thresholds_user_id_unique UNIQUE (user_id);


--
-- Name: api_keys api_keys_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_key UNIQUE (key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: configuration_backups configuration_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuration_backups
    ADD CONSTRAINT configuration_backups_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: system_incidents system_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_incidents
    ADD CONSTRAINT system_incidents_pkey PRIMARY KEY (id);


--
-- Name: usage_logs usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_user_id_achievement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: webhook_logs webhook_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_configuration_backups_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_configuration_backups_expires ON public.configuration_backups USING btree (expires_at);


--
-- Name: idx_configuration_backups_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_configuration_backups_user_type ON public.configuration_backups USING btree (user_id, backup_type);


--
-- Name: idx_profiles_referral_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_referral_code ON public.profiles USING btree (referral_code);


--
-- Name: idx_webhook_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs USING btree (created_at DESC);


--
-- Name: idx_webhook_logs_webhook_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs USING btree (webhook_id);


--
-- Name: profiles trigger_generate_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_referral_code BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();


--
-- Name: notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: system_incidents update_system_incidents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_system_incidents_updated_at BEFORE UPDATE ON public.system_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webhooks update_webhooks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: configuration_backups configuration_backups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuration_backups
    ADD CONSTRAINT configuration_backups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: usage_logs usage_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE SET NULL;


--
-- Name: usage_logs usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webhook_logs webhook_logs_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_logs
    ADD CONSTRAINT webhook_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE CASCADE;


--
-- Name: achievements Achievements are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Achievements are viewable by everyone" ON public.achievements FOR SELECT USING (true);


--
-- Name: system_incidents Admins can delete incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete incidents" ON public.system_incidents FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: system_incidents Admins can insert incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert incidents" ON public.system_incidents FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: system_incidents Admins can update incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update incidents" ON public.system_incidents FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: newsletter_subscribers Anyone can subscribe to newsletter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: system_incidents Anyone can view system incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view system incidents" ON public.system_incidents FOR SELECT USING (true);


--
-- Name: newsletter_subscribers Public can check subscription status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can check subscription status" ON public.newsletter_subscribers FOR SELECT USING (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: referrals System can insert referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert referrals" ON public.referrals FOR INSERT WITH CHECK (true);


--
-- Name: user_achievements System can insert user achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert user achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);


--
-- Name: referrals System can update referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update referrals" ON public.referrals FOR UPDATE USING (true);


--
-- Name: api_keys Users can create their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own API keys" ON public.api_keys FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: webhooks Users can create their own webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own webhooks" ON public.webhooks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: api_keys Users can delete their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own API keys" ON public.api_keys FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: configuration_backups Users can delete their own backups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own backups" ON public.configuration_backups FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: email_templates Users can delete their own email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own email templates" ON public.email_templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: webhooks Users can delete their own webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own webhooks" ON public.webhooks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: alert_thresholds Users can insert their own alert thresholds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own alert thresholds" ON public.alert_thresholds FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: audit_logs Users can insert their own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own audit logs" ON public.audit_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: configuration_backups Users can insert their own backups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own backups" ON public.configuration_backups FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: email_templates Users can insert their own email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own email templates" ON public.email_templates FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can insert their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification preferences" ON public.notification_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions Users can insert their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: usage_logs Users can insert their own usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own usage logs" ON public.usage_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: api_keys Users can update their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own API keys" ON public.api_keys FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: alert_thresholds Users can update their own alert thresholds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own alert thresholds" ON public.alert_thresholds FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: email_templates Users can update their own email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own email templates" ON public.email_templates FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can update their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification preferences" ON public.notification_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can update their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: webhooks Users can update their own webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own webhooks" ON public.webhooks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: referrals Users can view referrals where they are referred; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view referrals where they are referred" ON public.referrals FOR SELECT USING ((referred_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: api_keys Users can view their own API keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own API keys" ON public.api_keys FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_achievements Users can view their own achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: alert_thresholds Users can view their own alert thresholds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own alert thresholds" ON public.alert_thresholds FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: audit_logs Users can view their own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: configuration_backups Users can view their own backups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own backups" ON public.configuration_backups FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: email_templates Users can view their own email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own email templates" ON public.email_templates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can view their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification preferences" ON public.notification_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals Users can view their own referrals as referrer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own referrals as referrer" ON public.referrals FOR SELECT USING ((referrer_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: usage_logs Users can view their own usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own usage logs" ON public.usage_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: webhooks Users can view their own webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own webhooks" ON public.webhooks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: webhook_logs Users can view their webhook logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their webhook logs" ON public.webhook_logs FOR SELECT USING ((webhook_id IN ( SELECT webhooks.id
   FROM public.webhooks
  WHERE (webhooks.user_id = auth.uid()))));


--
-- Name: achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: alert_thresholds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: configuration_backups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.configuration_backups ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: system_incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_achievements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;