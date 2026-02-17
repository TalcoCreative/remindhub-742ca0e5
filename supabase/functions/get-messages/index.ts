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

        let requestBody: any = {};
        try {
            requestBody = await req.json();
        } catch (e) {
            console.error("Failed to parse request body:", e);
            // Fallback for debugging - maybe it was sent as query param?
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

        // 2. Fetch Messages from Qontak (Endpoint: /rooms/{id}/messages)
        // Updated to api.mekari.com
        // 2. Fetch Messages from Qontak
        let msgsRes = await fetch(`https://api.mekari.com/v1/qontak/chat/rooms/${roomId}/messages?limit=${limit}`, {
            headers: { "Authorization": `Bearer ${qontakToken}` },
        });

        let rawText = await msgsRes.text();
        let msgsData: any = {};

        if (!msgsRes.ok) {
            console.warn(`Mekari API failed (${msgsRes.status}), trying Legacy API...`);
            // Fallback to Legacy API
            msgsRes = await fetch(`https://service-chat.qontak.com/api/open/v1/rooms/${roomId}/messages?limit=${limit}`, {
                headers: { "Authorization": `Bearer ${qontakToken}` },
            });
            rawText = await msgsRes.text();

            // Check if Legacy also failed
            if (!msgsRes.ok) {
                console.error("Legacy API Error:", rawText);
                return new Response(JSON.stringify({
                    error: "Failed to fetch messages (Both APIs)",
                    details: rawText,
                    status: msgsRes.status
                }), {
                    status: msgsRes.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        } else {
            // Mekari was OK, but let's check if it verified empty
            try {
                const tempCheck = JSON.parse(rawText || "{}");
                if (!tempCheck.data || tempCheck.data.length === 0) {
                    console.warn("Mekari returned empty messages. Checking Legacy just in case...");
                    const legRes = await fetch(`https://service-chat.qontak.com/api/open/v1/rooms/${roomId}/messages?limit=${limit}`, {
                        headers: { "Authorization": `Bearer ${qontakToken}` },
                    });
                    if (legRes.ok) {
                        const legText = await legRes.text();
                        const legJson = JSON.parse(legText || "{}");
                        if (legJson.data && legJson.data.length > 0) {
                            console.log("Legacy has data! Using Legacy response.");
                            msgsRes = legRes;
                            rawText = legText;
                        }
                    }
                }
            } catch (e) {
                // Ignore parsing error here, handled below
            }
        }

        console.log(`DEBUG: Qontak Messages API Status: ${msgsRes.status}`);

        try {
            msgsData = rawText ? JSON.parse(rawText) : {};
        } catch (e) {
            console.error("Failed to parse Qontak response:", e);
            return new Response(JSON.stringify({ error: "Invalid JSON", details: rawText.substring(0, 500) }), {
                status: 502,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        if (!msgsRes.ok) {
            console.error(`Final API Check failed: ${msgsRes.status} | Body: ${rawText.substring(0, 200)}`);
            // Instead of erroring, return empty list to keep UI stable
            return new Response(JSON.stringify({
                data: [],
                meta: { source: "Error Fallback", original_error: msgsData }
            }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 3. Normalize Data for Frontend
        // Map Qontak message structure to what UI expects
        const messages = (msgsData.data || []).map((msg: any) => {
            // Qontak API variations for sender identification
            const isAgent =
                msg.sender_type === 'agent' ||
                msg.direction === 'outbound' ||
                msg.sender?.type === 'agent' ||
                msg.is_room_owner === false; // Fallback

            return {
                id: msg.id,
                text: msg.text || (msg.type === 'file' ? '[File]' : (msg.type === 'image' ? '[Image]' : '[Media]')),
                created_at: msg.created_at,
                sender: isAgent ? 'agent' : 'customer', // Match Inbox.tsx expectation
                is_agent: isAgent,
                status: msg.status
            };
        }).reverse(); // API returns newest first, Chat UI needs oldest first

        console.log(`DEBUG: Returning ${messages.length} messages. Source: ${(!msgsRes.ok || rawText.includes("service-chat")) ? "Legacy" : "Mekari"}`);

        return new Response(JSON.stringify({
            data: messages,
            meta: {
                count: messages.length,
                source: "Mekari/Legacy Hybrid",
                room_id: roomId
            }
        }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        console.error("Critical Error in get-messages:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
