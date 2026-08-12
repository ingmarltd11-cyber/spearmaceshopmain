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
  Shield,
  UserPlus,
  Users,
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

import type {
  Bundle,
  BundleItem,
  DiscountCode,
  Product,
  SiteSettings,
} from "@/lib/store-data";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      {
        title: "Admin Dashboard — SpearMaceFFA Store",
      },
      {
        name: "description",
        content:
          "Manage products, bundles, discount codes, orders, staff and store settings.",
      },
      {
        property: "og:title",
        content: "Admin Dashboard — SpearMaceFFA Store",
      },
      {
        property: "og:description",
        content:
          "Manage products, bundles, discount codes, orders, staff and store settings.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: AdminPage,
});

const OWNER_EMAIL = "ingmarltd11@gmail.com";

/* =========================================================
   ADMIN CHECK
   ========================================================= */

function useCurrentAdmin() {
  return useQuery({
    queryKey: ["current-admin"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: role, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error || !role) {
        return null;
      }

      return {
        id: user.id,
        email: user.email?.toLowerCase() ?? "",
        isOwner: user.email?.toLowerCase() === OWNER_EMAIL,
      };
    },
  });
}

/* =========================================================
   MAIN ADMIN PAGE
   ========================================================= */

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: currentAdmin,
    isLoading: roleLoading,
  } = useCurrentAdmin();

  const signOut = async () => {
    await queryClient.cancelQueries();

    queryClient.clear();

    await supabase.auth.signOut();

    await navigate({
      to: "/auth",
      replace: true,
    });
  };

  if (roleLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="surface-panel p-6">
          <p className="text-sm text-muted-foreground">
            Checking staff access...
          </p>
        </div>
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="surface-panel p-6 text-center">
          <Shield className="mx-auto size-10 text-muted-foreground" />

          <h1 className="mt-4 font-display text-xl font-bold">
            No staff access
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            This account is not authorized to access the staff dashboard.
          </p>

          <Button
            className="mt-5"
            variant="outline"
            onClick={signOut}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-extrabold">
              Admin dashboard
            </h1>

            {currentAdmin.isOwner ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold">
                Owner
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                Staff
              </span>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Everything on the store can be managed from here.
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Signed in as {currentAdmin.email}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={signOut}
        >
          Sign out
        </Button>
      </div>

      <Tabs
        defaultValue="products"
        className="mt-8"
      >
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="products">
            Products
          </TabsTrigger>

          <TabsTrigger value="bundles">
            Bundles
          </TabsTrigger>

          <TabsTrigger value="discounts">
            Discounts
          </TabsTrigger>

          <TabsTrigger value="settings">
            Site settings
          </TabsTrigger>

          <TabsTrigger value="orders">
            Orders
          </TabsTrigger>

          <TabsTrigger value="plugin">
            Plugin
          </TabsTrigger>

          {currentAdmin.isOwner ? (
            <TabsTrigger value="staff">
              Staff
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent
          value="products"
          className="mt-6"
        >
          <ProductsPanel />
        </TabsContent>

        <TabsContent
          value="bundles"
          className="mt-6"
        >
          <BundlesPanel />
        </TabsContent>

        <TabsContent
          value="discounts"
          className="mt-6"
        >
          <DiscountsPanel />
        </TabsContent>

        <TabsContent
          value="settings"
          className="mt-6"
        >
          <SettingsPanel />
        </TabsContent>

        <TabsContent
          value="orders"
          className="mt-6"
        >
          <OrdersPanel />
        </TabsContent>

        <TabsContent
          value="plugin"
          className="mt-6"
        >
          <PluginPanel />
        </TabsContent>

        {currentAdmin.isOwner ? (
          <TabsContent
            value="staff"
            className="mt-6"
          >
            <StaffPanel />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

/* =========================================================
   PRODUCTS
   ========================================================= */

function ProductsPanel() {
  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
  } = useQuery(productsQuery(true));

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["products"],
    });

  const createProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .insert({
          name: "New package",
          category: "keys",
          price: 0,
          is_visible: false,
        });

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Package created");
      void invalidate();
    },

    onError: () => {
      toast.error("Could not create the package");
    },
  });

  return (
    <div className="space-y-4">
      <Button
        onClick={() => createProduct.mutate()}
        disabled={createProduct.isPending}
      >
        {createProduct.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}

        New package
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading packages...
        </p>
      ) : (
        <div className="grid gap-4">
          {(products ?? []).map((product) => (
            <ProductEditor
              key={product.id}
              product={product}
              onChanged={invalidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductEditor({
  product,
  onChanged,
}: {
  product: Product;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<Product>(product);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft(product);
  }, [product]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Product>) => {
      const { error } = await supabase
        .from("products")
        .update(patch)
        .eq("id", product.id);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Saved");
      onChanged();
    },

    onError: () => {
      toast.error("Could not save changes");
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Package deleted");
      onChanged();
    },

    onError: () => {
      toast.error("Could not delete the package");
    },
  });

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      const url = await uploadStoreImage(file);

      setDraft((d) => ({
        ...d,
        image_url: url,
      }));

      await save.mutateAsync({
        image_url: url,
      });
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
            <img
              src={draft.image_url}
              alt={draft.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}

          {uploading ? "Uploading..." : "Upload image"}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                void handleUpload(file);
              }
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
              onChange={(e) =>
                setDraft({
                  ...draft,
                  name: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>

            <Select
              value={draft.category}
              onValueChange={(value) =>
                setDraft({
                  ...draft,
                  category: value as Product["category"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem
                    key={category.id}
                    value={category.id}
                  >
                    {category.label}
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
              onChange={(e) =>
                setDraft({
                  ...draft,
                  price: Number(e.target.value),
                })
              }
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
                  sale_price:
                    e.target.value === ""
                      ? null
                      : Number(e.target.value),
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Badge (optional)</Label>

            <Input
              value={draft.badge ?? ""}
              maxLength={40}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  badge: e.target.value || null,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>Sort order</Label>

            <Input
              type="number"
              value={draft.sort_order}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sort_order: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description / perks</Label>

          <Textarea
            rows={3}
            maxLength={2000}
            value={draft.description ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                description: e.target.value || null,
              })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Delivery commands (one per line)
          </Label>

          <Textarea
            rows={3}
            maxLength={2000}
            placeholder={
              "lp user {ign} parent add vip\ncrates give {ign} legendary 1"
            }
            value={draft.delivery_commands ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                delivery_commands: e.target.value || null,
              })
            }
          />

          <p className="text-xs text-muted-foreground">
            Use <code>{"{ign}"}</code> for the buyer's
            Minecraft username.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.is_visible}
              onCheckedChange={(checked) =>
                setDraft({
                  ...draft,
                  is_visible: checked,
                })
              }
              id={`visible-${product.id}`}
            />

            <Label htmlFor={`visible-${product.id}`}>
              Visible on the store
            </Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" />
              Delete
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
                  delivery_commands:
                    draft.delivery_commands,
                })
              }
            >
              <Save className="size-4" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SITE SETTINGS
   ========================================================= */

const SETTING_FIELDS: {
  key: keyof SiteSettings;
  label: string;
  multiline?: boolean;
}[] = [
  {
    key: "store_name",
    label: "Store name",
  },
  {
    key: "server_ip",
    label: "Minecraft server IP",
  },
  {
    key: "discord_url",
    label: "Discord invite link",
  },
  {
    key: "home_heading",
    label: "Home page heading",
  },
  {
    key: "home_text",
    label: "Home page text",
    multiline: true,
  },
  {
    key: "faq_text",
    label: "Rank FAQ / terms",
    multiline: true,
  },
];

function SettingsPanel() {
  const queryClient = useQueryClient();

  const { data } = useQuery(settingsQuery());

  const [draft, setDraft] =
    useState<SiteSettings>(DEFAULT_SETTINGS);

  const [uploading, setUploading] =
    useState(false);

  useEffect(() => {
    if (data) {
      setDraft(data);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async (next: SiteSettings) => {
      const rows = Object.entries(next).map(
        ([key, value]) => ({
          key,
          value: String(value ?? ""),
        }),
      );

      const { error } = await supabase
        .from("site_settings")
        .upsert(rows, {
          onConflict: "key",
        });

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Settings saved");

      void queryClient.invalidateQueries({
        queryKey: ["site_settings"],
      });
    },

    onError: () => {
      toast.error("Could not save settings");
    },
  });

  const handleHero = async (file: File) => {
    setUploading(true);

    try {
      const url = await uploadStoreImage(file);

      const next = {
        ...draft,
        hero_image_url: url,
      };

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
        <div
          key={field.key}
          className="space-y-1.5"
        >
          <Label htmlFor={field.key}>
            {field.label}
          </Label>

          {field.multiline ? (
            <Textarea
              id={field.key}
              rows={
                field.key === "faq_text"
                  ? 16
                  : 4
              }
              value={draft[field.key] ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  [field.key]: e.target.value,
                })
              }
            />
          ) : (
            <Input
              id={field.key}
              value={draft[field.key] ?? ""}
              maxLength={255}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  [field.key]: e.target.value,
                })
              }
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
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}

          {uploading
            ? "Uploading..."
            : "Upload hero image"}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                void handleHero(file);
              }
            }}
          />
        </label>
      </div>

      <Button
        onClick={() => save.mutate(draft)}
        disabled={save.isPending}
      >
        <Save className="size-4" />
        Save settings
      </Button>
    </div>
  );
}

