import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET = verification/health check (Meta & Qontak hub.challenge)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    if (challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ status: "ok", message: "Webhook is active" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const events = normalizePayload(body);

    for (const event of events) {
      const { phone, name, message, sender, timestamp, mediaUrl, mediaType } = event;

      if (!phone || !message) {
        console.log("Skipping event - missing phone or message:", event);
        continue;
      }

      // Normalize phone number (remove +, spaces, dashes)
      const normalizedPhone = phone.replace(/[^0-9]/g, "");
      const contactName = name || normalizedPhone;
      const msgSender = sender === "agent" || sender === "operator" ? "agent" : "customer";
      const msgTimestamp = timestamp || new Date().toISOString();

      // Build message text (include media caption or URL if present)
      let msgText = message;
      if (mediaUrl && !message) {
        msgText = `[${mediaType || "media"}] ${mediaUrl}`;
      }

      // Find or create chat
      let { data: chat } = await supabase
        .from("chats")
        .select("id")
        .eq("contact_phone", normalizedPhone)
        .maybeSingle();

      if (!chat) {
        const { data: newChat, error: chatErr } = await supabase
          .from("chats")
          .insert({
            contact_name: contactName,
            contact_phone: normalizedPhone,
            last_message: msgText,
            last_timestamp: msgTimestamp,
            status: "new",
            unread: msgSender === "customer" ? 1 : 0,
          })
          .select("id")
          .single();

        if (chatErr) {
          console.error("Error creating chat:", chatErr);
          continue;
        }
        chat = newChat;
      } else {
        // Update existing chat with latest message
        await supabase
          .from("chats")
          .update({
            last_message: msgText,
            last_timestamp: msgTimestamp,
            contact_name: contactName || undefined,
            unread: msgSender === "customer" ? 1 : 0,
          })
          .eq("id", chat.id);
      }

      // Insert message
      const { error: msgErr } = await supabase.from("messages").insert({
        chat_id: chat.id,
        text: msgText,
        sender: msgSender,
        created_at: msgTimestamp,
      });

      if (msgErr) {
        console.error("Error inserting message:", msgErr);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: events.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface WebhookEvent {
  phone: string;
  name?: string;
  message: string;
  sender: string;
  timestamp?: string;
  mediaUrl?: string;
  mediaType?: string;
}

function extractMessageContent(msg: any): { text: string; mediaUrl?: string; mediaType?: string } {
  const type = msg.type || "text";

  // Text message
  if (type === "text") {
    return { text: msg.text?.body || msg.body || msg.text || msg.message || "" };
  }

  // Media messages (image, video, document, audio, sticker)
  if (["image", "video", "document", "audio", "sticker"].includes(type)) {
    const media = msg[type] || {};
    const caption = media.caption || "";
    const url = media.link || media.url || media.id || "";
    return {
      text: caption || `[${type}]`,
      mediaUrl: url,
      mediaType: type,
    };
  }

  // Location
  if (type === "location") {
    const loc = msg.location || {};
    return { text: `[location] ${loc.latitude},${loc.longitude}` };
  }

  // Fallback
  return { text: msg.text?.body || msg.body || msg.text || msg.message || JSON.stringify(msg) };
}

function normalizePayload(body: any): WebhookEvent[] {
  // ===== Format 1: Direct single event { phone, message } =====
  if (body.phone && body.message) {
    return [body as WebhookEvent];
  }

  // ===== Format 2: Array of events =====
  if (Array.isArray(body)) {
    return body.filter((e: any) => e.phone && e.message);
  }

  // ===== Format 3: Qontak Chat Room Created event =====
  // Qontak sends: { id, name, channel, messages: [{ from, text: { body }, type, timestamp }], ... }
  if (body.messages && Array.isArray(body.messages) && body.channel) {
    return body.messages.map((m: any) => {
      const content = extractMessageContent(m);
      return {
        phone: m.from || body.account_uniq_id || "",
        name: body.name || "",
        message: content.text,
        sender: m.from_me ? "agent" : "customer",
        timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : undefined,
        mediaUrl: content.mediaUrl,
        mediaType: content.mediaType,
      };
    });
  }

  // ===== Format 4: Qontak nested data format =====
  if (body.data?.from || body.data?.messages) {
    const msgs = body.data.messages || [body.data];
    return msgs.map((m: any) => {
      const content = extractMessageContent(m);
      return {
        phone: m.from || body.data.from || "",
        name: m.name || body.data.contact_name || body.data.name || "",
        message: content.text,
        sender: m.is_outgoing ? "agent" : "customer",
        timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : undefined,
        mediaUrl: content.mediaUrl,
        mediaType: content.mediaType,
      };
    });
  }

  // ===== Format 5: Meta WABA webhook =====
  if (body.entry) {
    const events: WebhookEvent[] = [];
    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages) continue;
        const contactName = value.contacts?.[0]?.profile?.name || "";
        for (const msg of value.messages) {
          const content = extractMessageContent(msg);
          events.push({
            phone: msg.from || "",
            name: contactName,
            message: content.text,
            sender: "customer",
            timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : undefined,
            mediaUrl: content.mediaUrl,
            mediaType: content.mediaType,
          });
        }
      }
    }
    return events;
  }

  // ===== Format 6: Wrapped in { events: [...] } =====
  if (body.events && Array.isArray(body.events)) {
    return body.events.filter((e: any) => e.phone && e.message);
  }

  console.log("Unknown payload format, attempting best-effort parse");
  return [];
}
