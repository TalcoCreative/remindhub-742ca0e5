-- Add image_url column to broadcast_logs for image attachments in broadcasts
ALTER TABLE public.broadcast_logs ADD COLUMN image_url text DEFAULT NULL;