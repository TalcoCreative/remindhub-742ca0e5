
-- =========================================
-- 1. ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
CREATE TYPE public.lead_status AS ENUM (
  'new', 'not_followed_up', 'followed_up', 'in_progress',
  'picked_up', 'sign_contract', 'completed', 'lost', 'cancelled'
);
CREATE TYPE public.lead_source AS ENUM (
  'whatsapp', 'web', 'instagram', 'referral', 'campaign', 'partner', 'manual', 'tiktok', 'event', 'friend'
);
CREATE TYPE public.lead_type AS ENUM ('b2c', 'b2b');

-- =========================================
-- 2. PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================
-- 3. USER ROLES
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'operator',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 4. LEADS
-- =========================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type lead_type NOT NULL DEFAULT 'b2c',
  company TEXT,
  address TEXT,
  area TEXT,
  source lead_source NOT NULL DEFAULT 'manual',
  first_touch_source lead_source,
  last_touch_source lead_source,
  form_source TEXT,
  platform_source TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  reason_lost TEXT,
  assigned_pic TEXT,
  notes TEXT,
  last_contacted TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  estimated_kg NUMERIC DEFAULT 0,
  actual_kg NUMERIC,
  b2b_processed_kg NUMERIC,
  pickup_date DATE,
  pickup_status TEXT,
  contract_status TEXT,
  potential_value NUMERIC DEFAULT 0,
  deal_value NUMERIC,
  final_value NUMERIC,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Allow public form submissions (no auth needed for insert)
CREATE POLICY "Public can insert leads via form" ON public.leads FOR INSERT TO anon WITH CHECK (true);

-- =========================================
-- 5. LEAD AUDIT LOG
-- =========================================
CREATE TABLE public.lead_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit log" ON public.lead_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit log" ON public.lead_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================
-- 6. FORMS
-- =========================================
CREATE TABLE public.forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'web',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active forms" ON public.forms FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated can view all forms" ON public.forms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage forms" ON public.forms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update forms" ON public.forms FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete forms" ON public.forms FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 7. FORM SUBMISSIONS
-- =========================================
CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  source_platform TEXT,
  campaign_name TEXT,
  lead_id UUID REFERENCES public.leads(id),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view submissions" ON public.form_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can submit forms" ON public.form_submissions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can submit forms" ON public.form_submissions FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================
-- 8. CHATS + MESSAGES
-- =========================================
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  last_message TEXT,
  last_timestamp TIMESTAMPTZ,
  unread INTEGER NOT NULL DEFAULT 0,
  status lead_status NOT NULL DEFAULT 'new',
  lead_id UUID REFERENCES public.leads(id),
  assigned_pic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view chats" ON public.chats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert chats" ON public.chats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update chats" ON public.chats FOR UPDATE TO authenticated USING (true);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'agent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view messages" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);

-- =========================================
-- 9. TRIGGERS
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_chats_updated_at BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operator');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime for chats and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
