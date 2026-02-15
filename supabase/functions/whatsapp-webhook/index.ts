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

  // GET = verification/health check
  if (req.method === "GET") {
    const url = new URL(req.url);
    // Support webhook verification (e.g. Meta/Qontak challenge)
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

    // Normalize payload - support multiple formats
    // Format 1: Direct { phone, name, message, sender }
    // Format 2: Qontak/Meta WABA format
    // Format 3: Custom format with contacts/messages arrays
    
    const events = normalizePayload(body);

    for (const event of events) {
      const { phone, name, message, sender, timestamp } = event;

      if (!phone || !message) {
        console.log("Skipping event - missing phone or message:", event);
        continue;
      }

      // Normalize phone number (remove +, spaces, dashes)
      const normalizedPhone = phone.replace(/[^0-9]/g, "");
      const contactName = name || normalizedPhone;
      const msgSender = sender === "agent" || sender === "operator" ? "agent" : "customer";
      const msgTimestamp = timestamp || new Date().toISOString();

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
            last_message: message,
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
      }

      // Insert message
      const { error: msgErr } = await supabase.from("messages").insert({
        chat_id: chat.id,
        text: message,
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
}

function normalizePayload(body: any): WebhookEvent[] {
  // Format 1: Direct single event
  if (body.phone && body.message) {
    return [body as WebhookEvent];
  }

  // Format 2: Array of events
  if (Array.isArray(body)) {
    return body.filter((e: any) => e.phone && e.message);
  }

  // Format 3: Qontak webhook format
  if (body.data?.from || body.data?.messages) {
    const msgs = body.data.messages || [body.data];
    return msgs.map((m: any) => ({
      phone: m.from || body.data.from || "",
      name: m.name || body.data.contact_name || body.data.name || "",
      message: m.text?.body || m.body || m.text || m.message || "",
      sender: m.is_outgoing ? "agent" : "customer",
      timestamp: m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : undefined,
    }));
  }

  // Format 4: Meta WABA webhook
  if (body.entry) {
    const events: WebhookEvent[] = [];
    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages) continue;
        for (const msg of value.messages) {
          events.push({
            phone: msg.from || "",
            name: value.contacts?.[0]?.profile?.name || "",
            message: msg.text?.body || msg.body || "",
            sender: "customer",
            timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : undefined,
          });
        }
      }
    }
    return events;
  }

  // Format 5: Wrapped in { events: [...] }
  if (body.events && Array.isArray(body.events)) {
    return body.events.filter((e: any) => e.phone && e.message);
  }

  console.log("Unknown payload format, attempting best-effort parse");
  return [];
}
