-- Enable RLS (Safe to run multiple times)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflict errors
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chats;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.app_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.app_settings;

-- Create Policies (Read for all, Insert for authenticated)
CREATE POLICY "Enable read access for all users" ON public.chats FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- App Settings Policies
CREATE POLICY "Enable read access for all users" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Enable update for authenticated users" ON public.app_settings FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON public.app_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- Enable Realtime (Idempotent check)
DO $$
BEGIN
  -- Add chats to publication if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  END IF;

  -- Add messages to publication if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  
   -- Add app_settings to publication if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
END $$;
