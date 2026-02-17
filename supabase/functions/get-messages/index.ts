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

        // Fetch Messages using HMAC Auth
        const mekariPath = `/v1/qontak/chat/rooms/${roomId}/histories?limit=${limit}`;
        const mekariHeaders = await generateMekariHeaders("GET", mekariPath);

        let msgsRes = await fetch(`https://api.mekari.com${mekariPath}`, {
            headers: mekariHeaders,
        });

        let rawText = await msgsRes.text();
        let msgsData: any = {};

        if (!msgsRes.ok) {
            console.warn(`Mekari API failed (${msgsRes.status}): ${rawText.substring(0, 200)}`);
            
            // Fallback to Legacy API
            const legacyPath = `/api/open/v1/rooms/${roomId}/histories?limit=${limit}`;
            const legacyHeaders = await generateMekariHeaders("GET", legacyPath);
            msgsRes = await fetch(`https://service-chat.qontak.com${legacyPath}`, {
                headers: legacyHeaders,
            });
            rawText = await msgsRes.text();

            if (!msgsRes.ok) {
                console.error("Both APIs failed:", rawText);
                return new Response(JSON.stringify({
                    error: "Failed to fetch messages (Both APIs)",
                    details: rawText,
                    status: msgsRes.status
                }), {
                    status: msgsRes.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

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
