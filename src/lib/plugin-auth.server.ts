// Server-only. Verifies the Minecraft plugin's `x-api-key` header against the
// key stored in `plugin_settings`. Never import this from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function verifyPluginApiKey(request: Request): Promise<boolean> {
  const key = request.headers.get("x-api-key");
  if (!key) return false;

  const { data, error } = await supabaseAdmin
    .from("plugin_settings")
    .select("api_key")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) return false;
  return timingSafeEqual(key, data.api_key);
}

// Avoids leaking key length/prefix info through response-time differences.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
