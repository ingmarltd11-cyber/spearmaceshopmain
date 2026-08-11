import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ProductCard } from "@/components/store/product-card";
import { CATEGORIES, productsQuery } from "@/lib/store-data";
import type { ProductCategory } from "@/lib/store-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "Store — SpearMaceFFA Ranks, Keys & Sales" },
      {
        name: "description",
        content:
          "Buy SpearMaceFFA ranks, crate keys and sale bundles in GBP. Enter your IGN at checkout for delivery.",
      },
      { property: "og:title", content: "Store — SpearMaceFFA Ranks, Keys & Sales" },
      {
        property: "og:description",
        content: "Ranks, crate keys and sale bundles for the SpearMaceFFA Minecraft server.",
      },
    ],
  }),
  component: StorePage,
});

function StorePage() {
  const { data: products, isLoading } = useQuery(productsQuery());
  const [active, setActive] = useState<ProductCategory | "all">("all");

  const list = (products ?? []).filter((p) => active === "all" || p.category === active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Store</h1>
      <p className="mt-2 text-muted-foreground">
        Pick a package, hit buy now, and enter your in-game name at checkout.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {[{ id: "all" as const, label: "All" }, ...CATEGORIES].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActive(cat.id as ProductCategory | "all")}
            className={cn(
              "rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors",
              active === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading packages...</p>
      ) : list.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Nothing in this category yet.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
