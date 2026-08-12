import { createServerFileRoute } from "@tanstack/react-start/server";
import { json } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyPluginApiKey } from "@/lib/plugin-auth.server";

const bodySchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().uuid(),
        ok: z.boolean(),
      }),
    )
    .max(500),
});

export const Route = createServerFileRoute("/api/plugin/ack").methods({
  POST: async ({ request }) => {
    const ok = await verifyPluginApiKey(request);

    if (!ok) {
      return json(
        { error: "Invalid or missing x-api-key" },
        { status: 401 },
      );
    }

    let payload: z.infer<typeof bodySchema>;

    try {
      payload = bodySchema.parse(await request.json());
    } catch {
      return json(
        { error: "Malformed body" },
        { status: 400 },
      );
    }

    const deliveredIds = payload.results
      .filter((result) => result.ok)
      .map((result) => result.id);

    const failedIds = payload.results
      .filter((result) => !result.ok)
      .map((result) => result.id);

    if (deliveredIds.length > 0) {
      await supabaseAdmin
        .from("delivery_queue")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .in("id", deliveredIds);
    }

    if (failedIds.length > 0) {
      await supabaseAdmin
        .from("delivery_queue")
        .update({
          status: "failed",
        })
        .in("id", failedIds);
    }

    return json({
      acknowledged: deliveredIds.length + failedIds.length,
    });
  },
});
