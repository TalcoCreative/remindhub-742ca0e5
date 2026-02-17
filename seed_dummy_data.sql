-- Clean up existing data (Optional - comment out if you want to keep existing data)
-- TRUNCATE TABLE public.messages CASCADE;
-- TRUNCATE TABLE public.chats CASCADE;
-- TRUNCATE TABLE public.leads CASCADE;
-- TRUNCATE TABLE public.contacts CASCADE;
-- TRUNCATE TABLE public.broadcast_logs CASCADE;
-- TRUNCATE TABLE public.forms CASCADE;

-- Insert Dummy Leads
INSERT INTO public.leads (
  id, name, phone, type, status, source, company, address, area, 
  potential_value, deal_value, estimated_kg, pickup_date, pickup_status
) VALUES 
(uuid_generate_v4(), 'Budi Santoso', '6281234567890', 'b2c', 'new', 'whatsapp', 'Personal', 'Jl. Sudirman No. 10', 'Jakarta Selatan', 
 500000, 0, 10, NULL, NULL),
(uuid_generate_v4(), 'PT Maju Jaya', '6281122334455', 'b2b', 'in_progress', 'web', 'PT Maju Jaya', 'Kawasan Industri Pulogadung', 'Jakarta Timur', 
 15000000, 12000000, 500, '2024-03-15', 'Scheduled'),
(uuid_generate_v4(), 'Siti Aminah', '6281345678901', 'b2c', 'followed_up', 'instagram', 'Toko Kue Siti', 'Jl. Melawai Raya', 'Jakarta Selatan', 
 750000, 0, 15, NULL, NULL),
(uuid_generate_v4(), 'CV Berkah Abadi', '6281987654321', 'b2b', 'completed', 'referral', 'CV Berkah Abadi', 'Jl. Gatot Subroto', 'Jakarta Pusat', 
 25000000, 25000000, 1000, '2024-02-28', 'Completed'),
(uuid_generate_v4(), 'Andi Wijaya', '6281512345678', 'b2c', 'lost', 'facebook', 'Kedai Kopi Andi', 'Jl. Kemang Raya', 'Jakarta Selatan', 
 300000, 0, 5, NULL, NULL);

-- Insert Dummy Chats & Contacts (Linked to Leads)
WITH lead_data AS (SELECT id, name, phone FROM public.leads LIMIT 1)
INSERT INTO public.chats (
  id, contact_phone, contact_name, unread, status, is_answered, last_message, last_timestamp, lead_id, channel
) 
SELECT 
  uuid_generate_v4(), phone, name, 2, 'new', false, 'Halo, apakah layanan ini tersedia?', NOW(), id, 'whatsapp'
FROM lead_data;

-- Insert Messages for the Chat
INSERT INTO public.messages (id, chat_id, sender, text, created_at)
SELECT 
  uuid_generate_v4(), id, 'customer', 'Halo, apakah layanan ini tersedia?', NOW() - INTERVAL '1 hour'
FROM public.chats LIMIT 1;

INSERT INTO public.messages (id, chat_id, sender, text, created_at)
SELECT 
  uuid_generate_v4(), id, 'agent', 'Halo kak, tersedia. Ada yang bisa dibantu?', NOW() - INTERVAL '50 minutes'
FROM public.chats LIMIT 1;

-- Insert Contacts (Standalone)
INSERT INTO public.contacts (id, name, phone, company, type, status, source)
VALUES 
(uuid_generate_v4(), 'Supplier Plastik', '62811111111', 'CV Plastik Jaya', 'vendor', 'active', 'manual'),
(uuid_generate_v4(), 'Mitra Logistik', '62822222222', 'PT Logistik Cepat', 'partner', 'active', 'manual');

-- Insert Dummy Broadcast Logs
INSERT INTO public.broadcast_logs (
  id, sent_by, message_template, sent_at, total_recipients, delivery_status, mode, filters
) VALUES
(uuid_generate_v4(), 'admin@remindhub.com', 'Promo Spesial Ramadhan! Diskon 20% untuk penjemputan minggu ini.', NOW() - INTERVAL '2 days', 150, 'sent', 'live', '{"status": "all", "area": "Jakarta"}'),
(uuid_generate_v4(), 'admin@remindhub.com', 'Update Layanan: Kami sekarang buka hari Minggu.', NOW() - INTERVAL '1 week', 500, 'sent', 'dummy', '{"status": "customer"}');

-- Insert Dummy Form
INSERT INTO public.forms (id, name, slug, platform, is_active)
VALUES 
(uuid_generate_v4(), 'Registrasi Penjemputan', 'pickup-reg', 'web', true);

-- Insert Dummy Form Submission
INSERT INTO public.form_submissions (id, form_id, data, source_platform)
SELECT 
  uuid_generate_v4(), id, '{"name": "Budi", "address": "Jl. Baru", "kg": "20"}', 'web'
FROM public.forms LIMIT 1;
