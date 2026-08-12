import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/api/plugin/ack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = await verifyPluginApiKey(request);

        if (!ok) {
          return Response.json(
            { error: "Invalid or missing x-api-key" },
            { status: 401 },
          );
        }

        let payload: z.infer<typeof bodySchema>;

        try {
          payload = bodySchema.parse(await request.json());
        } catch {
          return Response.json(
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
          const { error } = await supabaseAdmin
            .from("delivery_queue")
            .update({
              status: "delivered",
              delivered_at: new Date().toISOString(),
            })
            .in("id", deliveredIds);

          if (error) {
            console.error("Failed to mark deliveries as delivered:", error);

            return Response.json(
              { error: "Could not update delivered commands" },
              { status: 500 },
            );
          }
        }

        if (failedIds.length > 0) {
          const { error } = await supabaseAdmin
            .from("delivery_queue")
            .update({
              status: "failed",
            })
            .in("id", failedIds);

          if (error) {
            console.error("Failed to mark deliveries as failed:", error);

            return Response.json(
              { error: "Could not update failed commands" },
              { status: 500 },
            );
          }
        }

        return Response.json({
          acknowledged: deliveredIds.length + failedIds.length,
        });
      },
    },
  },
});
