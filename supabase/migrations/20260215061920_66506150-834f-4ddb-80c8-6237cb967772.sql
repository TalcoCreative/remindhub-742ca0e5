
-- Table to store app-wide settings like Qontak credentials
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON public.app_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read settings
CREATE POLICY "Authenticated can view settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('qontak_mode', 'dummy'),
  ('qontak_token', ''),
  ('qontak_refresh_token', '');
