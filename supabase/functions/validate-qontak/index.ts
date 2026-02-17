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
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ valid: false, error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Try Mekari API (New Standard)
    let isValid = false;
    let responseData: any = {};
    let errorDetails = "";

    console.log("Validating with Mekari API...");
    const resMekari = await fetch("https://api.mekari.com/v1/qontak/chat/rooms?limit=5", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (resMekari.ok) {
      isValid = true;
      responseData = await resMekari.json();
    } else {
      errorDetails = `Mekari API: ${resMekari.status} ${resMekari.statusText}`;
      console.log(`Mekari API failed (${resMekari.status}), trying legacy...`);

      // 2. Fallback: Try Legacy Qontak API
      // Only if Mekari failed (likely 401 if using old token)
      const resLegacy = await fetch("https://service-chat.qontak.com/api/open/v1/rooms?limit=5", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (resLegacy.ok) {
        isValid = true;
        responseData = await resLegacy.json();
        console.log("Legacy API validation successful.");
      } else {
        errorDetails += ` | Legacy API: ${resLegacy.status} ${resLegacy.statusText}`;
        const legacyText = await resLegacy.text();
        console.error("Legacy API error:", legacyText);
      }
    }

    if (isValid) {
      // Extract unique channels found to simulate the "Connected Channels" response
      const uniqueChannels = [...new Set((responseData.data || []).map((r: any) => r.channel))].map(ch => ({
        id: ch || 'whatsapp',
        settings: { phone_number: 'Connected' }
      }));

      if (uniqueChannels.length === 0) {
        uniqueChannels.push({ id: 'whatsapp', settings: { phone_number: 'Account Active' } });
      }

      return new Response(JSON.stringify({
        valid: true,
        data: { data: uniqueChannels }
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ valid: false, error: `Invalid token. ${errorDetails}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err: any) {
    console.error("Validation error:", err);
    return new Response(JSON.stringify({ valid: false, error: "Validation failed: " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
