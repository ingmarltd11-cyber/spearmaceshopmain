import { createServerFileRoute } from "@tanstack/react-start/server";
import { json } from "@tanstack/react-start";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe.server";

export const Route = createServerFileRoute("/api/stripe-webhook").methods({
  POST: async ({ request }) => {
    const stripe = getStripe();

    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return json(
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
        "Webhook signature verification failed",
        error,
      );

      return json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        id: string;
        payment_intent?: string | null;
        metadata?: {
          order_id?: string;
        };
      };

      const orderId = session.metadata?.order_id;

      if (orderId) {
        await supabaseAdmin
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
      }
    }

    return json({
      received: true,
    });
  },
});
