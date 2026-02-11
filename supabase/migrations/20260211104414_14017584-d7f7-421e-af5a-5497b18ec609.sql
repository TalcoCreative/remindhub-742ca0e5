
-- Drop existing triggers if any
DROP TRIGGER IF EXISTS on_new_chat ON public.chats;
DROP TRIGGER IF EXISTS on_new_chat_after ON public.chats;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;

-- Split handle_new_chat into BEFORE (set lead_id on NEW) and AFTER (update contacts)
CREATE OR REPLACE FUNCTION public.handle_new_chat_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lead_id uuid;
BEGIN
  -- Find or create lead
  SELECT id INTO _lead_id FROM public.leads WHERE phone = NEW.contact_phone LIMIT 1;
  
  IF _lead_id IS NULL THEN
    INSERT INTO public.leads (name, phone, source, status, type, platform_source)
    VALUES (NEW.contact_name, NEW.contact_phone, 'whatsapp', 'new', 'b2c', 'whatsapp')
    RETURNING id INTO _lead_id;
  END IF;

  NEW.lead_id := _lead_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_chat_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _contact_id uuid;
BEGIN
  -- Find or create contact
  SELECT id INTO _contact_id FROM public.contacts WHERE phone = NEW.contact_phone;
  
  IF _contact_id IS NULL THEN
    INSERT INTO public.contacts (name, phone, source, sources, type, is_contacted, chat_id, lead_id)
    VALUES (NEW.contact_name, NEW.contact_phone, 'whatsapp', ARRAY['whatsapp'], 'b2c', false, NEW.id, NEW.lead_id)
    RETURNING id INTO _contact_id;
  ELSE
    UPDATE public.contacts 
    SET chat_id = NEW.id,
        lead_id = COALESCE(lead_id, NEW.lead_id)
    WHERE id = _contact_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_new_chat_before
  BEFORE INSERT ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_chat_before();

CREATE TRIGGER on_new_chat_after
  AFTER INSERT ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_chat_after();

-- Recreate message trigger
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();
