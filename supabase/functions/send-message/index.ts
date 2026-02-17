import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
        const { chatId, text, roomId } = await req.json();

        if ((!chatId && !roomId) || !text) {
            return new Response(JSON.stringify({ error: "chatId or roomId, and text are required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        let targetRoomId = roomId;

        // 1. Get Chat Room ID if not provided
        if (!targetRoomId && chatId) {
            const { data: chat, error: chatError } = await supabase
                .from("chats")
                .select("room_id")
                .eq("id", chatId)
                .single();

            if (chatError || !chat) {
                return new Response(JSON.stringify({ error: "Chat not found" }), {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            if (!chat.room_id) {
                return new Response(JSON.stringify({ error: "Chat has no room_id linked to Qontak" }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            targetRoomId = chat.room_id;
        }

        // 2. Get Qontak Token
        const { data: settings, error: settingsError } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "qontak_token")
            .single();

        if (settingsError || !settings?.value) {
            return new Response(JSON.stringify({ error: "Qontak token not configured" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const qontakToken = settings.value;

        // 3. Send Message via Qontak API
        // Updated to api.mekari.com
        const response = await fetch(
            `https://api.mekari.com/v1/qontak/chat/rooms/${targetRoomId}/messages`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${qontakToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: text,
                    type: "text",
                }),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error("Qontak API Error:", result);
            return new Response(JSON.stringify({ error: "Failed to send message via Qontak", details: result }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 4. Insert Message to Database (Agent Sender) - ONLY if chatId exists (Legacy Mode)
        // In Proxy mode, we don't save to DB, we just rely on Qontak to have it.
        if (chatId) {
            const { error: insertError } = await supabase.from("messages").insert({
                chat_id: chatId,
                text: text,
                sender: "agent",
            });

            if (insertError) {
                console.error("Error inserting message:", insertError);
            }

            // 5. Update Chat (Last Message)
            await supabase.from("chats").update({
                last_message: text,
                last_timestamp: new Date().toISOString(),
                unread: 0,
            }).eq("id", chatId);
        }

        return new Response(JSON.stringify({ success: true, data: result }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Error in send-message function:", error);
        return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message, stack: error.stack }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
