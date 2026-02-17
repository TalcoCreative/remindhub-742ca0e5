-- Script Update Skema Database RemindHub
-- Jalankan script ini di SQL Editor Supabase untuk menyinkronkan database dengan kode terbaru.

-- 1. Tabel app_settings (untuk Qontak & System Config)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS & Policies untuk app_settings jika belum ada
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Admins can manage settings') THEN
        CREATE POLICY "Admins can manage settings" ON public.app_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Authenticated can view settings') THEN
        CREATE POLICY "Authenticated can view settings" ON public.app_settings FOR SELECT USING (true);
    END IF;
END
$$;

-- Trigger updated_at untuk app_settings
DROP TRIGGER IF EXISTS update_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default settings jika belum ada
INSERT INTO public.app_settings (key, value) VALUES
  ('qontak_mode', 'dummy'),
  ('qontak_token', ''),
  ('qontak_refresh_token', '')
ON CONFLICT (key) DO NOTHING;


-- 2. Update Tabel chats & messages (Omnichannel Support)
DO $$
BEGIN
    -- Add channel to chats
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chats' AND column_name = 'channel') THEN
        ALTER TABLE public.chats ADD COLUMN channel TEXT NOT NULL DEFAULT 'whatsapp';
        CREATE INDEX idx_chats_channel ON public.chats(channel);
    END IF;

    -- Add channel to messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'channel') THEN
        ALTER TABLE public.messages ADD COLUMN channel TEXT DEFAULT 'whatsapp';
    END IF;
END
$$;


-- 3. Update Tabel broadcast_logs (Image Support)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'broadcast_logs' AND column_name = 'image_url') THEN
        ALTER TABLE public.broadcast_logs ADD COLUMN image_url text DEFAULT NULL;
    END IF;
END
$$;


-- 4. Update Function handle_new_chat_after (Logic Contact Creation)
CREATE OR REPLACE FUNCTION public.handle_new_chat_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _contact_id uuid;
BEGIN
  SELECT id INTO _contact_id FROM public.contacts WHERE phone = NEW.contact_phone;
  
  IF _contact_id IS NULL THEN
    INSERT INTO public.contacts (name, phone, source, sources, type, is_contacted, chat_id, lead_id)
    VALUES (NEW.contact_name, NEW.contact_phone, 'whatsapp', ARRAY['whatsapp'], 'b2c', true, NEW.id, NEW.lead_id)
    RETURNING id INTO _contact_id;
  ELSE
    UPDATE public.contacts 
    SET chat_id = NEW.id,
        is_contacted = true,
        lead_id = COALESCE(lead_id, NEW.lead_id)
    WHERE id = _contact_id;
  END IF;

  RETURN NEW;
END;
$$;
