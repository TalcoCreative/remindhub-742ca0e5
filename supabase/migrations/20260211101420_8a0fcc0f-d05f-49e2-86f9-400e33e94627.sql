
-- 1) Add answered tracking columns to chats
ALTER TABLE public.chats 
  ADD COLUMN IF NOT EXISTS is_answered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

-- 2) Trigger: on new chat → auto-create contact + lead
CREATE OR REPLACE FUNCTION public.handle_new_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _contact_id uuid;
  _lead_id uuid;
BEGIN
  SELECT id INTO _contact_id FROM public.contacts WHERE phone = NEW.contact_phone;
  
  IF _contact_id IS NULL THEN
    INSERT INTO public.contacts (name, phone, source, sources, type, is_contacted)
    VALUES (NEW.contact_name, NEW.contact_phone, 'whatsapp', ARRAY['whatsapp'], 'b2c', false)
    RETURNING id INTO _contact_id;
  END IF;

  SELECT id INTO _lead_id FROM public.leads WHERE phone = NEW.contact_phone LIMIT 1;
  
  IF _lead_id IS NULL THEN
    INSERT INTO public.leads (name, phone, source, status, type, platform_source)
    VALUES (NEW.contact_name, NEW.contact_phone, 'whatsapp', 'new', 'b2c', 'whatsapp')
    RETURNING id INTO _lead_id;
  END IF;

  NEW.lead_id := _lead_id;
  
  UPDATE public.contacts SET lead_id = _lead_id, chat_id = NEW.id 
  WHERE id = _contact_id AND lead_id IS NULL;

  UPDATE public.contacts SET chat_id = NEW.id 
  WHERE id = _contact_id AND chat_id IS NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_chat
  BEFORE INSERT ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_chat();

-- 3) Trigger: on new message from agent → mark answered + record response time
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _chat_phone text;
BEGIN
  UPDATE public.chats 
  SET last_message = NEW.text, 
      last_timestamp = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.chat_id;

  IF NEW.sender != 'customer' THEN
    UPDATE public.chats 
    SET is_answered = true,
        first_response_at = COALESCE(first_response_at, NEW.created_at),
        unread = 0
    WHERE id = NEW.chat_id AND is_answered = false;

    SELECT contact_phone INTO _chat_phone FROM public.chats WHERE id = NEW.chat_id;
    IF _chat_phone IS NOT NULL THEN
      UPDATE public.contacts 
      SET is_contacted = true, last_contacted = now()
      WHERE phone = _chat_phone AND is_contacted = false;
    END IF;
  ELSE
    UPDATE public.chats 
    SET unread = unread + 1
    WHERE id = NEW.chat_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();
