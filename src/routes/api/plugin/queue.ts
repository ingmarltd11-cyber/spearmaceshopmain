import { createServerFileRoute } from "@tanstack/react-start/server";
import { json } from "@tanstack/react-start";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyPluginApiKey } from "@/lib/plugin-auth.server";

export const ServerRoute = createServerFileRoute("/api/plugin/queue").methods({
  GET: async ({ request }) => {
    const ok = await verifyPluginApiKey(request);
    if (!ok) {
      return json({ error: "Invalid or missing x-api-key" }, { status: 401 });
    }

    void supabaseAdmin
      .from("plugin_settings")
      .update({ last_polled_at: new Date().toISOString() })
      .eq("id", true)
      .then(() => undefined);

    const { data, error } = await supabaseAdmin
      .from("delivery_queue")
      .select("id, ign, discord, product_name, command")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      return json({ error: "Could not load the delivery queue" }, { status: 500 });
    }

    return json({ commands: data ?? [] });
  },
});
