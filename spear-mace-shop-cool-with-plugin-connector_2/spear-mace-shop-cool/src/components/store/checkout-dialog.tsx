import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { formatGBP } from "@/lib/store-data";
import type { Product } from "@/lib/store-data";
import { effectivePrice } from "@/lib/store-data";

const schema = z.object({
  ign: z
    .string()
    .trim()
    .min(3, { message: "IGN must be at least 3 characters" })
    .max(16, { message: "IGN must be 16 characters or fewer" })
    .regex(/^[A-Za-z0-9_]+$/, { message: "Only letters, numbers and underscores" }),
  email: z
    .string()
    .trim()
    .max(255)
    .email({ message: "Enter a valid email" })
    .optional()
    .or(z.literal("")),
});

export function CheckoutDialog({
  open,
  onOpenChange,
  onDone,
  buyNow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
  buyNow?: Product;
}) {
  const { items, total, clear } = useCart();
  const [ign, setIgn] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ ign?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);

  const orderItems = buyNow
    ? [{ id: buyNow.id, name: buyNow.name, price: effectivePrice(buyNow), quantity: 1 }]
    : items;
  const orderTotal = buyNow ? effectivePrice(buyNow) : total;

  const submit = async () => {
    const parsed = schema.safeParse({ ign, email });
    if (!parsed.success) {
      const fieldErrors: { ign?: string; email?: string } = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as "ign" | "email"] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase.from("orders").insert({
      ign: parsed.data.ign,
      email: parsed.data.email || null,
      items: orderItems.map((i) => ({ ...i })),
      total: orderTotal,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not place your order. Please try again.");
      return;
    }
    toast.success(`Order placed for ${parsed.data.ign}`, {
      description: "Open a ticket in our Discord to complete payment and delivery.",
    });
    if (!buyNow) clear();
    setIgn("");
    setEmail("");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter your in-game name</DialogTitle>
          <DialogDescription>
            Your purchase is delivered to this Minecraft username, so please double-check it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
            {orderItems.map((item) => (
              <div key={item.id} className="flex justify-between gap-3">
                <span className="truncate">
                  {item.name} x{item.quantity}
                </span>
                <span className="tabular-nums">{formatGBP(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatGBP(orderTotal)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ign">IGN (Minecraft username)</Label>
            <Input
              id="ign"
              value={ign}
              maxLength={16}
              placeholder="Steve"
              onChange={(e) => setIgn(e.target.value)}
            />
            {errors.ign ? <p className="text-sm text-destructive">{errors.ign}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              maxLength={255}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={saving || orderItems.length === 0} className="w-full">
            {saving ? "Placing order..." : `Confirm order · ${formatGBP(orderTotal)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
