-- Enable RLS on all tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Enable read access for all users" ON public.leads;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.leads;
DROP POLICY IF EXISTS "Enable update for all users" ON public.leads;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.leads;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.contacts;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.contacts;
DROP POLICY IF EXISTS "Enable update for all users" ON public.contacts;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.contacts;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.broadcast_logs;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.broadcast_logs;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.forms;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.forms;
DROP POLICY IF EXISTS "Enable update for all users" ON public.forms;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.form_submissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.form_submissions;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.chats;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.chats;
DROP POLICY IF EXISTS "Enable update for all users" ON public.chats;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.messages;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.app_settings;

-- Create Permissive Policies (Review for Production!)
-- Using (true) allows anonymous access which is useful for testing without auth.
-- If you require login, change USING (true) to USING (auth.role() = 'authenticated').

-- LEADS
CREATE POLICY "Enable read access for all users" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.leads FOR DELETE USING (true);

-- CONTACTS
CREATE POLICY "Enable read access for all users" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON public.contacts FOR DELETE USING (true);

-- BROADCASTS
CREATE POLICY "Enable read access for all users" ON public.broadcast_logs FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.broadcast_logs FOR INSERT WITH CHECK (true);

-- FORMS
CREATE POLICY "Enable read access for all users" ON public.forms FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.forms FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.forms FOR UPDATE USING (true);

-- FORM SUBMISSIONS
CREATE POLICY "Enable read access for all users" ON public.form_submissions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.form_submissions FOR INSERT WITH CHECK (true);

-- CHATS & MESSAGES
CREATE POLICY "Enable read access for all users" ON public.chats FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.chats FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.messages FOR INSERT WITH CHECK (true);

-- APP SETTINGS
CREATE POLICY "Enable read access for all users" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Enable update for all users" ON public.app_settings FOR UPDATE USING (true);
CREATE POLICY "Enable insert for all users" ON public.app_settings FOR INSERT WITH CHECK (true);


-- Enable Realtime for all tables
DO $$
DECLARE
  schema_nav text := 'public';
  table_nav text;
BEGIN
  FOR table_nav IN 
    SELECT tablename FROM pg_tables WHERE schemaname = schema_nav
  LOOP
    -- Check if table is already in the publication to avoid errors
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = schema_nav 
      AND tablename = table_nav
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || schema_nav || '.' || table_nav;
    END IF;
  END LOOP;
END $$;
