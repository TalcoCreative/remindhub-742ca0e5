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

        const { phoneNumber, name, templateId, templateParams } = await req.json();

        if (!phoneNumber || !templateId) {
            return new Response(JSON.stringify({ error: "Phone number and Template ID are required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 1. Get Qontak Token & Channel ID
        const { data: tokenSetting } = await supabase.from("app_settings").select("value").eq("key", "qontak_token").single();
        const { data: channelSetting } = await supabase.from("app_settings").select("value").eq("key", "qontak_channel_id").single();

        if (!tokenSetting?.value || !channelSetting?.value) {
            return new Response(JSON.stringify({ error: "Qontak configuration missing" }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const qontakToken = tokenSetting.value;
        const channelId = channelSetting.value;

        // 2. Format Phone Number (start with 62)
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);

        console.log(`Starting conversation with ${formattedPhone} using template ${templateId}`);

        // 3. Send Template Message (Initiate Conversation)
        // Note: Qontak API for passing/initating might differ, assuming direct message send with template
        // Endpoint: POST https://service-chat.qontak.com/api/open/v1/broadcasts/whatsapp/direct
        // OR standard message send if within 24h window, but usually "Start Conversation" implies outside window -> Template needed.

        // Let's try Broadcast Direct API which is often used for Template messaging outside window
        const payload = {
            to_name: name || formattedPhone,
            to_number: formattedPhone,
            message_template_id: templateId,
            channel_integration_id: channelId,
            language: { code: "id" },
            parameters: {
                body: templateParams || [] // Array of { key: "1", value: "param_value", value_text: "param_value" }
            }
        };

        const response = await fetch("https://api.mekari.com/v1/qontak/broadcasts/whatsapp/direct", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${qontakToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Qontak Broadcast Error:", data);
            return new Response(JSON.stringify({ error: "Failed to send template", details: data }), {
                status: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 4. Upsert Chat in Local DB
        // We might not get the 'room_id' immediately from broadcast API, 
        // but we can create a placeholder chat or rely on the webhook to create it when the message status updates.
        // However, for better UX, let's look up if we can find the room or create a lead.

        // For now, return success
        return new Response(JSON.stringify({
            success: true,
            data: data.data,
            message: "Template sent. Conversation started."
        }), {
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
