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

  // GET = verification/health check (Meta hub.challenge or simple health)
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
    const body = await req.json();
    console.log("------------------------------------------");
    console.log("WEBHOOK RECEIVED AT:", new Date().toISOString());
    console.log("PAYLOAD:", JSON.stringify(body, null, 2));
    console.log("------------------------------------------");

    // ===== Qontak Webhook Validation =====
    // Qontak sends a POST with "verify_info" to validate the webhook URL.
    // Must respond with 2xx status.
    if (body.verify_info !== undefined) {
      console.log("Qontak webhook verification request received");
      return new Response(JSON.stringify({ status: "ok", verified: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const events = normalizePayload(body);

    for (const event of events) {
      const { phone, name, message, sender, timestamp, mediaUrl, mediaType, roomId, channel } = event;

      if (!phone || !message) {
        // Special handling for system events that might imply existing chat update
        if (event.eventType === "room_resolved" && event.roomId) {
          console.log("Processing room resolution:", event.roomId);
          await supabase.from("chats").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("room_id", event.roomId);
          continue;
        }
        if (event.eventType === "message_status" && event.status) {
          console.log("Processing message status:", event.status);
          // TODO: Update specific message status if we stored external_id
          continue;
        }

        console.log("Skipping event - missing phone or message:", event);
        continue;
      }

      // Normalize phone number (remove +, spaces, dashes)
      const normalizedPhone = phone.replace(/[^0-9]/g, "");
      const contactName = name || normalizedPhone;
      const msgSender = sender === "agent" ? "agent" : "customer";
      const msgTimestamp = timestamp || new Date().toISOString();

      // Build message text (include media info if present)
      let msgText = message;
      if (mediaUrl && !message) {
        msgText = `[${mediaType || "media"}] ${mediaUrl}`;
      }

      // Find or create chat
      let { data: chat } = await supabase
        .from("chats")
        .select("id, room_id")
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
            channel: channel || "whatsapp",
            room_id: roomId || null,
          })
          .select("id, room_id")
          .single();

        if (chatErr) {
          console.error("Error creating chat:", chatErr);
          continue;
        }
        chat = newChat;
      } else {
        // Update existing chat with latest message and potentially room_id
        const updateData: Record<string, unknown> = {
          last_message: msgText,
          last_timestamp: msgTimestamp,
        };
        if (contactName && contactName !== normalizedPhone) {
          updateData.contact_name = contactName;
        }
        if (msgSender === "customer") {
          updateData.unread = 1;
        }
        // Always update room_id if we have it and it's missing or different (though usually consistent per phone)
        if (roomId && chat.room_id !== roomId) {
          updateData.room_id = roomId;
        }

        await supabase.from("chats").update(updateData).eq("id", chat.id);
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookEvent {
  phone: string;
  name?: string;
  message: string;
  sender: string;
  timestamp?: string;
  mediaUrl?: string;
  mediaType?: string;
  roomId?: string;
  channel?: string;
  eventType?: "message" | "room_resolved" | "message_status";
  status?: string;
  messageId?: string;
}

// ─── Payload Normalization ────────────────────────────────────────────────────

function normalizePayload(body: any): WebhookEvent[] {
  // ===== Format 1: Mekari Qontak Message Interaction Webhook =====
  // Actual payload from docs.qontak.com:
  // {
  //   "id": "string",
  //   "type": "text",
  //   "room_id": "string",
  //   "sender_type": "string",    // "customer" or agent
  //   "sender": { "name": "string" },
  //   "participant_type": "string",
  //   "text": "string",
  //   "created_at": "datetime",
  //   "room": {
  //     "id": "string",
  //     "name": "string",
  //     "account_uniq_id": "628xxx",
  //     "channel": "wa"
  //   }
  // }
  if (body.room_id && body.room && body.sender_type !== undefined) {
    const phone = body.room?.account_uniq_id || "";
    const name = body.room?.name || body.sender?.name || "";
    const isAgent = body.sender_type === "agent" ||
      body.participant_type === "agent";
    const content = extractQontakContent(body);

    // Map Qontak channel codes to our channel names
    const qontakChannel = (body.room?.channel || "wa").toLowerCase();
    const channelMap: Record<string, string> = {
      wa: "whatsapp", whatsapp: "whatsapp",
      ig: "instagram", instagram: "instagram",
      fb: "facebook", facebook: "facebook", fb_messenger: "facebook",
      email: "email",
      telegram: "telegram", tg: "telegram",
      twitter: "twitter", x: "twitter",
      line: "line",
      webchat: "web_chat", web_chat: "web_chat", livechat: "web_chat",
      ecommerce: "ecommerce", tokopedia: "ecommerce", shopee: "ecommerce",
      call: "call",
    };
    const channel = channelMap[qontakChannel] || "whatsapp";

    return [{
      phone,
      name,
      message: content.text,
      sender: isAgent ? "agent" : "customer",
      timestamp: body.created_at || undefined,
      mediaUrl: content.mediaUrl,
      mediaType: content.mediaType,
      roomId: body.room_id,
      channel,
    }];
  }

  // ===== Format 2: Qontak broadcast_log_status event =====
  // Has contact_phone_number and messages_broadcast_id
  if (body.contact_phone_number && body.messages_broadcast_id) {
    console.log("Broadcast status webhook received, status:", body.status);
    // We don't create a chat for broadcast status updates, just log it
    return [];
  }

  // ===== Format 3: Direct single event { phone, message } (custom/testing) =====
  if (body.phone && body.message) {
    return [body as WebhookEvent];
  }

  // ===== Format 4: Array of events =====
  if (Array.isArray(body)) {
    return body.filter((e: any) => e.phone && e.message);
  }

  // ===== Format 5: Meta WABA webhook (fallback) =====
  if (body.entry) {
    const events: WebhookEvent[] = [];
    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages) continue;
        const contactName = value.contacts?.[0]?.profile?.name || "";
        for (const msg of value.messages) {
          const content = extractMetaContent(msg);
          events.push({
            phone: msg.from || "",
            name: contactName,
            message: content.text,
            sender: "customer",
            timestamp: msg.timestamp
              ? new Date(Number(msg.timestamp) * 1000).toISOString()
              : undefined,
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

  // ===== Format 7: Room Interaction Service (room_resolved) =====
  // Payload: { service_name: "room", event_name: "resolved", ... room: { ... } }
  if (body.service_name === "room" && body.event_name === "resolved") {
    const room = body.room || {};
    return [{
      phone: room.account_uniq_id || "",
      name: room.name || "",
      message: "[system] Room resolved",
      sender: "system",
      timestamp: body.created_at,
      roomId: room.id,
      eventType: "room_resolved"
    } as any];
  }

  // ===== Format 8: WABA Status (statuses) =====
  // Payload: { statuses: [ { id: "msg_id", status: "read", ... } ] }
  if (body.statuses && Array.isArray(body.statuses)) {
    // We can iterate and update message statuses here, or just log them.
    // For now, let's map them to a recognizable event type.
    return body.statuses.map((s: any) => ({
      phone: s.recipient_id || "", // might need normalization
      message: `[system] Message ${s.status}`,
      sender: "system",
      timestamp: s.timestamp,
      messageId: s.id,
      status: s.status,
      eventType: "message_status"
    } as any));
  }

  console.log("Unknown payload format, attempting best-effort parse");
  return [];
}

// ─── Content Extractors ──────────────────────────────────────────────────────

/**
 * Extract message content from Qontak message interaction payload.
 * Qontak uses `type` field and `text` is at root level.
 */
function extractQontakContent(msg: any): { text: string; mediaUrl?: string; mediaType?: string } {
  const type = msg.type || "text";

  if (type === "text") {
    return { text: msg.text || "" };
  }

  // Media types: image, video, document, audio, sticker, file
  if (["image", "video", "document", "audio", "sticker", "file"].includes(type)) {
    // Qontak may put URL in text field for media or in a nested object
    const url = msg.url || msg.text || "";
    const caption = msg.caption || "";
    return {
      text: caption || `[${type}]`,
      mediaUrl: url,
      mediaType: type,
    };
  }

  // Location
  if (type === "location") {
    const lat = msg.latitude || msg.location?.latitude || "";
    const lng = msg.longitude || msg.location?.longitude || "";
    return { text: `[location] ${lat},${lng}` };
  }

  // Contacts
  if (type === "contacts") {
    return { text: `[contact] ${msg.text || ""}` };
  }

  // Fallback
  return { text: msg.text || JSON.stringify(msg) };
}

/**
 * Extract message content from Meta WABA webhook payload.
 */
function extractMetaContent(msg: any): { text: string; mediaUrl?: string; mediaType?: string } {
  const type = msg.type || "text";

  if (type === "text") {
    return { text: msg.text?.body || "" };
  }

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

  if (type === "location") {
    const loc = msg.location || {};
    return { text: `[location] ${loc.latitude},${loc.longitude}` };
  }

  return { text: msg.text?.body || msg.body || JSON.stringify(msg) };
}
