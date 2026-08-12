import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getStripe,
  getStripeWebhookSecret,
} from "@/lib/stripe.server";

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const stripe = getStripe();

        const signature = request.headers.get("stripe-signature");

        if (!signature) {
          return Response.json(
            { error: "Missing stripe-signature" },
            { status: 400 },
          );
        }

        const rawBody = await request.text();

        let event;

        try {
          event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            getStripeWebhookSecret(),
          );
        } catch (error) {
          console.error(
            "Webhook signature verification failed:",
            error,
          );

          return Response.json(
            { error: "Invalid signature" },
            { status: 400 },
          );
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;

          const orderId = session.metadata?.order_id;

          if (orderId) {
            const { error } = await supabaseAdmin
              .from("orders")
              .update({
                status: "paid",
                stripe_session_id: session.id,
                stripe_payment_intent_id:
                  typeof session.payment_intent === "string"
                    ? session.payment_intent
                    : null,
                paid_at: new Date().toISOString(),
              })
              .eq("id", orderId)
              .neq("status", "paid");

            if (error) {
              console.error(
                "Failed to update paid order:",
                error,
              );

              return Response.json(
                { error: "Could not update order" },
                { status: 500 },
              );
            }
          }
        }

        return Response.json({
          received: true,
        });
      },
    },
  },
});
