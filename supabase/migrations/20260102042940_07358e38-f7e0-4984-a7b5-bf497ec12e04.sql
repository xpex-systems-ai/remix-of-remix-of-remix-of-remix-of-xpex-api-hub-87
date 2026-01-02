-- Brain Layer Decision Audit Table
CREATE TABLE public.brain_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}',
  decision JSONB NOT NULL DEFAULT '{}',
  confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  execution_result JSONB,
  latency_ms INTEGER,
  risk_assessment JSONB,
  agent_selected TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agent Registry Table
CREATE TABLE public.agent_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'degraded', 'maintenance')),
  capabilities TEXT[] DEFAULT '{}',
  performance_score DECIMAL(5,4) DEFAULT 0.95,
  avg_latency_ms INTEGER DEFAULT 100,
  cost_per_call DECIMAL(10,6) DEFAULT 1.0,
  success_rate DECIMAL(5,4) DEFAULT 0.99,
  current_load INTEGER DEFAULT 0,
  max_load INTEGER DEFAULT 1000,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brain Configuration Table
CREATE TABLE public.brain_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_brain_decisions_user_id ON public.brain_decisions(user_id);
CREATE INDEX idx_brain_decisions_created_at ON public.brain_decisions(created_at DESC);
CREATE INDEX idx_brain_decisions_type ON public.brain_decisions(decision_type);
CREATE INDEX idx_agent_registry_status ON public.agent_registry(status);

-- Enable RLS
ALTER TABLE public.brain_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brain_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brain_decisions
CREATE POLICY "Users can view their own decisions"
  ON public.brain_decisions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert decisions"
  ON public.brain_decisions FOR INSERT
  WITH CHECK (true);

-- Admins can view all decisions
CREATE POLICY "Admins can view all decisions"
  ON public.brain_decisions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for agent_registry (read-only for all authenticated)
CREATE POLICY "Authenticated users can view agents"
  ON public.agent_registry FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage agents"
  ON public.agent_registry FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for brain_config
CREATE POLICY "Authenticated users can view config"
  ON public.brain_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage config"
  ON public.brain_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default agents
INSERT INTO public.agent_registry (name, description, endpoint, capabilities, performance_score, avg_latency_ms) VALUES
  ('agent-validate', 'Email validation agent - syntax, domain, and deliverability checks', '/agent-validate', ARRAY['email_validation', 'syntax_check', 'domain_check'], 0.98, 85),
  ('agent-validate-ai', 'AI-powered email validation with risk scoring', '/agent-validate-ai', ARRAY['email_validation', 'ai_analysis', 'risk_scoring'], 0.96, 420),
  ('agent-health', 'System health monitoring agent', '/agent-health', ARRAY['health_check', 'status_report'], 0.99, 25);

-- Insert default brain config
INSERT INTO public.brain_config (config_key, config_value, description) VALUES
  ('routing_strategy', '{"type": "weighted", "factors": ["performance", "load", "cost"]}', 'Agent selection routing strategy'),
  ('fallback_enabled', '{"enabled": true, "cascade_limit": 3}', 'Fallback and cascade configuration'),
  ('risk_thresholds', '{"low": 0.3, "medium": 0.6, "high": 0.8}', 'Risk assessment thresholds'),
  ('decision_latency_target', '{"p95_ms": 100, "p99_ms": 200}', 'Target decision latency');

-- Trigger to update agent_registry.updated_at
CREATE TRIGGER update_agent_registry_updated_at
  BEFORE UPDATE ON public.agent_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brain_config_updated_at
  BEFORE UPDATE ON public.brain_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();