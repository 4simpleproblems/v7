-- SUPABASE COMPREHENSIVE SCHEMA SETUP FOR PROJECT NIOBIUM
-- Run this in your Supabase SQL Editor

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    email TEXT,
    auth_method TEXT,
    pfp_type TEXT DEFAULT 'letter',
    pfp_letter_bg TEXT,
    pfp_letter_char TEXT,
    mibi_config JSONB,
    show_offline BOOLEAN DEFAULT FALSE,
    navbar_theme JSONB,
    points INTEGER DEFAULT 0,
    total_v6_time INTEGER DEFAULT 0,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    leaderboard_accepted BOOLEAN DEFAULT FALSE,
    leaderboard_opt_out BOOLEAN DEFAULT FALSE,
    school_id TEXT,
    school_name TEXT,
    school_skipped BOOLEAN DEFAULT FALSE,
    district_id TEXT,
    state TEXT,
    state_abbr TEXT,
    school_changes_this_month INTEGER DEFAULT 0,
    last_school_change_month INTEGER DEFAULT 0,
    daily_slots_used JSONB DEFAULT '[]'::jsonb,
    blocked_users UUID[] DEFAULT '{}',
    is_admin BOOLEAN DEFAULT FALSE,
    is_tester BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REPAIR / MIGRATION:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_method TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pfp_type TEXT DEFAULT 'letter';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pfp_letter_bg TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pfp_letter_char TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mibi_config JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_offline BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS navbar_theme JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state_abbr TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_changes_this_month INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_school_change_month INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_slots_used JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_users UUID[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_tester BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES (Profiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile."
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile."
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- 4. POLICIES (Daily Photos)
CREATE TABLE IF NOT EXISTS public.daily_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_uid UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    creator_username TEXT,
    image_url TEXT NOT NULL,
    title TEXT,
    school_id TEXT,
    district_id TEXT,
    status TEXT DEFAULT 'active',
    hearts UUID[] DEFAULT '{}',
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.daily_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active photos are viewable by everyone." ON public.daily_photos;
CREATE POLICY "Active photos are viewable by everyone."
ON public.daily_photos
FOR SELECT
USING (status = 'active');

DROP POLICY IF EXISTS "Users can insert their own photos." ON public.daily_photos;
CREATE POLICY "Users can insert their own photos."
ON public.daily_photos
FOR INSERT
WITH CHECK (auth.uid() = creator_uid);

DROP POLICY IF EXISTS "Users can update their own photos." ON public.daily_photos;
CREATE POLICY "Users can update their own photos."
ON public.daily_photos
FOR UPDATE
USING (auth.uid() = creator_uid);

-- 5. POLICIES (Storage)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects
FOR SELECT
USING (bucket_id IN ('daily_photos', 'profile_pictures'));

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id IN ('daily_photos', 'profile_pictures')
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "User Delete" ON storage.objects;
CREATE POLICY "User Delete"
ON storage.objects
FOR DELETE
USING (
    bucket_id IN ('daily_photos', 'profile_pictures')
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 6. CONFIG TABLE (For Admin Toggles)
CREATE TABLE IF NOT EXISTS public.config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB DEFAULT 'true'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view config." ON public.config;
CREATE POLICY "Everyone can view config."
ON public.config
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can update config." ON public.config;
CREATE POLICY "Admins can update config."
ON public.config
FOR ALL
TO authenticated
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

-- 7. TRAFFIC LOGS (For Analytics)
CREATE TABLE IF NOT EXISTS public.traffic_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id TEXT,
    hardware_id TEXT,
    path TEXT,
    title TEXT,
    user_agent TEXT,
    duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.traffic_logs ENABLE ROW LEVEL SECURITY;

-- IMPORTANT FIX: drop the policy before recreating it (prevents 42710)
DROP POLICY IF EXISTS "Admins can view traffic logs." ON public.traffic_logs;
CREATE POLICY "Admins can view traffic logs."
ON public.traffic_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (email = '4simpleproblems@gmail.com' OR is_admin = true)
  )
);

DROP POLICY IF EXISTS "Users can insert their own logs." ON public.traffic_logs;
CREATE POLICY "Users can insert their own logs."
ON public.traffic_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 8. REALTIME SETUP
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 9. DELETE USER FUNCTION (RPC)
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