/* =========================================================
   PLUGIN
   ========================================================= */

function randomApiKey() {
  const bytes = new Uint8Array(24);

  crypto.getRandomValues(bytes);

  const hex = Array.from(
    bytes,
    (b) =>
      b.toString(16).padStart(2, "0"),
  ).join("");

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

  const [reveal, setReveal] =
    useState(false);

  const {
    data: pluginSettings,
    isLoading: keyLoading,
  } = useQuery({
    queryKey: ["plugin_settings"],

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from("plugin_settings")
          .select(
            "api_key, last_polled_at",
          )
          .eq("id", true)
          .maybeSingle();

      if (error) throw error;

      return data as {
        api_key: string;
        last_polled_at:
          | string
          | null;
      } | null;
    },
  });

  const {
    data: queue,
    isLoading: queueLoading,
  } = useQuery({
    queryKey: ["delivery_queue"],

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from("delivery_queue")
          .select(
            "id, ign, product_name, command, status, created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(50);

      if (error) throw error;

      return (data ?? []) as QueueRow[];
    },

    refetchInterval: 15000,
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const key = randomApiKey();

      const { error } =
        await supabase
          .from("plugin_settings")
          .upsert(
            {
              id: true,
              api_key: key,
              regenerated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "id",
            },
          );

      if (error) throw error;

      return key;
    },

    onSuccess: () => {
      toast.success(
        "New API key generated.",
      );

      setReveal(true);

      void queryClient.invalidateQueries(
        {
          queryKey: ["plugin_settings"],
        },
      );
    },

    onError: () => {
      toast.error(
        "Could not generate a key",
      );
    },
  });

  const storeUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "";

  const apiKey =
    pluginSettings?.api_key ?? null;

  const maskedKey = apiKey
    ? apiKey.slice(0, 8) +
      "•".repeat(
        Math.max(
          apiKey.length - 8,
          8,
        ),
      )
    : null;

  const config = `# config.yml for the store plugin
store-url: "${storeUrl}"
api-key: "${apiKey ?? "<generate a key first>"}"
poll-seconds: 10`;

  const copy = async (
    text: string,
    label: string,
  ) => {
    try {
      await navigator.clipboard.writeText(
        text,
      );

      toast.success(
        `${label} copied`,
      );
    } catch {
      toast.error(
        "Could not copy — copy it manually",
      );
    }
  };

  const pending = (queue ?? []).filter(
    (q) => q.status === "pending",
  );

  return (
    <div className="space-y-6">
      <div className="surface-panel space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-bold">
            Connect your Minecraft plugin
          </h2>

          <p className="text-sm text-muted-foreground">
            Your Minecraft plugin can poll
            the delivery queue and execute
            commands automatically.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>
            Secret API key
          </Label>

          {keyLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading...
            </p>
          ) : apiKey ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                {reveal
                  ? apiKey
                  : maskedKey}
              </code>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setReveal(
                    (r) => !r,
                  )
                }
              >
                {reveal ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}

                {reveal
                  ? "Hide"
                  : "Show"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copy(
                    apiKey,
                    "API key",
                  )
                }
              >
                <Copy className="size-4" />
                Copy
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  regenerate.mutate()
                }
                disabled={
                  regenerate.isPending
                }
              >
                <RefreshCw className="size-4" />
                Regenerate
              </Button>
            </div>
          ) : (
            <Button
              onClick={() =>
                regenerate.mutate()
              }
              disabled={
                regenerate.isPending
              }
            >
              <Plus className="size-4" />
              Generate a key
            </Button>
          )}
        </div>

        {apiKey ? (
          <div className="space-y-1.5">
            <Label>
              Plugin config to paste
            </Label>

            <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-xs">
              {config}
            </pre>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copy(
                  config,
                  "Config",
                )
              }
            >
              <Copy className="size-4" />
              Copy config
            </Button>
          </div>
        ) : null}
      </div>

      <div className="surface-panel space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            Delivery queue
          </h2>

          <span className="text-xs text-muted-foreground">
            {pending.length} pending
          </span>
        </div>

        {queueLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading...
          </p>
        ) : (queue ?? []).length ===
          0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing queued yet.
          </p>
        ) : (
          <div className="space-y-2">
            {(queue ?? []).map(
              (row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border p-2.5 text-sm"
                >
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.status ===
                      "pending"
                        ? "bg-amber-500/15 text-amber-600"
                        : row.status ===
                            "delivered"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-red-500/15 text-red-600"
                    }`}
                  >
                    {row.status}
                  </span>

                  <span className="font-display font-semibold">
                    {row.ign}
                  </span>

                  <span className="text-muted-foreground">
                    {row.product_name}
                  </span>

                  <code className="ml-auto truncate text-xs text-muted-foreground">
                    {row.command}
                  </code>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   ORDERS
   ========================================================= */

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

  const {
    data: orders,
    isLoading,
  } = useQuery({
    queryKey: ["orders"],

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from("orders")
          .select("*")
          .order("created_at", {
            ascending: false,
          });

      if (error) throw error;

      return (data ?? []) as OrderRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      const { error } =
        await supabase
          .from("orders")
          .update({ status })
          .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success(
        "Order updated",
      );

      void queryClient.invalidateQueries(
        {
          queryKey: ["orders"],
        },
      );
    },

    onError: () => {
      toast.error(
        "Could not update the order",
      );
    },
  });

  const rows = useMemo(
    () => orders ?? [],
    [orders],
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading orders...
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No orders yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((order) => {
        const items = Array.isArray(
          order.items,
        )
          ? (order.items as {
              name: string;
              quantity: number;
            }[])
          : [];

        return (
          <div
            key={order.id}
            className="surface-panel flex flex-wrap items-center gap-4 p-4 text-sm"
          >
            <div className="min-w-40">
              <p className="font-display font-semibold">
                {order.ign}
              </p>

              <p className="text-muted-foreground">
                {new Date(
                  order.created_at,
                ).toLocaleString(
                  "en-GB",
                )}
              </p>

              {order.email ? (
                <p className="text-xs text-muted-foreground">
                  {order.email}
                </p>
              ) : null}
            </div>

            <div className="min-w-48 flex-1 text-muted-foreground">
              {items.map(
                (item, index) => (
                  <span key={index}>
                    {item.name} x
                    {item.quantity}
                    {index <
                    items.length - 1
                      ? ", "
                      : ""}
                  </span>
                ),
              )}
            </div>

            <span className="font-semibold tabular-nums">
              {formatGBP(
                Number(
                  order.total,
                ),
              )}
            </span>

            <Select
              value={order.status}
              onValueChange={(
                status,
              ) =>
                setStatus.mutate({
                  id: order.id,
                  status,
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="pending">
                  Pending
                </SelectItem>

                <SelectItem value="paid">
                  Paid
                </SelectItem>

                <SelectItem value="delivered">
                  Delivered
                </SelectItem>

                <SelectItem value="cancelled">
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   BUNDLES
   ========================================================= */

function BundlesPanel() {
  const queryClient =
    useQueryClient();

  const {
    data: bundles,
    isLoading,
  } = useQuery(
    bundlesQuery(true),
  );

  const {
    data: products,
  } = useQuery(
    productsQuery(true),
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["bundles"],
    });

  const createBundle =
    useMutation({
      mutationFn:
        async () => {
          const {
            error,
          } = await supabase
            .from("bundles")
            .insert({
              name:
                "New bundle",
              price: 0,
              is_visible:
                false,
            });

          if (error)
            throw error;
        },

      onSuccess: () => {
        toast.success(
          "Bundle created",
        );

        void invalidate();
      },

      onError: () => {
        toast.error(
          "Could not create the bundle",
        );
      },
    });

  return (
    <div className="space-y-4">
      <Button
        onClick={() =>
          createBundle.mutate()
        }
        disabled={
          createBundle.isPending
        }
      >
        <Plus className="size-4" />
        New bundle
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading bundles...
        </p>
      ) : (
        <div className="grid gap-4">
          {(bundles ?? []).map(
            (bundle) => (
              <BundleEditor
                key={bundle.id}
                bundle={bundle}
                allProducts={
                  products ?? []
                }
                onChanged={
                  invalidate
                }
              />
            ),
          )}
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
  const [draft, setDraft] =
    useState<Bundle>(bundle);

  const [uploading, setUploading] =
    useState(false);

  const [newProductId, setNewProductId] =
    useState("");

  useEffect(() => {
    setDraft(bundle);
  }, [bundle]);

  const save = useMutation({
    mutationFn: async (
      patch: Partial<Bundle>,
    ) => {
      const { error } =
        await supabase
          .from("bundles")
          .update(patch)
          .eq("id", bundle.id);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Saved");
      onChanged();
    },

    onError: () => {
      toast.error(
        "Could not save changes",
      );
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } =
        await supabase
          .from("bundles")
          .delete()
          .eq("id", bundle.id);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success(
        "Bundle deleted",
      );
      onChanged();
    },

    onError: () => {
      toast.error(
        "Could not delete the bundle",
      );
    },
  });

  const addProduct =
    useMutation({
      mutationFn:
        async (
          productId: string,
        ) => {
          const {
            error,
          } = await supabase
            .from(
              "bundle_items",
            )
            .insert({
              bundle_id:
                bundle.id,
              product_id:
                productId,
              quantity: 1,
            });

          if (error)
            throw error;
        },

      onSuccess: () => {
        setNewProductId(
          "",
        );
        onChanged();
      },

      onError: () => {
        toast.error(
          "Could not add that product",
        );
      },
    });

  const removeItem =
    useMutation({
      mutationFn:
        async (
          itemId: string,
        ) => {
          const {
            error,
          } = await supabase
            .from(
              "bundle_items",
            )
            .delete()
            .eq(
              "id",
              itemId,
            );

          if (error)
            throw error;
        },

      onSuccess: () =>
        onChanged(),

      onError: () =>
        toast.error(
          "Could not remove that item",
        ),
    });

  const setItemQuantity =
    useMutation({
      mutationFn:
        async ({
          itemId,
          quantity,
        }: {
          itemId: string;
          quantity: number;
        }) => {
          const {
            error,
          } = await supabase
            .from(
              "bundle_items",
            )
            .update({
              quantity,
            })
            .eq(
              "id",
              itemId,
            );

          if (error)
            throw error;
        },

      onSuccess: () =>
        onChanged(),

      onError: () =>
        toast.error(
          "Could not update quantity",
        ),
    });

  const handleUpload =
    async (file: File) => {
      setUploading(true);

      try {
        const url =
          await uploadStoreImage(
            file,
          );

        setDraft((d) => ({
          ...d,
          image_url: url,
        }));

        await save.mutateAsync({
          image_url: url,
        });
      } catch {
        toast.error(
          "Image upload failed",
        );
      } finally {
        setUploading(false);
      }
    };

  const items: BundleItem[] =
    draft.items ?? [];

  const usedProductIds =
    new Set(
      items.map(
        (item) =>
          item.product_id,
      ),
    );

  const availableProducts =
    allProducts.filter(
      (product) =>
        !usedProductIds.has(
          product.id,
        ),
    );

  const regularTotal =
    bundleRegularTotal(draft);

  return (
    <div className="surface-panel grid gap-4 p-4 md:grid-cols-[180px_1fr]">
      <div className="space-y-2">
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
          {draft.image_url ? (
            <img
              src={draft.image_url}
              alt={draft.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}

          {uploading
            ? "Uploading..."
            : "Upload image"}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file =
                e.target.files?.[0];

              if (file) {
                void handleUpload(
                  file,
                );
              }
            }}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Bundle name
            </Label>

            <Input
              value={draft.name}
              maxLength={80}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  name: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Bundle price (GBP)
            </Label>

            <Input
              type="number"
              step="0.01"
              min="0"
              value={draft.price}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  price: Number(
                    e.target.value,
                  ),
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Badge
            </Label>

            <Input
              value={draft.badge ?? ""}
              maxLength={40}
              placeholder="Bundle deal"
              onChange={(e) =>
                setDraft({
                  ...draft,
                  badge:
                    e.target
                      .value ||
                    null,
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Sort order
            </Label>

            <Input
              type="number"
              value={
                draft.sort_order
              }
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sort_order:
                    Number(
                      e.target
                        .value,
                    ),
                })
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>
            Description
          </Label>

          <Textarea
            rows={2}
            maxLength={2000}
            value={
              draft.description ??
              ""
            }
            onChange={(e) =>
              setDraft({
                ...draft,
                description:
                  e.target
                    .value ||
                  null,
              })
            }
          />
        </div>

        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <Label>
              Products in this bundle
            </Label>

            <span className="text-xs text-muted-foreground">
              Regular price:{" "}
              {formatGBP(
                regularTotal,
              )}
            </span>
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No products added yet.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="flex-1 truncate">
                      {item.product
                        ?.name ??
                        "Unknown product"}
                    </span>

                    <Input
                      type="number"
                      min="1"
                      className="w-20"
                      defaultValue={
                        item.quantity
                      }
                      onBlur={(e) => {
                        const quantity =
                          Math.max(
                            Number(
                              e.target
                                .value,
                            ) ||
                              1,
                            1,
                          );

                        if (
                          quantity !==
                          item.quantity
                        ) {
                          setItemQuantity.mutate(
                            {
                              itemId:
                                item.id,
                              quantity,
                            },
                          );
                        }
                      }}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove product from bundle"
                      onClick={() =>
                        removeItem.mutate(
                          item.id,
                        )
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ),
              )}
            </div>
          )}

          {availableProducts.length >
          0 ? (
            <div className="flex gap-2 pt-1">
              <Select
                value={
                  newProductId
                }
                onValueChange={
                  setNewProductId
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add a product..." />
                </SelectTrigger>

                <SelectContent>
                  {availableProducts.map(
                    (product) => (
                      <SelectItem
                        key={
                          product.id
                        }
                        value={
                          product.id
                        }
                      >
                        {product.name}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                disabled={
                  !newProductId ||
                  addProduct.isPending
                }
                onClick={() => {
                  if (
                    newProductId
                  ) {
                    addProduct.mutate(
                      newProductId,
                    );
                  }
                }}
              >
                <Plus className="size-4" />
                Add
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={
                draft.is_visible
              }
              onCheckedChange={(
                checked,
              ) =>
                setDraft({
                  ...draft,
                  is_visible:
                    checked,
                })
              }
              id={`bundle-visible-${bundle.id}`}
            />

            <Label
              htmlFor={`bundle-visible-${bundle.id}`}
            >
              Visible on the store
            </Label>
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                remove.mutate()
              }
              disabled={
                remove.isPending
              }
            >
              <Trash2 className="size-4" />
              Delete
            </Button>

            <Button
              size="sm"
              disabled={
                save.isPending
              }
              onClick={() =>
                save.mutate({
                  name: draft.name,
                  description:
                    draft.description,
                  price: draft.price,
                  badge:
                    draft.badge,
                  sort_order:
                    draft.sort_order,
                  is_visible:
                    draft.is_visible,
                  image_url:
                    draft.image_url,
                })
              }
            >
              <Save className="size-4" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DISCOUNTS
   ========================================================= */

function DiscountsPanel() {
  const queryClient =
    useQueryClient();

  const {
    data: codes,
    isLoading,
  } = useQuery(
    discountCodesQuery(),
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: [
        "discount_codes",
      ],
    });

  const createCode =
    useMutation({
      mutationFn:
        async () => {
          const randomCode =
            `CODE${Math.floor(
              100000 +
                Math.random() *
                  900000,
            )}`;

          const {
            error,
          } = await supabase
            .from(
              "discount_codes",
            )
            .insert({
              code: randomCode,
              type: "percent",
              amount: 10,
              is_active:
                false,
            });

          if (error)
            throw error;
        },

      onSuccess: () => {
        toast.success(
          "Discount code created",
        );

        void invalidate();
      },

      onError: () => {
        toast.error(
          "Could not create the code — the generated code may already exist.",
        );
      },
    });

  return (
    <div className="space-y-4">
      <Button
        onClick={() =>
          createCode.mutate()
        }
        disabled={
          createCode.isPending
        }
      >
        {createCode.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}

        New discount code
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading codes...
        </p>
      ) : (
        <div className="grid gap-4">
          {(codes ?? []).map(
            (code) => (
              <DiscountCodeEditor
                key={code.id}
                code={code}
                onChanged={
                  invalidate
                }
              />
            ),
          )}
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
  const [draft, setDraft] =
    useState<DiscountCode>(code);

  useEffect(() => {
    setDraft(code);
  }, [code]);

  const save = useMutation({
    mutationFn: async (
      patch: Partial<DiscountCode>,
    ) => {
      const { error } =
        await supabase
          .from("discount_codes")
          .update(patch)
          .eq(
            "id",
            code.id,
          );

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Saved");
      onChanged();
    },

    onError: () => {
      toast.error(
        "Could not save changes — codes must be unique.",
      );
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } =
        await supabase
          .from(
            "discount_codes",
          )
          .delete()
          .eq(
            "id",
            code.id,
          );

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success(
        "Discount code deleted",
      );

      onChanged();
    },

    onError: () => {
      toast.error(
        "Could not delete the code",
      );
    },
  });

  return (
    <div className="surface-panel space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Code</Label>

          <Input
            value={draft.code}
            maxLength={40}
            onChange={(e) =>
              setDraft({
                ...draft,
                code: e.target.value.toUpperCase(),
              })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>Type</Label>

          <Select
            value={draft.type}
            onValueChange={(value) =>
              setDraft({
                ...draft,
                type:
                  value as
                    | "percent"
                    | "fixed",
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="percent">
                Percent off
              </SelectItem>

              <SelectItem value="fixed">
                Fixed GBP off
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            Amount{" "}
            {draft.type ===
            "percent"
              ? "(%)"
              : "(GBP)"}
          </Label>

          <Input
            type="number"
            step="0.01"
            min="0"
            value={draft.amount}
            onChange={(e) =>
              setDraft({
                ...draft,
                amount:
                  Number(
                    e.target
                      .value,
                  ),
              })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Min order total
          </Label>

          <Input
            type="number"
            step="0.01"
            min="0"
            value={
              draft.min_order_total ??
              ""
            }
            onChange={(e) =>
              setDraft({
                ...draft,
                min_order_total:
                  e.target
                    .value ===
                  ""
                    ? null
                    : Number(
                        e.target
                          .value,
                      ),
              })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Max uses
          </Label>

          <Input
            type="number"
            min="0"
            value={
              draft.max_uses ??
              ""
            }
            onChange={(e) =>
              setDraft({
                ...draft,
                max_uses:
                  e.target
                    .value ===
                  ""
                    ? null
                    : Number(
                        e.target
                          .value,
                      ),
              })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Used so far
          </Label>

          <p className="pt-2 text-sm text-muted-foreground">
            {draft.used_count}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>
            Expires
          </Label>

          <Input
            type="datetime-local"
            value={
              draft.expires_at
                ? draft.expires_at.slice(
                    0,
                    16,
                  )
                : ""
            }
            onChange={(e) =>
              setDraft({
                ...draft,
                expires_at:
                  e.target
                    .value
                    ? new Date(
                        e.target
                          .value,
                      ).toISOString()
                    : null,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={
              draft.is_active
            }
            onCheckedChange={(
              checked,
            ) =>
              setDraft({
                ...draft,
                is_active:
                  checked,
              })
            }
            id={`code-active-${code.id}`}
          />

          <Label
            htmlFor={`code-active-${code.id}`}
          >
            Active
          </Label>
        </div>

        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              remove.mutate()
            }
            disabled={
              remove.isPending
            }
          >
            <Trash2 className="size-4" />
            Delete
          </Button>

          <Button
            size="sm"
            disabled={
              save.isPending
            }
            onClick={() =>
              save.mutate({
                code: draft.code
                  .trim()
                  .toUpperCase(),
                type: draft.type,
                amount:
                  draft.amount,
                min_order_total:
                  draft.min_order_total,
                max_uses:
                  draft.max_uses,
                is_active:
                  draft.is_active,
                expires_at:
                  draft.expires_at,
              })
            }
          >
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STAFF MANAGEMENT
   ========================================================= */

interface StaffRow {
  user_id: string;
  email: string;
  role: string;
  created_at?: string;
}

function StaffPanel() {
  const queryClient =
    useQueryClient();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const {
    data: staff,
    isLoading,
  } = useQuery({
    queryKey: ["staff-list"],

    queryFn: async () => {
      /*
       * The frontend only reads the user_roles
       * table. Email addresses should be exposed
       * through a safe server-side endpoint/view
       * in production.
       *
       * This assumes your user_roles table has:
       * user_id, role, created_at
       */
      const {
        data,
        error,
      } = await supabase
        .from("user_roles")
        .select(
          "user_id, role, created_at",
        )
        .eq("role", "admin")
        .order(
          "created_at",
          {
            ascending: true,
          },
        );

      if (error) throw error;

      return (data ??
        []) as StaffRow[];
    },
  });

  const createStaff = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error(
        "Enter a staff email",
      );
      return;
    }

    if (
      normalizedEmail ===
      OWNER_EMAIL
    ) {
      toast.error(
        "The owner account is already the main account.",
      );
      return;
    }

    if (password.length < 8) {
      toast.error(
        "Password must be at least 8 characters",
      );
      return;
    }

    setCreating(true);

    try {
      /*
       * IMPORTANT:
       * Do NOT use supabase.auth.signUp()
       * here from the browser.
       *
       * Creating staff accounts requires the
       * Supabase service-role key and therefore
       * belongs on a server endpoint.
       *
       * The endpoint below should be implemented
       * as /api/admin/staff/create.
       */
      const response =
        await fetch(
          "/api/admin/staff/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              email:
                normalizedEmail,
              password,
            }),
          },
        );

      const result =
        await response
          .json()
          .catch(
            () => null,
          );

      if (!response.ok) {
        throw new Error(
          result?.error ??
            "Could not create staff account",
        );
      }

      toast.success(
        "Staff account created",
      );

      setEmail("");
      setPassword("");

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "staff-list",
          ],
        },
      );
    } catch (error) {
      console.error(
        "[Staff] Create failed:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create staff account",
      );
    } finally {
      setCreating(false);
    }
  };

  const removeStaff =
    useMutation({
      mutationFn:
        async (
          userId: string,
        ) => {
          /*
           * Account deletion also needs
           * server-side Supabase Admin API.
           */
          const response =
            await fetch(
              "/api/admin/staff/delete",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  userId,
                }),
              },
            );

          const result =
            await response
              .json()
              .catch(
                () => null,
              );

          if (!response.ok) {
            throw new Error(
              result?.error ??
                "Could not remove staff account",
            );
          }
        },

      onSuccess: () => {
        toast.success(
          "Staff account removed",
        );

        void queryClient.invalidateQueries(
          {
            queryKey: [
              "staff-list",
            ],
          },
        );
      },

      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not remove staff account",
        );
      },
    });

  return (
    <div className="space-y-6">
      <div className="surface-panel p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Users className="size-5" />
          </div>

          <div>
            <h2 className="font-display text-lg font-bold">
              Staff management
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Only the owner can add or remove
              staff members.
            </p>
          </div>
        </div>

        <form
          onSubmit={createStaff}
          className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
        >
          <div className="space-y-1.5">
            <Label>
              Staff email
            </Label>

            <Input
              type="email"
              value={email}
              placeholder="staff@example.com"
              disabled={creating}
              onChange={(e) =>
                setEmail(
                  e.target.value,
                )
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Temporary password
            </Label>

            <div className="flex gap-2">
              <Input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                placeholder="Minimum 8 characters"
                disabled={creating}
                onChange={(e) =>
                  setPassword(
                    e.target.value,
                  )
                }
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setShowPassword(
                    (value) =>
                      !value,
                  )
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              disabled={creating}
              className="w-full md:w-auto"
            >
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}

              Add staff
            </Button>
          </div>
        </form>
      </div>

      <div className="surface-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">
              Staff accounts
            </h2>

            <p className="text-sm text-muted-foreground">
              Authorized accounts with admin access.
            </p>
          </div>

          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
            {(staff ?? []).length} account
            {(staff ?? []).length ===
            1
              ? ""
              : "s"}
          </span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading staff...
          </p>
        ) : (staff ?? []).length ===
          0 ? (
          <p className="text-sm text-muted-foreground">
            No staff accounts found.
          </p>
        ) : (
          <div className="space-y-2">
            {(staff ?? []).map(
              (member) => {
                const isOwner =
                  member.user_id ===
                  staff?.[0]
                    ?.user_id &&
                  member.email?.toLowerCase() ===
                    OWNER_EMAIL;

                return (
                  <div
                    key={
                      member.user_id
                    }
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="grid size-9 place-items-center rounded-full bg-muted">
                      <Shield className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {member.email ||
                          "Staff account"}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Admin access
                      </p>
                    </div>

                    {isOwner ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold">
                        Owner
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={
                          removeStaff.isPending
                        }
                        onClick={() => {
                          const confirmed =
                            window.confirm(
                              "Remove this staff member? They will no longer be able to log in to the dashboard.",
                            );

                          if (
                            confirmed
                          ) {
                            removeStaff.mutate(
                              member.user_id,
                            );
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}

        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">
            Owner protection:
          </strong>{" "}
          {OWNER_EMAIL} is the permanent owner
          account and must never be deleted or
          replaced through the dashboard.
        </div>
      </div>
    </div>
  );
}
