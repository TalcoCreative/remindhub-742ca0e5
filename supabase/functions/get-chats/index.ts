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

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 1. Get Qontak Token
        const { data: settings, error: settingsError } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "qontak_token")
            .single();

        if (settingsError || !settings?.value) {
            return new Response(JSON.stringify({ error: "Qontak token not configured" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const qontakToken = settings.value;

        // 2. Fetch Rooms from Qontak
        const { page = 1, limit = 20 } = await req.json().catch(() => ({}));
        const offset = (page - 1) * limit;
        let roomsData: any = {};

        // Try Mekari API First
        console.log("Fetching rooms from Mekari API...");
        const mekariUrl = `https://api.mekari.com/v1/qontak/chat/rooms?page=${page}&limit=${limit}&offset=${offset}`;
        const roomsRes = await fetch(mekariUrl, {
            headers: { "Authorization": `Bearer ${qontakToken}` },
        });

        if (roomsRes.ok) {
            roomsData = await roomsRes.json();
            console.log("DEBUG: Qontak Response Status (Mekari):", roomsRes.status);
            console.log("DEBUG: Qontak Raw Response (Mekari):", JSON.stringify(roomsData));
        } else {
            console.warn(`Mekari API failed (${roomsRes.status}), trying Legacy API...`);
            // Fallback to Legacy API
            const legacyUrl = `https://service-chat.qontak.com/api/open/v1/rooms?limit=${limit}&offset=${offset}`; // Legacy might not support 'page' same way, mostly offset/limit
            const legacyRes = await fetch(legacyUrl, {
                headers: { "Authorization": `Bearer ${qontakToken}` },
            });

            if (legacyRes.ok) {
                roomsData = await legacyRes.json();
                console.log("DEBUG: Qontak Response Status (Legacy):", legacyRes.status);
                console.log("DEBUG: Qontak Raw Response (Legacy):", JSON.stringify(roomsData));
            } else {
                // Both failed
                const errText = await legacyRes.text();
                console.error("Legacy API Error:", errText);
                return new Response(JSON.stringify({ error: "Failed to fetch chats from Qontak", details: errText }), {
                    status: legacyRes.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // 3. Normalize Data for Frontend
        // 3. Normalize Data for Frontend
        // Note: api.mekari.com might return slightly different field names.
        // We map commonly used fields based on standard Qontak schema.

        const normalizeChannel = (rawChannel: string): string => {
            const ch = rawChannel?.toLowerCase() || "";
            if (ch.includes("wa") || ch.includes("whatsapp")) return "whatsapp";
            if (ch.includes("fb") || ch.includes("facebook")) return "facebook";
            if (ch.includes("ig") || ch.includes("instagram")) return "instagram";
            if (ch.includes("tele")) return "telegram";
            if (ch.includes("email")) return "email";
            return ch || "whatsapp"; // Default fallback
        };

        const rooms = (roomsData.data || []).map((room: any) => ({
            id: room.id,
            contact_name: room.name || room.account_uniq_id || "Unknown",
            contact_phone: room.account_uniq_id,
            channel: normalizeChannel(room.channel),
            raw_channel: room.channel, // Keep raw for debug
            status: room.status,
            unread: room.unread_count || 0,
            // Last message might be nested in 'last_message' object
            last_message: room.last_message?.text || room.last_message_text || "No message",
            last_timestamp: room.last_message_at || room.last_message_timestamp,
            assigned_pic: room.agent?.full_name || null // If agent info is present
        }));

        console.log(`Fetched ${rooms.length} rooms from Qontak (api.mekari.com)`);
        console.log("DEBUG: Channels found:", [...new Set(rooms.map((r: any) => r.raw_channel))]);

        return new Response(JSON.stringify({
            data: rooms,
            meta: roomsData.meta
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message, stack: err.stack }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
