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
    hide_streaks BOOLEAN DEFAULT FALSE,
    user_tag JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REPAIR / MIGRATION:
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hide_streaks BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_tag JSONB;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

-- 3. FOLLOWS TABLE (Social Graph)
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- 4. CONFIG TABLE (For Admin Toggles)
CREATE TABLE IF NOT EXISTS public.config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB DEFAULT 'true'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- 5. TRAFFIC LOGS (For Analytics)
CREATE TABLE IF NOT EXISTS public.traffic_logs (
    session_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    hardware_id TEXT,
    user_agent TEXT,
    duration INTEGER DEFAULT 0,
    page_views JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.traffic_logs ENABLE ROW LEVEL SECURITY;

-- 6. FRIEND STREAKS SYSTEM
CREATE TABLE IF NOT EXISTS public.friend_streaks (
    user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_count INTEGER DEFAULT 0,
    last_streak_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user1_id, user2_id),
    CONSTRAINT user_order CHECK (user1_id < user2_id)
);

ALTER TABLE public.friend_streaks ENABLE ROW LEVEL SECURITY;

-- 7. ROLES & BANS SYSTEM (Added in V6.5)
CREATE TABLE IF NOT EXISTS public.roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('full_admin', 'sub_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hardware_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hardware_id TEXT NOT NULL UNIQUE,
    reason TEXT,
    banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.hardware_bans ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ban_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
ALTER TABLE public.ban_requests ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Follows
DROP POLICY IF EXISTS "Follows are viewable by everyone." ON public.follows;
CREATE POLICY "Follows are viewable by everyone." ON public.follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can follow others." ON public.follows;
CREATE POLICY "Users can follow others." ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can unfollow others." ON public.follows;
CREATE POLICY "Users can unfollow others." ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Daily Photos
DROP POLICY IF EXISTS "Active photos are viewable by everyone." ON public.daily_photos;
CREATE POLICY "Active photos are viewable by everyone." ON public.daily_photos FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "Users can insert their own photos." ON public.daily_photos;
CREATE POLICY "Users can insert their own photos." ON public.daily_photos FOR INSERT WITH CHECK (auth.uid() = creator_uid);
DROP POLICY IF EXISTS "Users can update their own photos." ON public.daily_photos;
CREATE POLICY "Users can update their own photos." ON public.daily_photos FOR UPDATE USING (auth.uid() = creator_uid);
DROP POLICY IF EXISTS "Users can delete their own photos." ON public.daily_photos;
CREATE POLICY "Users can delete their own photos." ON public.daily_photos FOR DELETE USING (auth.uid() = creator_uid);

-- Storage
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('daily_photos', 'profile_pictures'));
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('daily_photos', 'profile_pictures') AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "User Delete" ON storage.objects;
CREATE POLICY "User Delete" ON storage.objects FOR DELETE USING (bucket_id IN ('daily_photos', 'profile_pictures') AND (storage.foldername(name))[1] = auth.uid()::text);

-- Config
DROP POLICY IF EXISTS "Everyone can view config." ON public.config;
CREATE POLICY "Everyone can view config." ON public.config FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can update config." ON public.config;
CREATE POLICY "Admins can update config." ON public.config FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (email = '4simpleproblems@gmail.com' OR is_admin = true)));

-- Traffic Logs
DROP POLICY IF EXISTS "Admins can view traffic logs." ON public.traffic_logs;
CREATE POLICY "Admins can view traffic logs." ON public.traffic_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (email = '4simpleproblems@gmail.com' OR is_admin = true)));
DROP POLICY IF EXISTS "Users can insert their own logs." ON public.traffic_logs;
CREATE POLICY "Users can insert their own logs." ON public.traffic_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Roles, Bans, requests
DROP POLICY IF EXISTS "Admins and self can view roles." ON public.roles;
CREATE POLICY "Admins and self can view roles." ON public.roles FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = TRUE) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage roles." ON public.roles;
CREATE POLICY "Admins can manage roles." ON public.roles FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (email = '4simpleproblems@gmail.com' OR is_admin = TRUE)));
DROP POLICY IF EXISTS "Admins can manage all bans." ON public.bans;
CREATE POLICY "Admins can manage all bans." ON public.bans FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (email = '4simpleproblems@gmail.com' OR is_admin = TRUE)));
DROP POLICY IF EXISTS "Users can view their own ban status." ON public.bans;
CREATE POLICY "Users can view their own ban status." ON public.bans FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage hardware bans." ON public.hardware_bans;
CREATE POLICY "Admins can manage hardware bans." ON public.hardware_bans FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (email = '4simpleproblems@gmail.com' OR is_admin = TRUE)));
DROP POLICY IF EXISTS "Full admins can view all ban requests." ON public.ban_requests;
CREATE POLICY "Full admins can view all ban requests." ON public.ban_requests FOR SELECT USING (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND role = 'full_admin') OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (email = '4simpleproblems@gmail.com' OR is_admin = TRUE)));
DROP POLICY IF EXISTS "Sub-admins can create ban requests." ON public.ban_requests;
CREATE POLICY "Sub-admins can create ban requests." ON public.ban_requests FOR INSERT WITH CHECK (auth.uid() = requester_id AND (EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND role IN ('full_admin', 'sub_admin')) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (email = '4simpleproblems@gmail.com' OR is_admin = TRUE))));

-- 9. RPC FUNCTIONS

-- Time tracking
CREATE OR REPLACE FUNCTION public.increment_v6_time(uid UUID, added_time INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.profiles SET total_v6_time = total_v6_time + added_time, last_active = NOW() WHERE id = uid;
END;
$$;

-- Social interaction
CREATE OR REPLACE FUNCTION public.like_photo(photo_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE u_id UUID := auth.uid();
BEGIN
    UPDATE public.daily_photos SET hearts = CASE WHEN u_id = ANY(hearts) THEN array_remove(hearts, u_id) ELSE array_append(hearts, u_id) END WHERE id = photo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.comment_on_photo(photo_id UUID, comment_text TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE u_id UUID := auth.uid(); u_name TEXT; new_comment JSONB;
BEGIN
    SELECT username INTO u_name FROM public.profiles WHERE id = u_id;
    new_comment := jsonb_build_object('userId', u_id, 'username', COALESCE(u_name, 'Anonymous'), 'text', comment_text, 'createdAt', NOW());
    UPDATE public.daily_photos SET comments = COALESCE(comments, '[]'::jsonb) || new_comment WHERE id = photo_id;
END;
$$;

-- Administrative
CREATE OR REPLACE FUNCTION public.set_user_tag(target_user_id UUID, tag_text TEXT, tag_color TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (is_admin = TRUE OR email = '4simpleproblems@gmail.com')) 
    OR EXISTS (SELECT 1 FROM public.roles WHERE user_id = auth.uid() AND role IN ('full_admin', 'sub_admin')) THEN
        UPDATE public.profiles SET user_tag = CASE WHEN tag_text IS NULL OR tag_text = '' THEN NULL ELSE jsonb_build_object('text', tag_text, 'color', tag_color) END WHERE id = target_user_id;
    ELSE RAISE EXCEPTION 'Unauthorized: Only admins can set user tags.';
    END IF;
END;
$$;

-- Vault Access (The Secret Bridge)
CREATE OR REPLACE FUNCTION public.get_secret(secret_name TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = secret_name);
END;
$$;

-- 10. REALTIME SETUP
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hardware_bans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ban_requests;

-- 11. INITIAL ADMIN ROLE
INSERT INTO public.roles (user_id, role)
SELECT id, 'full_admin' FROM auth.users WHERE email = '4simpleproblems@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
