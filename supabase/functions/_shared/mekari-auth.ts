/**
 * Generate Mekari HMAC Authentication headers.
 * 
 * Per Mekari docs: https://developers.mekari.com/docs/kb/hmac-authentication
 * Authorization: hmac username="CLIENT_ID", algorithm="hmac-sha256", headers="date request-line", signature="xxxx"
 * 
 * Payload to sign: "date: {date}\n{METHOD} {pathWithQuery} HTTP/1.1"
 */
export async function generateMekariHeaders(
  method: string,
  pathWithQuery: string
): Promise<Record<string, string>> {
  const clientId = Deno.env.get("MEKARI_CLIENT_ID");
  const clientSecret = Deno.env.get("MEKARI_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("MEKARI_CLIENT_ID or MEKARI_CLIENT_SECRET not configured");
  }

  const dateStr = new Date().toUTCString();
  // Per Mekari docs: request-line = "{METHOD} {path} HTTP/1.1"
  const requestLine = `${method.toLowerCase()} ${pathWithQuery} HTTP/1.1`;
  // Per Mekari docs: payload = "date: {date}\n{request-line}"
  const payload = `date: ${dateStr}\n${requestLine}`;

  console.log("HMAC Debug - Date:", dateStr);
  console.log("HMAC Debug - Request Line:", requestLine);
  console.log("HMAC Debug - Payload:", JSON.stringify(payload));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  const authHeader = `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`;
  console.log("HMAC Debug - Auth Header:", authHeader);

  return {
    "Authorization": authHeader,
    "Date": dateStr,
    "Content-Type": "application/json",
  };
}
