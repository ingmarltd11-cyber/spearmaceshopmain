import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { effectivePrice, formatGBP } from "@/lib/store-data";
import type { Product } from "@/lib/store-data";
import { CheckoutDialog } from "./checkout-dialog";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [buyOpen, setBuyOpen] = useState(false);
  const onSale = product.sale_price != null && product.sale_price < product.price;

  return (
    <article className="group surface-panel flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="hero-gradient flex size-full items-center justify-center">
            <span className="font-display text-2xl font-bold text-foreground/70">
              {product.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        {product.badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
            {product.badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{product.name}</h3>
          {product.description ? (
            <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
              {product.description}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-display text-xl font-bold">
            {formatGBP(effectivePrice(product))}
          </span>
          {onSale ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatGBP(product.price)}
            </span>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => setBuyOpen(true)}>
            Buy now
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={`Add ${product.name} to cart`}
            onClick={() => {
              add(product);
              toast.success(`${product.name} added to cart`);
            }}
          >
            <ShoppingCart className="size-4" />
          </Button>
        </div>
      </div>

      <CheckoutDialog open={buyOpen} onOpenChange={setBuyOpen} buyNow={product} />
    </article>
  );
}
