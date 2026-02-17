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

    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
        const { username, password, client_id, client_secret, grant_type, refresh_token } = await req.json();

        const type = grant_type || 'password';

        let body: any = {
            client_id,
            client_secret,
            grant_type: type,
            scope: "qontak-chat:all offline_access",
        };

        if (type === 'password') {
            if (!username || !password) {
                return new Response(JSON.stringify({ error: "Username and password required for password grant" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            body = { ...body, username, password };
        } else if (type === 'refresh_token') {
            if (!refresh_token) {
                return new Response(JSON.stringify({ error: "Refresh token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            body = { ...body, refresh_token };
        } else {
            return new Response(JSON.stringify({ error: "Unsupported grant_type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        console.log(`Requesting token (${type})...`);

        // Updated to use new Mekari Auth endpoint (api.mekari.com)
        // Note: Password grant might be restricted on newer accounts.
        const tokenRes = await fetch("https://api.mekari.com/v2/oauth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error("Qontak Auth Error:", data);
            return new Response(JSON.stringify({ error: data.error_description || "Authentication failed" }), {
                status: tokenRes.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("Auth function error:", err);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
