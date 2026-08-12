import { createFileRoute } from "@tanstack/react-router";
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

  email: z
    .string()
    .trim()
    .email()
    .max(255)
    .optional()
    .or(z.literal("")),

  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),

  discountCode: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("")),
});

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        /*
         * ============================================================
         * 1. VALIDATE REQUEST
         * ============================================================
         */

        let body: z.infer<typeof bodySchema>;

        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json(
            {
              error: "Invalid checkout request.",
            },
            {
              status: 400,
            },
          );
        }

        /*
         * ============================================================
         * 2. GET PRODUCT IDS
         *
         * The frontend only sends the UUID.
         * We NEVER trust the frontend for name or price.
         * Everything important is loaded again from Supabase.
         * ============================================================
         */

        const productIds = [
          ...new Set(body.items.map((item) => item.id)),
        ];

        /*
         * ============================================================
         * 3. LOAD PRODUCTS DIRECTLY FROM SUPABASE
         * ============================================================
         */

        const { data: products, error: productsError } =
          await supabaseAdmin
            .from("products")
            .select(
              "id, name, price, sale_price, is_visible, delivery_commands",
            )
            .in("id", productIds);

        if (productsError) {
          console.error(
            "[Checkout] Product lookup failed:",
            productsError,
          );

          return Response.json(
            {
              error: "Could not load products.",
            },
            {
              status: 500,
            },
          );
        }

        /*
         * ============================================================
         * 4. MAKE PRODUCT LOOKUP MAP
         * ============================================================
         */

        const productById = new Map(
          (products ?? []).map((product) => [
            product.id,
            product,
          ]),
        );

        /*
         * ============================================================
         * 5. CHECK EVERY PRODUCT
         * ============================================================
         */

        const resolvedItems: {
          id: string;
          name: string;
          price: number;
          quantity: number;
          delivery_commands: string | null;
        }[] = [];

        for (const requestedItem of body.items) {
          const product = productById.get(requestedItem.id);

          if (!product) {
            console.error(
              "[Checkout] Product UUID does not exist:",
              requestedItem.id,
            );

            return Response.json(
              {
                error:
                  "One of the selected products no longer exists.",
                productId: requestedItem.id,
              },
              {
                status: 400,
              },
            );
          }

          if (!product.is_visible) {
            return Response.json(
              {
                error: `${product.name} is currently unavailable.`,
              },
              {
                status: 400,
              },
            );
          }

          /*
           * Sale price automatically wins when it is lower
           * than the normal price.
           */

          const price =
            product.sale_price !== null &&
            product.sale_price < product.price
              ? product.sale_price
              : product.price;

          resolvedItems.push({
            id: product.id,
            name: product.name,
            price,
            quantity: requestedItem.quantity,
            delivery_commands:
              product.delivery_commands ?? null,
          });
        }

        /*
         * ============================================================
         * 6. CALCULATE TOTAL
         * ============================================================
         */

        const subtotal = resolvedItems.reduce(
          (sum, item) =>
            sum + item.price * item.quantity,
          0,
        );

        if (subtotal <= 0) {
          return Response.json(
            {
              error: "Order total must be greater than zero.",
            },
            {
              status: 400,
            },
          );
        }

        /*
         * ============================================================
         * 7. DISCOUNT CODE
         * ============================================================
         */

        let discountAmount = 0;
        let discountCodeUsed: string | null = null;

        if (body.discountCode) {
          const normalizedCode =
            body.discountCode.trim().toUpperCase();

          const { data: discount, error: discountError } =
            await supabaseAdmin
              .from("discount_codes")
              .select(
                "id, code, type, amount, min_order_total, max_uses, used_count, is_active, expires_at",
              )
              .eq("code", normalizedCode)
              .maybeSingle();

          if (discountError) {
            console.error(
              "[Checkout] Discount lookup failed:",
              discountError,
            );

            return Response.json(
              {
                error: "Could not verify discount code.",
              },
              {
                status: 500,
              },
            );
          }

          if (!discount) {
            return Response.json(
              {
                error: "Invalid discount code.",
              },
              {
                status: 400,
              },
            );
          }

          if (!discount.is_active) {
            return Response.json(
              {
                error: "This discount code is not active.",
              },
              {
                status: 400,
              },
            );
          }

          if (
            discount.expires_at &&
            new Date(discount.expires_at).getTime() <=
              Date.now()
          ) {
            return Response.json(
              {
                error: "This discount code has expired.",
              },
              {
                status: 400,
              },
            );
          }

          if (
            discount.max_uses !== null &&
            discount.used_count >= discount.max_uses
          ) {
            return Response.json(
              {
                error:
                  "This discount code has reached its usage limit.",
              },
              {
                status: 400,
              },
            );
          }

          if (
            discount.min_order_total !== null &&
            subtotal < discount.min_order_total
          ) {
            return Response.json(
              {
                error: `Minimum order total is £${Number(
                  discount.min_order_total,
                ).toFixed(2)}.`,
              },
              {
                status: 400,
              },
            );
          }

          if (discount.type === "percent") {
            discountAmount =
              subtotal * (Number(discount.amount) / 100);
          } else {
            discountAmount = Number(discount.amount);
          }

          /*
           * Never allow the discount to make the order negative.
           */

          discountAmount = Math.min(
            Math.max(discountAmount, 0),
            subtotal,
          );

          discountCodeUsed = discount.code;
        }

        /*
         * ============================================================
         * 8. FINAL TOTAL
         * ============================================================
         */

        const total = Math.max(
          subtotal - discountAmount,
          0,
        );

        if (total <= 0) {
          return Response.json(
            {
              error:
                "Order total must be greater than zero.",
            },
            {
              status: 400,
            },
          );
        }

        /*
         * ============================================================
         * 9. CREATE ORDER
         * ============================================================
         */

        const { data: order, error: orderError } =
          await supabaseAdmin
            .from("orders")
            .insert({
              ign: body.ign,
              email: body.email || null,

              items: resolvedItems.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                delivery_commands:
                  item.delivery_commands,
              })),

              total,

              status: "pending",
            })
            .select("id")
            .single();

        if (orderError || !order) {
          console.error(
            "[Checkout] Order creation failed:",
            orderError,
          );

          return Response.json(
            {
              error: "Could not create order.",
            },
            {
              status: 500,
            },
          );
        }

        /*
         * ============================================================
         * 10. CREATE STRIPE CHECKOUT
         * ============================================================
         */

        const origin = new URL(request.url).origin;

        try {
          const stripe = getStripe();

          /*
           * Stripe receives the ACTUAL current product information
           * from Supabase.
           */

          const lineItems =
            resolvedItems.map((item) => ({
              quantity: item.quantity,

              price_data: {
                currency: "gbp",

                unit_amount: Math.round(
                  item.price * 100,
                ),

                product_data: {
                  name: item.name,

                  description:
                    `Delivered to IGN: ${body.ign}`,
                },
              },
            }));

          /*
           * Stripe coupon / discount is intentionally not created
           * here. The discount has already been securely calculated
           * on the server.
           *
           * We therefore adjust the Stripe line item using a single
           * custom line item when a discount is active.
           */

          const stripeLineItems =
            discountAmount > 0
              ? [
                  {
                    quantity: 1,

                    price_data: {
                      currency: "gbp",

                      unit_amount: Math.round(
                        total * 100,
                      ),

                      product_data: {
                        name: "SpearMaceFFA Store order",

                        description:
                          `Order for ${body.ign}`,
                      },
                    },
                  },
                ]
              : lineItems;

          const session =
            await stripe.checkout.sessions.create({
              mode: "payment",

              payment_method_types: ["card"],

              customer_email:
                body.email || undefined,

              line_items: stripeLineItems,

              metadata: {
                order_id: order.id,
                ign: body.ign,
                discount_code:
                  discountCodeUsed ?? "",
                discount_amount:
                  discountAmount.toFixed(2),
              },

              success_url:
                `${origin}/checkout/success?order=${order.id}`,

              cancel_url:
                `${origin}/checkout/cancel?order=${order.id}`,

              /*
               * Stripe's checkout page will show the normal
               * checkout/payment interface.
               */

              submit_type: "pay",
            });

          /*
           * ============================================================
           * 11. SAVE STRIPE SESSION
           * ============================================================
           */

          const { error: updateError } =
            await supabaseAdmin
              .from("orders")
              .update({
                stripe_session_id: session.id,
              })
              .eq("id", order.id);

          if (updateError) {
            console.error(
              "[Checkout] Could not save Stripe session:",
              updateError,
            );
          }

          /*
           * ============================================================
           * 12. DISCOUNT USAGE
           * ============================================================
           */

          if (discountCodeUsed) {
            const { data: discount } =
              await supabaseAdmin
                .from("discount_codes")
                .select("used_count")
                .eq("code", discountCodeUsed)
                .maybeSingle();

            if (discount) {
              await supabaseAdmin
                .from("discount_codes")
                .update({
                  used_count:
                    Number(discount.used_count) + 1,
                })
                .eq("code", discountCodeUsed);
            }
          }

          /*
           * ============================================================
           * 13. RETURN CHECKOUT URL
           * ============================================================
           */

          return Response.json({
            success: true,

            url: session.url,

            orderId: order.id,

            subtotal,

            discountAmount,

            total,
          });
        } catch (error) {
          console.error(
            "[Stripe] Checkout creation failed:",
            error,
          );

          /*
           * Mark order as cancelled if Stripe could not
           * create the checkout session.
           */

          await supabaseAdmin
            .from("orders")
            .update({
              status: "cancelled",
            })
            .eq("id", order.id);

          return Response.json(
            {
              error:
                "The payment provider is currently not connected.",
            },
            {
              status: 503,
            },
          );
        }
      },
    },
  },
});
