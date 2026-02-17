import { generateMekariHeaders } from "../_shared/mekari-auth.ts";

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
        const { page = 1, limit = 20 } = await req.json().catch(() => ({}));
        const offset = (page - 1) * limit;
        let roomsData: any = {};

        // Try Mekari API with HMAC Auth
        const mekariPath = `/v1/qontak/chat/rooms?page=${page}&limit=${limit}&offset=${offset}`;
        const mekariHeaders = await generateMekariHeaders("GET", mekariPath);
        
        console.log("Fetching rooms from Mekari API (HMAC Auth)...");
        const roomsRes = await fetch(`https://api.mekari.com${mekariPath}`, {
            headers: mekariHeaders,
        });

        if (roomsRes.ok) {
            roomsData = await roomsRes.json();
            console.log("Mekari HMAC Auth success, status:", roomsRes.status);
        } else {
            const errText = await roomsRes.text();
            console.warn(`Mekari API failed (${roomsRes.status}): ${errText.substring(0, 200)}`);
            
            // Fallback to Legacy API
            const legacyPath = `/api/open/v1/rooms?limit=${limit}&offset=${offset}`;
            const legacyHeaders = await generateMekariHeaders("GET", legacyPath);
            const legacyRes = await fetch(`https://service-chat.qontak.com${legacyPath}`, {
                headers: legacyHeaders,
            });

            if (legacyRes.ok) {
                roomsData = await legacyRes.json();
            } else {
                const legacyErr = await legacyRes.text();
                console.error("Both APIs failed:", legacyErr);
                return new Response(JSON.stringify({ error: "Failed to fetch chats from Qontak", details: legacyErr }), {
                    status: legacyRes.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // Normalize Data
        const normalizeChannel = (rawChannel: string): string => {
            const ch = rawChannel?.toLowerCase() || "";
            if (ch.includes("wa") || ch.includes("whatsapp")) return "whatsapp";
            if (ch.includes("fb") || ch.includes("facebook")) return "facebook";
            if (ch.includes("ig") || ch.includes("instagram")) return "instagram";
            if (ch.includes("tele")) return "telegram";
            if (ch.includes("email")) return "email";
            return ch || "whatsapp";
        };

        const rooms = (roomsData.data || []).map((room: any) => ({
            id: room.id,
            contact_name: room.name || room.account_uniq_id || "Unknown",
            contact_phone: room.account_uniq_id,
            channel: normalizeChannel(room.channel),
            raw_channel: room.channel,
            status: room.status,
            unread: room.unread_count || 0,
            last_message: room.last_message?.text || room.last_message_text || "No message",
            last_timestamp: room.last_message_at || room.last_message_timestamp,
            assigned_pic: room.agent?.full_name || null
        }));

        console.log(`Fetched ${rooms.length} rooms (HMAC Auth)`);

        return new Response(JSON.stringify({ data: rooms, meta: roomsData.meta }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
