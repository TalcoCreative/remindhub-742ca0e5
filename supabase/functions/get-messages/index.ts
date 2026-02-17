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
        let requestBody: any = {};
        try {
            requestBody = await req.json();
        } catch (e) {
            const url = new URL(req.url);
            if (url.searchParams.get("roomId")) {
                requestBody = { roomId: url.searchParams.get("roomId") };
            }
        }

        const { roomId, limit = 50 } = requestBody;

        if (!roomId) {
            return new Response(JSON.stringify({ error: "Room ID required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const mekariPath = `/v1/qontak/chat/rooms/${roomId}/histories?limit=${limit}`;
        const mekariHeaders = await generateMekariHeaders("GET", mekariPath);

        const msgsRes = await fetch(`https://api.mekari.com${mekariPath}`, {
            headers: mekariHeaders,
        });

        const rawText = await msgsRes.text();

        if (!msgsRes.ok) {
            console.error(`Mekari API failed (${msgsRes.status}): ${rawText.substring(0, 300)}`);
            return new Response(JSON.stringify({
                error: "Failed to fetch messages",
                details: rawText,
                status: msgsRes.status
            }), {
                status: msgsRes.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        let msgsData: any = {};
        try {
            msgsData = rawText ? JSON.parse(rawText) : {};
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid JSON", details: rawText.substring(0, 500) }), {
                status: 502,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Normalize Data
        const messages = (msgsData.data || []).map((msg: any) => {
            const isAgent =
                msg.sender_type === 'agent' ||
                msg.direction === 'outbound' ||
                msg.sender?.type === 'agent' ||
                msg.is_room_owner === false;

            return {
                id: msg.id,
                text: msg.text || (msg.type === 'file' ? '[File]' : (msg.type === 'image' ? '[Image]' : '[Media]')),
                created_at: msg.created_at,
                sender: isAgent ? 'agent' : 'customer',
                is_agent: isAgent,
                status: msg.status
            };
        }).reverse();

        console.log(`Returning ${messages.length} messages (HMAC Auth)`);

        return new Response(JSON.stringify({
            data: messages,
            meta: { count: messages.length, source: "Mekari HMAC Auth", room_id: roomId }
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        console.error("Critical Error:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
