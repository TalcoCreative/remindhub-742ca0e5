-- Migration: Add room_id to chats table for Qontak integration

DO $$
BEGIN
    -- Add room_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chats' AND column_name = 'room_id') THEN
        ALTER TABLE public.chats ADD COLUMN room_id TEXT DEFAULT NULL;
    END IF;

    -- Add index on room_id for faster lookups
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'chats' AND indexname = 'idx_chats_room_id') THEN
        CREATE INDEX idx_chats_room_id ON public.chats(room_id);
    END IF;

    -- Add last_message_id to help with deduplication (optional but good practice)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chats' AND column_name = 'last_message_id') THEN
        ALTER TABLE public.chats ADD COLUMN last_message_id TEXT DEFAULT NULL;
    END IF;
END
$$;
