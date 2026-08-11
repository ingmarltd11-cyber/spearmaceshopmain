import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, ShoppingCart, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { settingsQuery } from "@/lib/store-data";
import { CartSheet } from "./cart-sheet";

export function SiteHeader() {
  const { data: settings } = useQuery(settingsQuery());
  const { count } = useCart();
  const [copied, setCopied] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const ip = settings?.server_ip ?? "";
  const discord = settings?.discord_url ?? "";

  const copyIp = async () => {
    if (!ip) return;
    await navigator.clipboard.writeText(ip);
    setCopied(true);
    toast.success("Server IP copied");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="font-display text-lg font-bold tracking-tight">
          {settings?.store_name || "SpearMaceFFA Store"}
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "bg-muted text-foreground" }}
          >
            Home
          </Link>
          <Link
            to="/store"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: "bg-muted text-foreground" }}
          >
            Store
          </Link>
          <Link
            to="/faq"
            className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: "bg-muted text-foreground" }}
          >
            Rank FAQ
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {ip ? (
            <Button variant="secondary" size="sm" onClick={copyIp} className="hidden sm:inline-flex">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {ip}
            </Button>
          ) : null}
          {discord ? (
            <Button asChild variant="outline" size="sm">
              <a href={discord} target="_blank" rel="noreferrer noopener">
                <MessageCircle className="size-4" />
                <span className="hidden sm:inline">Discord</span>
              </a>
            </Button>
          ) : null}
          <Button size="sm" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="size-4" />
            Cart{count > 0 ? ` (${count})` : ""}
          </Button>
        </div>
      </div>
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
