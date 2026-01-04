CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
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


--
-- Name: add_credits(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_credits(p_user_id uuid, p_amount integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
-- Name: deduct_credits(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer DEFAULT 1) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
-- Name: grant_signup_bonus(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.grant_signup_bonus() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
-- Name: rotate_api_key(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rotate_api_key(p_key_id uuid, p_user_id uuid) RETURNS TABLE(new_key_id uuid, new_key text, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
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
-- Name: validate_api_key_extended(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_api_key_extended(p_key text) RETURNS TABLE(valid boolean, user_id uuid, key_id uuid, credits integer, tier text, is_sandbox boolean, is_expired boolean)
    LANGUAGE plpgsql SECURITY DEFINER
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
-- Name: agent_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    endpoint text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    capabilities text[] DEFAULT '{}'::text[],
    performance_score numeric(5,4) DEFAULT 0.95,
    avg_latency_ms integer DEFAULT 100,
    cost_per_call numeric(10,6) DEFAULT 1.0,
    success_rate numeric(5,4) DEFAULT 0.99,
    current_load integer DEFAULT 0,
    max_load integer DEFAULT 1000,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_registry_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'degraded'::text, 'maintenance'::text])))
);

ALTER TABLE ONLY public.agent_registry REPLICA IDENTITY FULL;


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
    is_sandbox boolean DEFAULT false,
    expires_at timestamp with time zone,
    rotated_from uuid,
    rotation_scheduled_at timestamp with time zone,
    environment text DEFAULT 'production'::text,
    CONSTRAINT api_keys_environment_check CHECK ((environment = ANY (ARRAY['sandbox'::text, 'production'::text]))),
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
-- Name: auto_recharge_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_recharge_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    threshold_credits integer DEFAULT 100 NOT NULL,
    recharge_amount integer DEFAULT 1000 NOT NULL,
    recharge_package text DEFAULT 'starter'::text NOT NULL,
    stripe_payment_method_id text,
    last_recharge_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brain_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brain_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value jsonb NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brain_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brain_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    decision_type text NOT NULL,
    inputs jsonb DEFAULT '{}'::jsonb NOT NULL,
    decision jsonb DEFAULT '{}'::jsonb NOT NULL,
    confidence_score numeric(5,4),
    execution_result jsonb,
    latency_ms integer,
    risk_assessment jsonb,
    agent_selected text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT brain_decisions_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric)))
);

ALTER TABLE ONLY public.brain_decisions REPLICA IDENTITY FULL;


--
-- Name: bulk_validation_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_validation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    file_name text NOT NULL,
    total_emails integer DEFAULT 0 NOT NULL,
    processed_emails integer DEFAULT 0 NOT NULL,
    valid_emails integer DEFAULT 0 NOT NULL,
    invalid_emails integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    results jsonb,
    error_message text,
    credits_used integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_at timestamp with time zone,
    schedule_status text DEFAULT 'immediate'::text,
    pending_emails text[],
    CONSTRAINT bulk_validation_jobs_schedule_status_check CHECK ((schedule_status = ANY (ARRAY['immediate'::text, 'scheduled'::text, 'processing'::text])))
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
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL,
    description text,
    balance_after integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_transactions_type_check CHECK ((type = ANY (ARRAY['purchase'::text, 'deduction'::text, 'subscription'::text, 'referral'::text, 'refund'::text, 'adjustment'::text])))
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
-- Name: agent_registry agent_registry_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_registry
    ADD CONSTRAINT agent_registry_name_key UNIQUE (name);


--
-- Name: agent_registry agent_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_registry
    ADD CONSTRAINT agent_registry_pkey PRIMARY KEY (id);


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
-- Name: auto_recharge_settings auto_recharge_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_recharge_settings
    ADD CONSTRAINT auto_recharge_settings_pkey PRIMARY KEY (id);


--
-- Name: auto_recharge_settings auto_recharge_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_recharge_settings
    ADD CONSTRAINT auto_recharge_settings_user_id_key UNIQUE (user_id);


--
-- Name: brain_config brain_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_config
    ADD CONSTRAINT brain_config_config_key_key UNIQUE (config_key);


--
-- Name: brain_config brain_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_config
    ADD CONSTRAINT brain_config_pkey PRIMARY KEY (id);


--
-- Name: brain_decisions brain_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_decisions
    ADD CONSTRAINT brain_decisions_pkey PRIMARY KEY (id);


--
-- Name: bulk_validation_jobs bulk_validation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_validation_jobs
    ADD CONSTRAINT bulk_validation_jobs_pkey PRIMARY KEY (id);


