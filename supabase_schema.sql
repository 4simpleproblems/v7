
-- 11. BANS TABLE
CREATE TABLE IF NOT EXISTS public.bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    banned_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- ID of the admin who banned
    banned_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- ID of the user being banned
    reason TEXT,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent bans
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Bans Table
-- Admins can view all bans
DROP POLICY IF EXISTS "Admins can view all bans." ON public.bans;
CREATE POLICY "Admins can view all bans."
ON public.bans
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (email = '4simpleproblems@gmail.com' OR is_admin = true) -- Only allow specific admins
  )
);

-- Admins can create new bans
DROP POLICY IF EXISTS "Admins can create bans." ON public.bans;
CREATE POLICY "Admins can create bans."
ON public.bans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (email = '4simpleproblems@gmail.com' OR is_admin = true)
  )
);

-- Admins can update bans (e.g., deactivate/activate)
DROP POLICY IF EXISTS "Admins can update bans." ON public.bans;
CREATE POLICY "Admins can update bans."
ON public.bans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (email = '4simpleproblems@gmail.com' OR is_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (email = '4simpleproblems@gmail.com' OR is_admin = true)
  )
);

-- Users can view their own ban status (if they are banned)
DROP POLICY IF EXISTS "Users can view their own ban status." ON public.bans;
CREATE POLICY "Users can view their own ban status."
ON public.bans
FOR SELECT
USING (
  auth.uid() = banned_user_id
);

-- 12. UPDATE REALTIME PUBLICATION
-- Add the new bans table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bans;
