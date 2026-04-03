-- SUPABASE COMPREHENSIVE SCHEMA SETUP FOR PROJECT NIOBIUM
-- Run this in your Supabase SQL Editor

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    description TEXT,
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
    username_changes_this_month INTEGER DEFAULT 0,
    last_username_change_month INTEGER DEFAULT 0,
    daily_slots_used JSONB DEFAULT '[]'::jsonb,
    blocked_users UUID[] DEFAULT '{}',
    is_admin BOOLEAN DEFAULT FALSE,
    is_tester BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REPAIR / MIGRATION:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_method TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS description TEXT;
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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_changes_this_month INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_username_change_month INTEGER DEFAULT 0;
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

-- 2. DAILY PHOTOS TABLE
CREATE TABLE IF NOT EXISTS public.daily_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 2.5 FOLLOWS TABLE (Social Graph)
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 2.6 POLICIES (Follows)
DROP POLICY IF EXISTS "Follows are viewable by everyone." ON public.follows;
CREATE POLICY "Follows are viewable by everyone." ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others." ON public.follows;
CREATE POLICY "Users can follow others." ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow others." ON public.follows;
CREATE POLICY "Users can unfollow others." ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- 2.7 POLICIES (Daily Photos)
DROP POLICY IF EXISTS "Active photos are viewable by everyone." ON public.daily_photos;
CREATE POLICY "Active photos are viewable by everyone." ON public.daily_photos FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users can insert their own photos." ON public.daily_photos;
CREATE POLICY "Users can insert their own photos." ON public.daily_photos FOR INSERT WITH CHECK (auth.uid() = creator_uid);

DROP POLICY IF EXISTS "Users can update their own photos." ON public.daily_photos;
CREATE POLICY "Users can update their own photos." ON public.daily_photos FOR UPDATE USING (auth.uid() = creator_uid);

DROP POLICY IF EXISTS "Users can delete their own photos." ON public.daily_photos;
CREATE POLICY "Users can delete their own photos." ON public.daily_photos FOR DELETE USING (auth.uid() = creator_uid);

-- 3. POLICIES (Profiles)

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

-- 10. AUTOMATIC PROFILE CREATION TRIGGER
-- This function runs every time a user signs up or logs in via OAuth
-- It extracts metadata like 'picture' or 'avatar_url' and ensures the profile exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val TEXT;
  display_name_val TEXT;
  avatar_url_val TEXT;
BEGIN
  -- Extract values from raw_user_meta_data (Supabase standard)
  display_name_val := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  
  avatar_url_val := COALESCE(
    new.raw_user_meta_data->>'picture',
    new.raw_user_meta_data->>'avatar_url'
  );

  username_val := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  -- UPSERT into profiles table
  INSERT INTO public.profiles (id, email, username, display_name, avatar_url, auth_method)
  VALUES (
    new.id,
    new.email,
    username_val,
    display_name_val,
    avatar_url_val,
    new.raw_app_meta_data->>'provider'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    -- Only update avatar if it was missing or if they are using Google/Discord
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    auth_method = EXCLUDED.auth_method,
    updated_at = NOW();

  RETURN new;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. DAILY PHOTO STREAK NOTIFICATION LOGIC
CREATE OR REPLACE FUNCTION public.get_daily_photo_notification_state(
    current_user_id UUID,
    friend_user_id UUID
)
RETURNS TABLE(sender_id UUID, laggard_id UUID, needs_notification BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_posted BOOLEAN;
    v_friend_posted BOOLEAN;
    v_posted_at_current TIMESTAMPTZ;
    v_posted_at_friend TIMESTAMPTZ;
    v_today_start TIMESTAMPTZ;
BEGIN
    v_today_start := date_trunc('day', NOW() AT TIME ZONE 'UTC');

    -- Check if the current user has posted today
    SELECT created_at INTO v_posted_at_current
    FROM public.daily_photos
    WHERE creator_uid = current_user_id
    AND created_at >= v_today_start
    ORDER BY created_at DESC
    LIMIT 1;

    -- Check if the friend has posted today
    SELECT created_at INTO v_posted_at_friend
    FROM public.daily_photos
    WHERE creator_uid = friend_user_id
    AND created_at >= v_today_start
    ORDER BY created_at DESC
    LIMIT 1;

    v_current_user_posted := v_posted_at_current IS NOT NULL;
    v_friend_posted := v_posted_at_friend IS NOT NULL;

    IF v_current_user_posted AND NOT v_friend_posted THEN
        RETURN QUERY SELECT current_user_id, friend_user_id, TRUE;
    ELSE
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, FALSE;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.are_users_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.follows
        WHERE (follower_id = user1_id AND following_id = user2_id)
           OR (follower_id = user2_id AND following_id = user1_id)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_photo_laggards(
    current_user_id UUID,
    client_today_start TIMESTAMPTZ,
    client_today_end TIMESTAMPTZ
)
RETURNS TABLE(laggard_id UUID, laggard_username TEXT, laggard_display_name TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_user_posted_today BOOLEAN;
BEGIN
    -- Check if current user posted in their local "today" window
    SELECT EXISTS (
        SELECT 1 FROM public.daily_photos 
        WHERE creator_uid = current_user_id 
        AND created_at >= client_today_start
        AND created_at <= client_today_end
    ) INTO v_current_user_posted_today;

    -- If current user hasn't posted, they don't need to remind anyone
    IF NOT v_current_user_posted_today THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT p.id, p.username, p.display_name
    FROM public.follows f
    JOIN public.profiles p ON p.id = f.following_id
    WHERE f.follower_id = current_user_id
      AND EXISTS (
          SELECT 1 FROM public.follows f2 
          WHERE f2.follower_id = f.following_id AND f2.following_id = current_user_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.daily_photos dp 
          WHERE dp.creator_uid = f.following_id 
          AND dp.created_at >= client_today_start
          AND dp.created_at <= client_today_end
      );
END;
$$;