import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import heroArena from "@/assets/hero-arena.jpg";
import { ProductCard } from "@/components/store/product-card";
import { productsQuery, settingsQuery } from "@/lib/store-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpearMaceFFA Store — Minecraft Ranks & Keys" },
      {
        name: "description",
        content:
          "The official SpearMaceFFA store. Grab ranks, crate keys and the £1 Meow rank, delivered straight to your IGN.",
      },
      { property: "og:title", content: "SpearMaceFFA Store — Minecraft Ranks & Keys" },
      {
        property: "og:description",
        content: "Official SpearMaceFFA store for ranks, crate keys and bundles.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: settings } = useQuery(settingsQuery());
  const { data: products } = useQuery(productsQuery());

  const featured = (products ?? []).slice(0, 6);
  const ip = settings?.server_ip ?? "";

  return (
    <>
      <section className="hero-gradient border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Sparkles className="size-3.5" /> Official store
            </span>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              {settings?.home_heading || "Welcome to the official SpearMaceFFA store"}
            </h1>
            <p className="mt-4 max-w-prose whitespace-pre-line text-base text-muted-foreground">
              {settings?.home_text ||
                "Welcome to the official SpearMaceFFA store owner by txn_chxdeo and iamlazyy."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/store">Browse the store</Link>
              </Button>
              {settings?.discord_url ? (
                <Button asChild variant="outline" size="lg">
                  <a href={settings.discord_url} target="_blank" rel="noreferrer noopener">
                    <MessageCircle className="size-4" />
                    Join our Discord
                  </a>
                </Button>
              ) : null}
            </div>

            {ip ? (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(ip);
                  toast.success("Server IP copied");
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium shadow-[var(--shadow-card)] transition-colors hover:bg-accent"
              >
                <span className="text-muted-foreground">Server IP</span>
                <span className="font-display font-semibold">{ip}</span>
                <Copy className="size-4 text-muted-foreground" />
              </button>
            ) : null}
          </div>

          <div className="surface-panel overflow-hidden">
            <img
              src={settings?.hero_image_url || heroArena}
              alt="SpearMaceFFA blocky PvP arena artwork"
              width={1200}
              height={900}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold">Popular right now</h2>
            <p className="text-sm text-muted-foreground">
              Ranks and keys delivered instantly to your in-game name.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/store">View everything</Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">Before you buy</h2>
            <p className="text-sm text-muted-foreground">
              All purchases are final. Read the rank FAQ and terms first.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/faq">Read the Rank FAQ</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
