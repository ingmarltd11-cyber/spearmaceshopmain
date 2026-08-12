import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  DEFAULT_SETTINGS,
  bundleRegularTotal,
  bundlesQuery,
  discountCodesQuery,
  formatGBP,
  productsQuery,
  settingsQuery,
  uploadStoreImage,
} from "@/lib/store-data";
import type { Bundle, BundleItem, DiscountCode, Product, SiteSettings } from "@/lib/store-data";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — SpearMaceFFA Store" },
      { name: "description", content: "Manage products, images, settings and orders." },
      { property: "og:title", content: "Admin Dashboard — SpearMaceFFA Store" },
      { property: "og:description", content: "Manage products, images, settings and orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return Boolean(data);
    },
  });
}

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (roleLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Loading...</div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="surface-panel p-6 text-center">
          <h1 className="font-display text-xl font-bold">No admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account is signed in but has no admin role yet. If you are the first owner setting
            the store up, claim admin access below. Otherwise ask an existing admin.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button
              onClick={async () => {
                const { data, error } = await supabase.rpc("claim_first_admin");
                if (error || !data) {
                  toast.error("An admin already exists — ask them to grant you access.");
                  return;
                }
                toast.success("You are now an admin");
                void queryClient.invalidateQueries({ queryKey: ["is-admin"] });
              }}
            >
              Claim admin access
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Everything on the store can be edited here.
          </p>
        </div>
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <Tabs defaultValue="products" className="mt-8">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="bundles">Bundles</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="settings">Site settings</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="plugin">Plugin</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsPanel />
        </TabsContent>
        <TabsContent value="bundles" className="mt-6">
          <BundlesPanel />
        </TabsContent>
        <TabsContent value="discounts" className="mt-6">
          <DiscountsPanel />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsPanel />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersPanel />
        </TabsContent>
        <TabsContent value="plugin" className="mt-6">
          <PluginPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsPanel() {
  const queryClient = useQueryClient();
  const { data: products, isLoading } = useQuery(productsQuery(true));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const createProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .insert({ name: "New package", category: "keys", price: 0, is_visible: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package created");
      void invalidate();
    },
    onError: () => toast.error("Could not create the package"),
  });

  return (
    <div className="space-y-4">
      <Button onClick={() => createProduct.mutate()} disabled={createProduct.isPending}>
        <Plus className="size-4" /> New package
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading packages...</p>
      ) : (
        <div className="grid gap-4">
          {(products ?? []).map((product) => (
            <ProductEditor key={product.id} product={product} onChanged={invalidate} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductEditor({ product, onChanged }: { product: Product; onChanged: () => void }) {
  const [draft, setDraft] = useState<Product>(product);
  const [uploading, setUploading] = useState(false);

  useEffect(() => setDraft(product), [product]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Product>) => {
      const { error } = await supabase.from("products").update(patch).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      onChanged();
    },
    onError: () => toast.error("Could not save changes"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Package deleted");
      onChanged();
    },
    onError: () => toast.error("Could not delete the package"),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadStoreImage(file);
      setDraft((d) => ({ ...d, image_url: url }));
      await save.mutateAsync({ image_url: url });
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="surface-panel grid gap-4 p-4 md:grid-cols-[180px_1fr]">
      <div className="space-y-2">
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
          {draft.image_url ? (
            <img src={draft.image_url} alt={draft.name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading..." : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.name}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={draft.category}
              onValueChange={(value) => setDraft({ ...draft, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Price (GBP)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sale price (optional)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={draft.sale_price ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sale_price: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Badge (optional)</Label>
            <Input
              value={draft.badge ?? ""}
              maxLength={40}
              onChange={(e) => setDraft({ ...draft, badge: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description / perks</Label>
          <Textarea
            rows={3}
            maxLength={2000}
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Delivery commands (one per line)</Label>
          <Textarea
            rows={3}
            maxLength={2000}
            placeholder={"lp user {ign} parent add vip\ncrates give {ign} legendary 1"}
            value={draft.delivery_commands ?? ""}
            onChange={(e) => setDraft({ ...draft, delivery_commands: e.target.value || null })}
          />
          <p className="text-xs text-muted-foreground">
            Use <code>{"{ign}"}</code> for the buyer's username. Each line is queued as its own
            command and run automatically by your Minecraft plugin once an order for this package
            is marked "Paid".
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.is_visible}
              onCheckedChange={(checked) => setDraft({ ...draft, is_visible: checked })}
              id={`visible-${product.id}`}
            />
            <Label htmlFor={`visible-${product.id}`}>Visible on the store</Label>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
            <Button
              size="sm"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  name: draft.name,
                  category: draft.category,
                  price: draft.price,
                  sale_price: draft.sale_price,
                  description: draft.description,
                  badge: draft.badge,
                  sort_order: draft.sort_order,
                  is_visible: draft.is_visible,
                  image_url: draft.image_url,
                  delivery_commands: draft.delivery_commands,
                })
              }
            >
              <Save className="size-4" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SETTING_FIELDS: { key: keyof SiteSettings; label: string; multiline?: boolean }[] = [
  { key: "store_name", label: "Store name" },
  { key: "server_ip", label: "Minecraft server IP" },
  { key: "discord_url", label: "Discord invite link" },
  { key: "home_heading", label: "Home page heading" },
  { key: "home_text", label: "Home page text", multiline: true },
  { key: "faq_text", label: "Rank FAQ / terms", multiline: true },
];

function SettingsPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery(settingsQuery());
  const [draft, setDraft] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (next: SiteSettings) => {
      const rows = Object.entries(next).map(([key, value]) => ({ key, value: String(value ?? "") }));
      const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      void queryClient.invalidateQueries({ queryKey: ["site_settings"] });
    },
    onError: () => toast.error("Could not save settings"),
  });

  const handleHero = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadStoreImage(file);
      const next = { ...draft, hero_image_url: url };
      setDraft(next);
      await save.mutateAsync(next);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="surface-panel space-y-5 p-5">
      {SETTING_FIELDS.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor={field.key}>{field.label}</Label>
          {field.multiline ? (
            <Textarea
              id={field.key}
              rows={field.key === "faq_text" ? 16 : 4}
              value={draft[field.key] ?? ""}
              onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
            />
          ) : (
            <Input
              id={field.key}
              value={draft[field.key] ?? ""}
              maxLength={255}
              onChange={(e) => setDraft({ ...draft, [field.key]: e.target.value })}
            />
          )}
        </div>
      ))}

      <div className="space-y-2">
        <Label>Hero image</Label>
        {draft.hero_image_url ? (
          <img
            src={draft.hero_image_url}
            alt="Hero preview"
            className="aspect-[4/3] w-56 rounded-xl border border-border object-cover"
          />
        ) : null}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading..." : "Upload hero image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleHero(file);
            }}
          />
        </label>
      </div>

      <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
        <Save className="size-4" /> Save settings
      </Button>
    </div>
  );
}

function randomApiKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `smffa_${hex}`;
}

interface QueueRow {
  id: string;
  ign: string;
  product_name: string;
  command: string;
  status: string;
  created_at: string;
}

function PluginPanel() {
  const queryClient = useQueryClient();
  const [reveal, setReveal] = useState(false);

  const { data: pluginSettings, isLoading: keyLoading } = useQuery({
    queryKey: ["plugin_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plugin_settings")
        .select("api_key, last_polled_at")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data as { api_key: string; last_polled_at: string | null } | null;
    },
  });

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ["delivery_queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_queue")
        .select("id, ign, product_name, command, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as QueueRow[];
    },
    refetchInterval: 15000,
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const key = randomApiKey();
      const { error } = await supabase
        .from("plugin_settings")
        .upsert(
          { id: true, api_key: key, regenerated_at: new Date().toISOString() },
          { onConflict: "id" },
        );
      if (error) throw error;
      return key;
    },
    onSuccess: () => {
      toast.success("New API key generated — update your plugin config.");
      setReveal(true);
      void queryClient.invalidateQueries({ queryKey: ["plugin_settings"] });
    },
    onError: () => toast.error("Could not generate a key"),
  });

  const storeUrl = typeof window !== "undefined" ? window.location.origin : "";
  const apiKey = pluginSettings?.api_key ?? null;
  const maskedKey = apiKey ? apiKey.slice(0, 8) + "•".repeat(Math.max(apiKey.length - 8, 8)) : null;

  const config = `# config.yml for the store plugin
store-url: "${storeUrl}"
api-key: "${apiKey ?? "<generate a key first>"}"
poll-seconds: 10`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy — copy it manually");
    }
  };

  const pending = (queue ?? []).filter((q) => q.status === "pending");

  return (
    <div className="space-y-6">
      <div className="surface-panel space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-bold">Connect your Minecraft plugin</h2>
          <p className="text-sm text-muted-foreground">
            Drop the key below into the plugin config in your server plugin files. The plugin
            polls the store, receives the commands for every purchase and runs them on the server
            automatically.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Secret API key</Label>
          {keyLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : apiKey ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                {reveal ? apiKey : maskedKey}
              </code>
              <Button variant="outline" size="sm" onClick={() => setReveal((r) => !r)}>
                {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {reveal ? "Hide" : "Show"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => copy(apiKey, "API key")}>
                <Copy className="size-4" /> Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => regenerate.mutate()}
                disabled={regenerate.isPending}
              >
                <RefreshCw className="size-4" /> Regenerate
              </Button>
            </div>
          ) : (
            <Button onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
              <Plus className="size-4" /> Generate a key
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Anyone with this key can pull your delivery queue — keep it inside the server only.
          </p>
        </div>

        {apiKey ? (
          <div className="space-y-1.5">
            <Label>Plugin config to paste</Label>
            <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs">
              {config}
            </pre>
            <Button variant="outline" size="sm" onClick={() => copy(config, "Config")}>
              <Copy className="size-4" /> Copy config
            </Button>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Endpoints the plugin uses</Label>
          <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs leading-relaxed">
{`GET  ${storeUrl}/api/plugin/queue
     header: x-api-key: <key>
     -> { "commands": [ { "id", "ign", "discord", "product_name", "command" } ] }

POST ${storeUrl}/api/plugin/ack
     header: x-api-key: <key>
     body:   { "results": [ { "id": "<id>", "ok": true } ] }`}
          </pre>
        </div>
      </div>

      <div className="surface-panel space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Delivery queue</h2>
          <span className="text-xs text-muted-foreground">
            {pending.length} pending{pluginSettings?.last_polled_at ? " · plugin has connected" : ""}
          </span>
        </div>
        {queueLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (queue ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing queued yet. Commands appear here the moment someone buys a package that has
            delivery commands set.
          </p>
        ) : (
          <div className="space-y-2">
            {(queue ?? []).map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border p-2.5 text-sm"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    row.status === "pending"
                      ? "bg-amber-500/15 text-amber-600"
                      : row.status === "delivered"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-red-500/15 text-red-600"
                  }`}
                >
                  {row.status}
                </span>
                <span className="font-display font-semibold">{row.ign}</span>
                <span className="text-muted-foreground">{row.product_name}</span>
                <code className="ml-auto truncate text-xs text-muted-foreground">
                  {row.command}
                </code>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface OrderRow {
  id: string;
  ign: string;
  email: string | null;
  total: number;
  status: string;
  created_at: string;
  items: unknown;
}

function OrdersPanel() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order updated");
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => toast.error("Could not update the order"),
  });

  const rows = useMemo(() => orders ?? [], [orders]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading orders...</p>;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">No orders yet.</p>;

  return (
    <div className="space-y-3">
      {rows.map((order) => {
        const items = Array.isArray(order.items)
          ? (order.items as { name: string; quantity: number }[])
          : [];
        return (
          <div
            key={order.id}
            className="surface-panel flex flex-wrap items-center gap-4 p-4 text-sm"
          >
            <div className="min-w-40">
              <p className="font-display font-semibold">{order.ign}</p>
              <p className="text-muted-foreground">
                {new Date(order.created_at).toLocaleString("en-GB")}
              </p>
            </div>
            <div className="min-w-48 flex-1 text-muted-foreground">
              {items.map((i, idx) => (
                <span key={idx}>
                  {i.name} x{i.quantity}
                  {idx < items.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
            <span className="font-semibold tabular-nums">{formatGBP(Number(order.total))}</span>
            <Select
              value={order.status}
              onValueChange={(status) => setStatus.mutate({ id: order.id, status })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

function BundlesPanel() {
  const queryClient = useQueryClient();
  const { data: bundles, isLoading } = useQuery(bundlesQuery(true));
  const { data: products } = useQuery(productsQuery(true));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["bundles"] });

  const createBundle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bundles")
        .insert({ name: "New bundle", price: 0, is_visible: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bundle created");
      void invalidate();
    },
    onError: () => toast.error("Could not create the bundle"),
  });

  return (
    <div className="space-y-4">
      <Button onClick={() => createBundle.mutate()} disabled={createBundle.isPending}>
        <Plus className="size-4" /> New bundle
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading bundles...</p>
      ) : (bundles ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No bundles yet. Group a few products together at a discounted price.
        </p>
      ) : (
        <div className="grid gap-4">
          {(bundles ?? []).map((bundle) => (
            <BundleEditor
              key={bundle.id}
              bundle={bundle}
              allProducts={products ?? []}
              onChanged={invalidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BundleEditor({
  bundle,
  allProducts,
  onChanged,
}: {
  bundle: Bundle;
  allProducts: Product[];
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<Bundle>(bundle);
  const [uploading, setUploading] = useState(false);
  const [newProductId, setNewProductId] = useState<string>("");

  useEffect(() => setDraft(bundle), [bundle]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Bundle>) => {
      const { error } = await supabase.from("bundles").update(patch).eq("id", bundle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      onChanged();
    },
    onError: () => toast.error("Could not save changes"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bundles").delete().eq("id", bundle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bundle deleted");
      onChanged();
    },
    onError: () => toast.error("Could not delete the bundle"),
  });

  const addProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("bundle_items")
        .insert({ bundle_id: bundle.id, product_id: productId, quantity: 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewProductId("");
      onChanged();
    },
    onError: () => toast.error("Could not add that product"),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("bundle_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => onChanged(),
    onError: () => toast.error("Could not remove that item"),
  });

  const setItemQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { error } = await supabase
        .from("bundle_items")
        .update({ quantity })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => onChanged(),
    onError: () => toast.error("Could not update quantity"),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadStoreImage(file);
      setDraft((d) => ({ ...d, image_url: url }));
      await save.mutateAsync({ image_url: url });
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const items: BundleItem[] = draft.items ?? [];
  const usedProductIds = new Set(items.map((i) => i.product_id));
  const availableProducts = allProducts.filter((p) => !usedProductIds.has(p.id));
  const regularTotal = bundleRegularTotal(draft);

  return (
    <div className="surface-panel grid gap-4 p-4 md:grid-cols-[180px_1fr]">
      <div className="space-y-2">
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
          {draft.image_url ? (
            <img src={draft.image_url} alt={draft.name} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading..." : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.name}
              maxLength={80}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bundle price (GBP)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Badge (optional)</Label>
            <Input
              value={draft.badge ?? ""}
              maxLength={40}
              placeholder="Bundle deal"
              onChange={(e) => setDraft({ ...draft, badge: e.target.value || null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sort order</Label>
            <Input
              type="number"
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            rows={2}
            maxLength={2000}
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
          />
        </div>

        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <Label>Products in this bundle</Label>
            <span className="text-xs text-muted-foreground">
              Regular price: {formatGBP(regularTotal)}
            </span>
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No products added yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{item.product?.name ?? "Unknown product"}</span>
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    defaultValue={item.quantity}
                    onBlur={(e) => {
                      const quantity = Math.max(Number(e.target.value) || 1, 1);
                      if (quantity !== item.quantity) {
                        setItemQuantity.mutate({ itemId: item.id, quantity });
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove product from bundle"
                    onClick={() => removeItem.mutate(item.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {availableProducts.length > 0 ? (
            <div className="flex gap-2 pt-1">
              <Select value={newProductId} onValueChange={setNewProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add a product..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={!newProductId || addProduct.isPending}
                onClick={() => newProductId && addProduct.mutate(newProductId)}
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.is_visible}
              onCheckedChange={(checked) => setDraft({ ...draft, is_visible: checked })}
              id={`bundle-visible-${bundle.id}`}
            />
            <Label htmlFor={`bundle-visible-${bundle.id}`}>Visible on the store</Label>
          </div>
          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" /> Delete
            </Button>
            <Button
              size="sm"
              disabled={save.isPending}
              onClick={() =>
                save.mutate({
                  name: draft.name,
                  description: draft.description,
                  price: draft.price,
                  badge: draft.badge,
                  sort_order: draft.sort_order,
                  is_visible: draft.is_visible,
                  image_url: draft.image_url,
                })
              }
            >
              <Save className="size-4" /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscountsPanel() {
  const queryClient = useQueryClient();
  const { data: codes, isLoading } = useQuery(discountCodesQuery());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["discount_codes"] });

  const createCode = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("discount_codes").insert({
        code: `CODE${Math.floor(1000 + Math.random() * 9000)}`,
        type: "percent",
        amount: 10,
        is_active: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Discount code created");
      void invalidate();
    },
    onError: () => toast.error("Could not create the code — is it unique?"),
  });

  return (
    <div className="space-y-4">
      <Button onClick={() => createCode.mutate()} disabled={createCode.isPending}>
        <Plus className="size-4" /> New discount code
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading codes...</p>
      ) : (codes ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No discount codes yet. Create one and share it with your community.
        </p>
      ) : (
        <div className="grid gap-4">
          {(codes ?? []).map((code) => (
            <DiscountCodeEditor key={code.id} code={code} onChanged={invalidate} />
          ))}
        </div>
      )}
    </div>
  );
}

function DiscountCodeEditor({
  code,
  onChanged,
}: {
  code: DiscountCode;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<DiscountCode>(code);

  useEffect(() => setDraft(code), [code]);

  const save = useMutation({
    mutationFn: async (patch: Partial<DiscountCode>) => {
      const { error } = await supabase.from("discount_codes").update(patch).eq("id", code.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      onChanged();
    },
    onError: () => toast.error("Could not save changes — codes must be unique"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", code.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Discount code deleted");
      onChanged();
    },
    onError: () => toast.error("Could not delete the code"),
  });

  return (
    <div className="surface-panel space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Code</Label>
          <Input
            value={draft.code}
            maxLength={40}
            onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={draft.type}
            onValueChange={(value) => setDraft({ ...draft, type: value as "percent" | "fixed" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent off</SelectItem>
              <SelectItem value="fixed">Fixed GBP off</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Amount {draft.type === "percent" ? "(%)" : "(GBP)"}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={draft.amount}
            onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Min order total (optional)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={draft.min_order_total ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                min_order_total: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Max uses (optional)</Label>
          <Input
            type="number"
            min="0"
            value={draft.max_uses ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                max_uses: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Used so far</Label>
          <p className="pt-2 text-sm text-muted-foreground">{draft.used_count}</p>
        </div>
        <div className="space-y-1.5">
          <Label>Expires (optional)</Label>
          <Input
            type="datetime-local"
            value={draft.expires_at ? draft.expires_at.slice(0, 16) : ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                expires_at: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={draft.is_active}
            onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
            id={`code-active-${code.id}`}
          />
          <Label htmlFor={`code-active-${code.id}`}>Active</Label>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                code: draft.code.trim().toUpperCase(),
                type: draft.type,
                amount: draft.amount,
                min_order_total: draft.min_order_total,
                max_uses: draft.max_uses,
                is_active: draft.is_active,
                expires_at: draft.expires_at,
              })
            }
          >
            <Save className="size-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}
