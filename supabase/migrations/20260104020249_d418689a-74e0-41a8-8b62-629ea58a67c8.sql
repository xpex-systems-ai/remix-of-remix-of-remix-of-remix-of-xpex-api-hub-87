-- ============================================================
-- XPEX NEURAL CORE SECURITY HARDENING - PART 2
-- Continue from agent_registry onwards
-- ============================================================

-- AGENT_REGISTRY TABLE - Drop duplicates and recreate properly
DROP POLICY IF EXISTS "Authenticated users can view agents" ON public.agent_registry;
DROP POLICY IF EXISTS "Admins can insert agents" ON public.agent_registry;
DROP POLICY IF EXISTS "Admins can update agents" ON public.agent_registry;
DROP POLICY IF EXISTS "Admins can delete agents" ON public.agent_registry;
DROP POLICY IF EXISTS "Admins can manage agents" ON public.agent_registry;
DROP POLICY IF EXISTS "Anyone can view agents" ON public.agent_registry;

CREATE POLICY "Auth users can view agents" 
ON public.agent_registry FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admin insert agents" 
ON public.agent_registry FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update agents" 
ON public.agent_registry FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete agents" 
ON public.agent_registry FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- BRAIN_CONFIG - Drop duplicates
DROP POLICY IF EXISTS "Admins can view brain config" ON public.brain_config;
DROP POLICY IF EXISTS "Admins can insert brain config" ON public.brain_config;
DROP POLICY IF EXISTS "Admins can update brain config" ON public.brain_config;
DROP POLICY IF EXISTS "Admins can delete brain config" ON public.brain_config;
DROP POLICY IF EXISTS "Admins can manage config" ON public.brain_config;
DROP POLICY IF EXISTS "Authenticated users can view config" ON public.brain_config;

CREATE POLICY "Auth view brain config" 
ON public.brain_config FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert brain config" 
ON public.brain_config FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update brain config" 
ON public.brain_config FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete brain config" 
ON public.brain_config FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ACHIEVEMENTS TABLE - Drop and recreate
DROP POLICY IF EXISTS "Authenticated users can view achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can insert achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can update achievements" ON public.achievements;
DROP POLICY IF EXISTS "Admins can delete achievements" ON public.achievements;
DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.achievements;
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;

CREATE POLICY "Auth users view achievements" 
ON public.achievements FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admin insert achievements" 
ON public.achievements FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin update achievements" 
ON public.achievements FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete achievements" 
ON public.achievements FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));