--
-- Name: configuration_backups configuration_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuration_backups
    ADD CONSTRAINT configuration_backups_pkey PRIMARY KEY (id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


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
-- Name: idx_agent_registry_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_registry_status ON public.agent_registry USING btree (status);


--
-- Name: idx_api_keys_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_expires_at ON public.api_keys USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_api_keys_sandbox; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_sandbox ON public.api_keys USING btree (is_sandbox) WHERE (is_sandbox = true);


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
-- Name: idx_brain_decisions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_decisions_created_at ON public.brain_decisions USING btree (created_at DESC);


--
-- Name: idx_brain_decisions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_decisions_type ON public.brain_decisions USING btree (decision_type);


--
-- Name: idx_brain_decisions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brain_decisions_user_id ON public.brain_decisions USING btree (user_id);


--
-- Name: idx_bulk_validation_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_validation_scheduled ON public.bulk_validation_jobs USING btree (scheduled_at, status) WHERE (scheduled_at IS NOT NULL);


--
-- Name: idx_configuration_backups_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_configuration_backups_expires ON public.configuration_backups USING btree (expires_at);


--
-- Name: idx_configuration_backups_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_configuration_backups_user_type ON public.configuration_backups USING btree (user_id, backup_type);


--
-- Name: idx_credit_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions USING btree (created_at DESC);


--
-- Name: idx_credit_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions USING btree (user_id);


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
-- Name: profiles on_profile_created_grant_bonus; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_grant_bonus BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.grant_signup_bonus();


--
-- Name: profiles trigger_generate_referral_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_referral_code BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();


--
-- Name: agent_registry update_agent_registry_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_registry_updated_at BEFORE UPDATE ON public.agent_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: auto_recharge_settings update_auto_recharge_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_auto_recharge_updated_at BEFORE UPDATE ON public.auto_recharge_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: brain_config update_brain_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brain_config_updated_at BEFORE UPDATE ON public.brain_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bulk_validation_jobs update_bulk_validation_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bulk_validation_updated_at BEFORE UPDATE ON public.bulk_validation_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: api_keys api_keys_rotated_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_rotated_from_fkey FOREIGN KEY (rotated_from) REFERENCES public.api_keys(id);


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: brain_decisions brain_decisions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brain_decisions
    ADD CONSTRAINT brain_decisions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


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
-- Name: achievements Admin delete achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin delete achievements" ON public.achievements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_registry Admin delete agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin delete agents" ON public.agent_registry FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brain_config Admin delete brain config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin delete brain config" ON public.brain_config FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: achievements Admin insert achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin insert achievements" ON public.achievements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_registry Admin insert agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin insert agents" ON public.agent_registry FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brain_config Admin insert brain config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin insert brain config" ON public.brain_config FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: achievements Admin update achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin update achievements" ON public.achievements FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_registry Admin update agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin update agents" ON public.agent_registry FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brain_config Admin update brain config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin update brain config" ON public.brain_config FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


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
-- Name: brain_decisions Admins can view all decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all decisions" ON public.brain_decisions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Anyone can subscribe to newsletter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: system_incidents Anyone can view system incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view system incidents" ON public.system_incidents FOR SELECT USING (true);


--
-- Name: agent_registry Auth users can view agents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth users can view agents" ON public.agent_registry FOR SELECT TO authenticated USING (true);


--
-- Name: achievements Auth users view achievements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth users view achievements" ON public.achievements FOR SELECT TO authenticated USING (true);


--
-- Name: brain_config Auth view brain config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Auth view brain config" ON public.brain_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Check subscription by email only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Check subscription by email only" ON public.newsletter_subscribers FOR SELECT USING (true);


--
-- Name: brain_decisions System can insert decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert decisions" ON public.brain_decisions FOR INSERT WITH CHECK (true);


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
-- Name: alert_thresholds Users can delete their own alert thresholds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own alert thresholds" ON public.alert_thresholds FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: auto_recharge_settings Users can delete their own auto-recharge settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own auto-recharge settings" ON public.auto_recharge_settings FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: configuration_backups Users can delete their own backups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own backups" ON public.configuration_backups FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: bulk_validation_jobs Users can delete their own bulk jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own bulk jobs" ON public.bulk_validation_jobs FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: email_templates Users can delete their own email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own email templates" ON public.email_templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notification_preferences Users can delete their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notification preferences" ON public.notification_preferences FOR DELETE TO authenticated USING ((auth.uid() = user_id));


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
-- Name: auto_recharge_settings Users can insert their own auto-recharge settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own auto-recharge settings" ON public.auto_recharge_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: configuration_backups Users can insert their own backups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own backups" ON public.configuration_backups FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: bulk_validation_jobs Users can insert their own bulk jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own bulk jobs" ON public.bulk_validation_jobs FOR INSERT WITH CHECK ((auth.uid() = user_id));


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
-- Name: auto_recharge_settings Users can update their own auto-recharge settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own auto-recharge settings" ON public.auto_recharge_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: bulk_validation_jobs Users can update their own bulk jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own bulk jobs" ON public.bulk_validation_jobs FOR UPDATE USING ((auth.uid() = user_id));


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
-- Name: auto_recharge_settings Users can view their own auto-recharge settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own auto-recharge settings" ON public.auto_recharge_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: configuration_backups Users can view their own backups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own backups" ON public.configuration_backups FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bulk_validation_jobs Users can view their own bulk jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bulk jobs" ON public.bulk_validation_jobs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: brain_decisions Users can view their own decisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own decisions" ON public.brain_decisions FOR SELECT USING ((auth.uid() = user_id));


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
-- Name: credit_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.credit_transactions FOR SELECT USING ((auth.uid() = user_id));


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
-- Name: agent_registry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;

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
-- Name: auto_recharge_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auto_recharge_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: brain_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brain_config ENABLE ROW LEVEL SECURITY;

--
-- Name: brain_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brain_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: bulk_validation_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bulk_validation_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: configuration_backups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.configuration_backups ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

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