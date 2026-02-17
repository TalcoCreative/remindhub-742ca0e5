-- Masukkan Kredensial Qontak ke dalam tabel app_settings
-- Jalankan script ini di SQL Editor Supabase Anda.

INSERT INTO public.app_settings (key, value, updated_at)
VALUES
  ('qontak_token', 'nQTL4wS3-zC4oANx9G7NMAo4yZvVF8rQ71vDdUo9GPQ', now()),
  ('qontak_refresh_token', 'b4R-d13BumHUcnScmoxnW5YeMbl0hn8pzV1pjpXQc8s', now())
ON CONFLICT (key) DO UPDATE
SET 
  value = EXCLUDED.value, 
  updated_at = now();

-- Verifikasi data yang dimasukkan
SELECT * FROM public.app_settings WHERE key IN ('qontak_token', 'qontak_refresh_token');
