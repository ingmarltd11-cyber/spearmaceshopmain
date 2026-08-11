import { createServerFileRoute } from "@tanstack/react-start/server";
import { json } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getStripe } from "@/lib/stripe.server";

const bodySchema = z.object({
  ign: z
    .string()
    .trim()
    .min(3)
    .max(16)
    .regex(/^[A-Za-z0-9_]+$/),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120),
        price: z.number().positive(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

export const ServerRoute = createServerFileRoute("/api/checkout").methods({
  POST: async ({ request }) => {
    let body: z.infer<typeof bodySchema>;
    try {
      body = bodySchema.parse(await request.json());
    } catch {
      return json({ error: "Invalid request body" }, { status: 400 });
    }

    const total = body.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    if (total <= 0) {
      return json({ error: "Order total must be greater than zero" }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        ign: body.ign,
        email: body.email || null,
        items: body.items,
        total,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error(orderError);
      return json({ error: "Could not create order" }, { status: 500 });
    }

    const origin = new URL(request.url).origin;

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: body.email || undefined,
        line_items: body.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(item.price * 100),
            product_data: {
              name: item.name,
              description: `Delivered to IGN: ${body.ign}`,
            },
          },
        })),
        metadata: {
          order_id: order.id,
          ign: body.ign,
        },
        success_url: `${origin}/checkout/success?order=${order.id}`,
        cancel_url: `${origin}/checkout/cancel?order=${order.id}`,
      });

      await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);

      return json({ url: session.url, orderId: order.id });
    } catch (err) {
      console.error(err);
      return json(
        {
          error:
            "Stripe is not configured yet. Add STRIPE_SECRET_KEY in your environment, or mark the order paid manually in admin.",
        },
        { status: 503 },
      );
    }
  },
});
