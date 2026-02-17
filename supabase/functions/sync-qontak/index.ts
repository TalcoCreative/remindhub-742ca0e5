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

        // 2. Fetch Rooms from Qontak (api.mekari.com)
        console.log("Fetching rooms from Qontak (api.mekari.com)...");
        const roomsRes = await fetch("https://api.mekari.com/v1/qontak/chat/rooms?limit=50", {
            headers: {
                "Authorization": `Bearer ${qontakToken}`,
            },
        });

        const roomsData = await roomsRes.json();

        if (!roomsRes.ok) {
            console.error("Qontak Rooms Error:", roomsData);
            return new Response(JSON.stringify({ error: "Failed to fetch rooms", details: roomsData }), {
                status: roomsRes.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const rooms = roomsData.data || [];
        console.log(`Found ${rooms.length} rooms from Qontak API.`);

        // Channel Normalization Helper
        const normalizeChannel = (rawChannel: string): string => {
            const ch = rawChannel?.toLowerCase() || "";
            if (ch.includes("wa") || ch.includes("whatsapp")) return "whatsapp";
            if (ch.includes("fb") || ch.includes("facebook")) return "facebook";
            if (ch.includes("ig") || ch.includes("instagram")) return "instagram";
            if (ch.includes("tele")) return "telegram";
            if (ch.includes("email")) return "email";
            return ch || "whatsapp";
        };

        let syncedCount = 0;
        let skippedCount = 0;

        for (const room of rooms) {
            // For WhatsApp, account_uniq_id is phone. 
            let uniqueId = room.account_uniq_id || "";

            // Only strip if it LOOKS like a phone number
            if (/^[0-9+]+$/.test(uniqueId)) {
                uniqueId = uniqueId.replace(/[^0-9]/g, "");
            }

            const name = room.name || room.account_uniq_id || "Unknown";
            const channel = normalizeChannel(room.channel);
            const roomId = room.id;

            if (!uniqueId) {
                skippedCount++;
                continue;
            }

            // Upsert Chat
            const { error: upsertError } = await supabase
                .from("chats")
                .upsert({
                    room_id: roomId,
                    contact_phone: uniqueId,
                    contact_name: name,
                    channel: channel,
                    last_timestamp: room.last_message_at || room.last_message_timestamp || new Date().toISOString(),
                    status: room.status === "resolved" ? "completed" : "new",
                    unread: room.unread_count || 0,
                    assigned_pic: room.agent?.full_name || null
                }, { onConflict: "contact_phone" });

            if (upsertError) {
                console.error(`Error syncing room ${roomId}:`, upsertError);
            } else {
                syncedCount++;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            synced: syncedCount,
            total_fetched: rooms.length,
            skipped: skippedCount,
            first_room: rooms[0] ? { name: rooms[0].name, id: rooms[0].id } : null
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("Sync function error:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
