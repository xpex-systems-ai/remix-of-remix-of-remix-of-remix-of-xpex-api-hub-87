-- Enable realtime for brain_decisions and agent_registry tables
ALTER TABLE public.brain_decisions REPLICA IDENTITY FULL;
ALTER TABLE public.agent_registry REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_registry;