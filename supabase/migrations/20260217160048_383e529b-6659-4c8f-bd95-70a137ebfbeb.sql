
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS room_id text;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS last_message_id text;

CREATE INDEX IF NOT EXISTS idx_chats_room_id ON public.chats(room_id);
