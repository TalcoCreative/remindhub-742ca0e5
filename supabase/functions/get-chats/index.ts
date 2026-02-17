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
        const { page = 1, limit = 20 } = await req.json().catch(() => ({}));
        const offset = (page - 1) * limit;

        // Get Bearer token from app_settings
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: settings } = await supabase
            .from("app_settings")
            .select("key, value")
            .in("key", ["qontak_token"]);

        const token = settings?.find((s: any) => s.key === "qontak_token")?.value;

        if (!token) {
            return new Response(JSON.stringify({ error: "Qontak token not configured" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        console.log("Fetching rooms with Bearer token...");
        const roomsRes = await fetch(
            `https://service-chat.qontak.com/api/open/v1/rooms?limit=${limit}&offset=${offset}`,
            { headers }
        );

        if (!roomsRes.ok) {
            const errText = await roomsRes.text();
            console.error(`Qontak API failed (${roomsRes.status}): ${errText.substring(0, 300)}`);
            return new Response(JSON.stringify({ error: "Failed to fetch chats", details: errText }), {
                status: roomsRes.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const roomsData = await roomsRes.json();

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

        console.log(`Fetched ${rooms.length} rooms (Bearer Token)`);

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
