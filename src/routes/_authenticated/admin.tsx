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
        content: "Manage your store.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: AdminPage,
});

/* -------------------------------------------------------------------------- */
/* ADMIN CHECK                                                               */
/* -------------------------------------------------------------------------- */

function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return false;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Admin check failed:", error);
        return false;
      }

      return Boolean(data);
    },
  });
}

/* -------------------------------------------------------------------------- */
/* MAIN ADMIN PAGE                                                            */
/* -------------------------------------------------------------------------- */

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: isAdmin,
    isLoading: roleLoading,
  } = useIsAdmin();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();

    await supabase.auth.signOut();

    navigate({
      to: "/auth",
      replace: true,
    });
  };

  if (roleLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="surface-panel p-8 text-center">
          <Loader2 className="mx-auto size-6 animate-spin" />
          <p className="mt-3 text-sm text-muted-foreground">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="surface-panel p-6 text-center">
          <h1 className="font-display text-xl font-bold">
            No admin access
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            This account does not currently have administrator access.
          </p>

          <div className="mt-5 flex justify-center gap-2">
            <Button
              onClick={async () => {
                const { data, error } = await supabase.rpc(
                  "claim_first_admin",
                );

                if (error || !data) {
                  toast.error(
                    "An admin already exists — ask an existing admin to give you access.",
                  );
                  return;
                }

                toast.success("You are now an admin.");

                void queryClient.invalidateQueries({
                  queryKey: ["is-admin"],
                });
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Admin Dashboard
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage the entire store without touching the code.
          </p>
        </div>

        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
      </div>

      <Tabs defaultValue="products" className="mt-8">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="products">
            Products
          </TabsTrigger>

          <TabsTrigger value="bundles">
            Bundles
          </TabsTrigger>

          <TabsTrigger value="discounts">
            Discounts
          </TabsTrigger>

          <TabsTrigger value="orders">
            Orders
          </TabsTrigger>

          <TabsTrigger value="settings">
            Site
          </TabsTrigger>

          <TabsTrigger value="plugin">
            Minecraft
          </TabsTrigger>
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

        <TabsContent value="orders" className="mt-6">
          <OrdersPanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsPanel />
        </TabsContent>

        <TabsContent value="plugin" className="mt-6">
          <PluginPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PRODUCTS                                                                   */
/* -------------------------------------------------------------------------- */

function ProductsPanel() {
  const queryClient = useQueryClient();

  const {
    data: products,
    isLoading,
  } = useQuery(productsQuery(true));

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["products"],
    });
  };

  const createProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .insert({
          name: "New package",
          category: "keys",
          price: 0,
          sale_price: null,
          description: "",
          badge: null,
          sort_order: 0,
          is_visible: false,
          image_url: null,
          delivery_commands: null,
        });

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Package created.");
      invalidate();
    },

    onError: (error) => {
      console.error(error);
      toast.error("Could not create the package.");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            Products
          </h2>

          <p className="text-sm text-muted-foreground">
            Add and manage everything customers can buy.
          </p>
        </div>

        <Button
          onClick={() => createProduct.mutate()}
          disabled={createProduct.isPending}
        >
          {createProduct.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}

          New product
        </Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : (products ?? []).length === 0 ? (
        <Empty text="No products yet." />
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

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Product saved.");
      onChanged();
    },

    onError: (error) => {
      console.error(error);
      toast.error("Could not save the product.");
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Product deleted.");
      onChanged();
    },

    onError: () => {
      toast.error("Could not delete the product.");
    },
  });

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      const url = await uploadStoreImage(file);

      setDraft((current) => ({
        ...current,
        image_url: url,
      }));

      await save.mutateAsync({
        image_url: url,
      });
    } catch (error) {
      console.error(error);
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="surface-panel overflow-hidden p-4">
      <div className="grid gap-5 md:grid-cols-[190px_1fr]">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
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

          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm transition hover:bg-accent">
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
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void handleUpload(file);
                }

                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Product name">
              <Input
                value={draft.name}
                maxLength={80}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    name: event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Category">
              <Select
                value={draft.category}
                onValueChange={(value) =>
                  setDraft({
                    ...draft,
                    category: value,
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
            </Field>

            <Field label="Price (GBP)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    price: Number(event.target.value),
                  })
                }
              />
            </Field>

            <Field label="Sale price">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave empty for no sale"
                value={draft.sale_price ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    sale_price:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </Field>

            <Field label="Badge">
              <Input
                maxLength={40}
                placeholder="BESTSELLER"
                value={draft.badge ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    badge: event.target.value || null,
                  })
                }
              />
            </Field>

            <Field label="Sort order">
              <Input
                type="number"
                value={draft.sort_order}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    sort_order: Number(event.target.value),
                  })
                }
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={4}
              maxLength={2000}
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  description: event.target.value || null,
                })
              }
            />
          </Field>

          <Field label="Minecraft delivery commands">
            <Textarea
              rows={5}
              maxLength={5000}
              placeholder={
                "lp user {ign} parent add vip\ncrates give {ign} legendary 1"
              }
              value={draft.delivery_commands ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  delivery_commands:
                    event.target.value || null,
                })
              }
            />

            <p className="mt-1 text-xs text-muted-foreground">
              One command per line. Use{" "}
              <code>{"{ign}"}</code> for the customer's Minecraft
              username.
            </p>
          </Field>

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id={`product-visible-${product.id}`}
                checked={draft.is_visible}
                onCheckedChange={(checked) =>
                  setDraft({
                    ...draft,
                    is_visible: checked,
                  })
                }
              />

              <Label htmlFor={`product-visible-${product.id}`}>
                Visible on store
              </Label>
            </div>

            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${product.name}"?`,
                    )
                  ) {
                    remove.mutate();
                  }
                }}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>

              <Button
                size="sm"
                disabled={save.isPending}
                onClick={() =>
                  save.mutate({
                    name: draft.name.trim(),
                    category: draft.category,
                    price: Math.max(0, draft.price),
                    sale_price:
                      draft.sale_price == null
                        ? null
                        : Math.max(0, draft.sale_price),
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
                {save.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}

                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BUNDLES                                                                    */
/* -------------------------------------------------------------------------- */

function BundlesPanel() {
  const queryClient = useQueryClient();

  const {
    data: bundles,
    isLoading,
  } = useQuery(bundlesQuery(true));

  const {
    data: products,
  } = useQuery(productsQuery(true));

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["bundles"],
    });
  };

  const createBundle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bundles")
        .insert({
          name: "New bundle",
          description: "",
          price: 0,
          badge: null,
          image_url: null,
          sort_order: 0,
          is_visible: false,
        });

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Bundle created.");
      invalidate();
    },

    onError: (error) => {
      console.error(error);
      toast.error("Could not create bundle.");
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            Bundles
          </h2>

          <p className="text-sm text-muted-foreground">
            Combine products into special deals.
          </p>
        </div>

        <Button
          onClick={() => createBundle.mutate()}
          disabled={createBundle.isPending}
        >
          <Plus className="size-4" />
          New bundle
        </Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : (bundles ?? []).length === 0 ? (
        <Empty text="No bundles yet." />
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
  const [newProductId, setNewProductId] = useState("");

  useEffect(() => {
    setDraft(bundle);
  }, [bundle]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Bundle>) => {
      const { error } = await supabase
        .from("bundles")
        .update(patch)
        .eq("id", bundle.id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Bundle saved.");
      onChanged();
    },

    onError: () => {
      toast.error("Could not save bundle.");
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bundles")
        .delete()
        .eq("id", bundle.id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Bundle deleted.");
      onChanged();
    },

    onError: () => {
      toast.error("Could not delete bundle.");
    },
  });

  const addProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("bundle_items")
        .insert({
          bundle_id: bundle.id,
          product_id: productId,
          quantity: 1,
        });

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      setNewProductId("");
      onChanged();
    },

    onError: () => {
      toast.error("Could not add product.");
    },
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("bundle_items")
        .delete()
        .eq("id", itemId);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      onChanged();
    },

    onError: () => {
      toast.error("Could not remove product.");
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({
      id,
      quantity,
    }: {
      id: string;
      quantity: number;
    }) => {
      const { error } = await supabase
        .from("bundle_items")
        .update({
          quantity,
        })
        .eq("id", id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      onChanged();
    },

    onError: () => {
      toast.error("Could not update quantity.");
    },
  });

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      const url = await uploadStoreImage(file);

      setDraft((current) => ({
        ...current,
        image_url: url,
      }));

      await save.mutateAsync({
        image_url: url,
      });
    } catch (error) {
      console.error(error);
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const items: BundleItem[] = draft.items ?? [];

  const usedProductIds = new Set(
    items.map((item) => item.product_id),
  );

  const availableProducts = allProducts.filter(
    (product) => !usedProductIds.has(product.id),
  );

  const regularTotal = bundleRegularTotal(draft);

  return (
    <div className="surface-panel p-4">
      <div className="grid gap-5 md:grid-cols-[190px_1fr]">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted">
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

          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-accent">
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
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void handleUpload(file);
                }

                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bundle name">
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    name: event.target.value,
                  })
                }
              />
            </Field>

            <Field label="Bundle price (GBP)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    price: Number(event.target.value),
                  })
                }
              />
            </Field>

            <Field label="Badge">
              <Input
                placeholder="Bundle deal"
                value={draft.badge ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    badge: event.target.value || null,
                  })
                }
              />
            </Field>

            <Field label="Sort order">
              <Input
                type="number"
                value={draft.sort_order}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    sort_order: Number(event.target.value),
                  })
                }
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={3}
              value={draft.description ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  description: event.target.value || null,
                })
              }
            />
          </Field>

          <div className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  Products in bundle
                </p>

                <p className="text-xs text-muted-foreground">
                  Regular value: {formatGBP(regularTotal)}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products added.
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {item.product?.name ?? "Unknown product"}
                    </span>

                    <Input
                      className="w-20"
                      type="number"
                      min="1"
                      defaultValue={item.quantity}
                      onBlur={(event) => {
                        const quantity = Math.max(
                          1,
                          Number(event.target.value) || 1,
                        );

                        if (quantity !== item.quantity) {
                          updateQuantity.mutate({
                            id: item.id,
                            quantity,
                          });
                        }
                      }}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        removeItem.mutate(item.id)
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {availableProducts.length > 0 && (
              <div className="mt-3 flex gap-2">
                <Select
                  value={newProductId}
                  onValueChange={setNewProductId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Add product..." />
                  </SelectTrigger>

                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem
                        key={product.id}
                        value={product.id}
                      >
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  disabled={
                    !newProductId ||
                    addProduct.isPending
                  }
                  onClick={() =>
                    addProduct.mutate(newProductId)
                  }
                >
                  <Plus className="size-4" />
                  Add
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id={`bundle-visible-${bundle.id}`}
                checked={draft.is_visible}
                onCheckedChange={(checked) =>
                  setDraft({
                    ...draft,
                    is_visible: checked,
                  })
                }
              />

              <Label htmlFor={`bundle-visible-${bundle.id}`}>
                Visible on store
              </Label>
            </div>

            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete "${bundle.name}"?`,
                    )
                  ) {
                    remove.mutate();
                  }
                }}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>

              <Button
                size="sm"
                disabled={save.isPending}
                onClick={() =>
                  save.mutate({
                    name: draft.name.trim(),
                    description: draft.description,
                    price: Math.max(0, draft.price),
                    badge: draft.badge,
                    sort_order: draft.sort_order,
                    is_visible: draft.is_visible,
                    image_url: draft.image_url,
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DISCOUNTS                                                                  */
/* -------------------------------------------------------------------------- */

function generateDiscountCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < 8; i++) {
    result += chars[
      Math.floor(Math.random() * chars.length)
    ];
  }

  return `SPEAR-${result}`;
}

async function createUniqueDiscountCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateDiscountCode();

    const { data, error } = await supabase
      .from("discount_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return code;
    }
  }

  throw new Error(
    "Could not generate a unique discount code.",
  );
}

function DiscountsPanel() {
  const queryClient = useQueryClient();

  const {
    data: codes,
    isLoading,
  } = useQuery(discountCodesQuery());

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["discount_codes"],
    });
  };

  const createCode = useMutation({
    mutationFn: async () => {
      const code = await createUniqueDiscountCode();

      const { error } = await supabase
        .from("discount_codes")
        .insert({
          code,
          type: "percent",
          amount: 10,
          min_order_total: null,
          max_uses: null,
          used_count: 0,
          is_active: false,
          expires_at: null,
        });

      if (error) {
        throw error;
      }

      return code;
    },

    onSuccess: (code) => {
      toast.success(`Discount code ${code} created.`);
      invalidate();
    },

    onError: (error) => {
      console.error(error);
      toast.error(
        "Could not create discount code.",
      );
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            Discount codes
          </h2>

          <p className="text-sm text-muted-foreground">
            Create and manage promotional codes.
          </p>
        </div>

        <Button
          onClick={() => createCode.mutate()}
          disabled={createCode.isPending}
        >
          {createCode.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}

          Create discount code
        </Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : (codes ?? []).length === 0 ? (
        <Empty text="No discount codes yet." />
      ) : (
        <div className="grid gap-4">
          {(codes ?? []).map((code) => (
            <DiscountCodeEditor
              key={code.id}
              code={code}
              onChanged={invalidate}
            />
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
  const [draft, setDraft] =
    useState<DiscountCode>(code);

  useEffect(() => {
    setDraft(code);
  }, [code]);

  const save = useMutation({
    mutationFn: async (
      patch: Partial<DiscountCode>,
    ) => {
      const { error } = await supabase
        .from("discount_codes")
        .update(patch)
        .eq("id", code.id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Discount code saved.");
      onChanged();
    },

    onError: (error) => {
      console.error(error);
      toast.error(
        "Could not save discount code. Codes must be unique.",
      );
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("discount_codes")
        .delete()
        .eq("id", code.id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Discount code deleted.");
      onChanged();
    },

    onError: () => {
      toast.error(
        "Could not delete discount code.",
      );
    },
  });

  return (
    <div className="surface-panel space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Code">
          <Input
            maxLength={40}
            value={draft.code}
            onChange={(event) =>
              setDraft({
                ...draft,
                code: event.target.value
                  .toUpperCase()
                  .replace(/\s+/g, ""),
              })
            }
          />
        </Field>

        <Field label="Discount type">
          <Select
            value={draft.type}
            onValueChange={(value) =>
              setDraft({
                ...draft,
                type: value as
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
                Percentage
              </SelectItem>

              <SelectItem value="fixed">
                Fixed GBP
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label={
            draft.type === "percent"
              ? "Amount (%)"
              : "Amount (GBP)"
          }
        >
          <Input
            type="number"
            min="0"
            step="0.01"
            value={draft.amount}
            onChange={(event) =>
              setDraft({
                ...draft,
                amount: Number(
                  event.target.value,
                ),
              })
            }
          />
        </Field>

        <Field label="Minimum order">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="No minimum"
            value={draft.min_order_total ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                min_order_total:
                  event.target.value === ""
                    ? null
                    : Number(
                        event.target.value,
                      ),
              })
            }
          />
        </Field>

        <Field label="Maximum uses">
          <Input
            type="number"
            min="0"
            placeholder="Unlimited"
            value={draft.max_uses ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                max_uses:
                  event.target.value === ""
                    ? null
                    : Number(
                        event.target.value,
                      ),
              })
            }
          />
        </Field>

        <Field label="Used">
          <div className="flex h-10 items-center rounded-md border border-input px-3 text-sm">
            {draft.used_count}
          </div>
        </Field>

        <Field label="Expires">
          <Input
            type="datetime-local"
            value={
              draft.expires_at
                ? draft.expires_at.slice(0, 16)
                : ""
            }
            onChange={(event) =>
              setDraft({
                ...draft,
                expires_at: event.target.value
                  ? new Date(
                      event.target.value,
                    ).toISOString()
                  : null,
              })
            }
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Switch
            id={`discount-active-${code.id}`}
            checked={draft.is_active}
            onCheckedChange={(checked) =>
              setDraft({
                ...draft,
                is_active: checked,
              })
            }
          />

          <Label htmlFor={`discount-active-${code.id}`}>
            Active
          </Label>
        </div>

        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (
                window.confirm(
                  `Delete discount code "${code.code}"?`,
                )
              ) {
                remove.mutate();
              }
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>

          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                code: draft.code
                  .trim()
                  .toUpperCase()
                  .replace(/\s+/g, ""),
                type: draft.type,
                amount: Math.max(
                  0,
                  draft.amount,
                ),
                min_order_total:
                  draft.min_order_total == null
                    ? null
                    : Math.max(
                        0,
                        draft.min_order_total,
                      ),
                max_uses:
                  draft.max_uses == null
                    ? null
                    : Math.max(
                        0,
                        Math.floor(
                          draft.max_uses,
                        ),
                      ),
                is_active: draft.is_active,
                expires_at: draft.expires_at,
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

/* -------------------------------------------------------------------------- */
/* SITE SETTINGS                                                              */
/* -------------------------------------------------------------------------- */

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
    label: "FAQ / terms",
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
    mutationFn: async (
      next: SiteSettings,
    ) => {
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

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Site settings saved.");

      void queryClient.invalidateQueries({
        queryKey: ["site_settings"],
      });
    },

    onError: () => {
      toast.error("Could not save site settings.");
    },
  });

  const uploadHero = async (file: File) => {
    setUploading(true);

    try {
      const url = await uploadStoreImage(file);

      const next = {
        ...draft,
        hero_image_url: url,
      };

      setDraft(next);

      await save.mutateAsync(next);
    } catch (error) {
      console.error(error);
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">
          Site settings
        </h2>

        <p className="text-sm text-muted-foreground">
          Change the content of the store without editing code.
        </p>
      </div>

      <div className="surface-panel space-y-5 p-5">
        {SETTING_FIELDS.map((field) => (
          <Field
            key={field.key}
            label={field.label}
          >
            {field.multiline ? (
              <Textarea
                rows={
                  field.key === "faq_text"
                    ? 12
                    : 5
                }
                value={
                  draft[field.key] ?? ""
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    [field.key]:
                      event.target.value,
                  })
                }
              />
            ) : (
              <Input
                value={
                  draft[field.key] ?? ""
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    [field.key]:
                      event.target.value,
                  })
                }
              />
            )}
          </Field>
        ))}

        <div className="space-y-2">
          <Label>Hero image</Label>

          {draft.hero_image_url ? (
            <img
              src={draft.hero_image_url}
              alt="Hero preview"
              className="aspect-video w-full max-w-xl rounded-xl border border-border object-cover"
            />
          ) : (
            <div className="grid aspect-video w-full max-w-xl place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              No hero image
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm hover:bg-accent">
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
              disabled={uploading}
              onChange={(event) => {
                const file =
                  event.target.files?.[0];

                if (file) {
                  void uploadHero(file);
                }

                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="border-t border-border pt-4">
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate(draft)}
          >
            {save.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}

            Save site settings
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ORDERS                                                                     */
/* -------------------------------------------------------------------------- */

interface OrderRow {
  id: string;
  ign: string;
  email: string | null;
  total: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
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
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

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
      const patch: {
        status: string;
        paid_at?: string | null;
      } = {
        status,
      };

      if (status === "paid" && !orders?.find((o) => o.id === id)?.paid_at) {
        patch.paid_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(patch)
        .eq("id", id);

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success("Order updated.");

      void queryClient.invalidateQueries({
        queryKey: ["orders"],
      });
    },

    onError: () => {
      toast.error("Could not update order.");
    },
  });

  const rows = useMemo(
    () => orders ?? [],
    [orders],
  );

  if (isLoading) {
    return <Loading />;
  }

  if (rows.length === 0) {
    return <Empty text="No orders yet." />;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total orders"
          value={String(rows.length)}
        />

        <StatCard
          label="Paid"
          value={String(
            rows.filter(
              (order) =>
                order.status === "paid" ||
                order.status === "delivered",
            ).length,
          )}
        />

        <StatCard
          label="Pending"
          value={String(
            rows.filter(
              (order) =>
                order.status === "pending",
            ).length,
          )}
        />
      </div>

      {rows.map((order) => {
        const items = Array.isArray(order.items)
          ? (order.items as {
              name: string;
              quantity: number;
            }[])
          : [];

        return (
          <div
            key={order.id}
            className="surface-panel space-y-4 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-lg font-bold">
                  {order.ign}
                </p>

                <p className="text-xs text-muted-foreground">
                  {new Date(
                    order.created_at,
                  ).toLocaleString("en-GB")}
                </p>

                {order.email && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.email}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="font-display text-lg font-bold">
                  {formatGBP(
                    Number(order.total),
                  )}
                </p>

                <p className="text-xs text-muted-foreground">
                  Order ID: {order.id}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Items
              </p>

              <div className="space-y-1 text-sm">
                {items.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="flex justify-between gap-4"
                  >
                    <span>
                      {item.name}
                    </span>

                    <span className="text-muted-foreground">
                      ×{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="text-xs text-muted-foreground">
                {order.paid_at
                  ? `Paid: ${new Date(
                      order.paid_at,
                    ).toLocaleString("en-GB")}`
                  : "Not marked as paid"}
              </div>

              <Select
                value={order.status}
                onValueChange={(status) =>
                  setStatus.mutate({
                    id: order.id,
                    status,
                  })
                }
              >
                <SelectTrigger className="w-44">
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
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MINECRAFT PLUGIN                                                           */
/* -------------------------------------------------------------------------- */

interface QueueRow {
  id: string;
  ign: string;
  discord: string | null;
  product_name: string;
  command: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
}

function randomApiKey() {
  const bytes = new Uint8Array(24);

  crypto.getRandomValues(bytes);

  const hex = Array.from(
    bytes,
    (byte) =>
      byte.toString(16).padStart(2, "0"),
  ).join("");

  return `smffa_${hex}`;
}

function PluginPanel() {
  const queryClient = useQueryClient();

  const [reveal, setReveal] = useState(false);

  const {
    data: pluginSettings,
    isLoading: keyLoading,
  } = useQuery({
    queryKey: ["plugin_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plugin_settings")
        .select(
          "id, api_key, last_polled_at, regenerated_at",
        )
        .eq("id", true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as
        | {
            id: boolean;
            api_key: string | null;
            last_polled_at: string | null;
            regenerated_at: string | null;
          }
        | null;
    },
  });

  const {
    data: queue,
    isLoading: queueLoading,
  } = useQuery({
    queryKey: ["delivery_queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_queue")
        .select(
          "id, ign, discord, product_name, command, status, created_at, delivered_at",
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (error) {
        throw error;
      }

      return (data ?? []) as QueueRow[];
    },

    refetchInterval: 15000,
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      const apiKey = randomApiKey();

      const { error } = await supabase
        .from("plugin_settings")
        .upsert(
          {
            id: true,
            api_key: apiKey,
            regenerated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "id",
          },
        );

      if (error) {
        throw error;
      }

      return apiKey;
    },

    onSuccess: () => {
      toast.success(
        "New API key generated.",
      );

      setReveal(true);

      void queryClient.invalidateQueries({
        queryKey: ["plugin_settings"],
      });
    },

    onError: () => {
      toast.error(
        "Could not generate API key.",
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
    ? `${apiKey.slice(0, 8)}${"•".repeat(
        Math.max(apiKey.length - 8, 8),
      )}`
    : null;

  const config = `# SpearMaceFFA Store Plugin
store-url: "${storeUrl}"
api-key: "${apiKey ?? "<generate a key first>"}"
poll-seconds: 10`;

  const copy = async (
    text: string,
    label: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text);

      toast.success(
        `${label} copied.`,
      );
    } catch {
      toast.error(
        "Could not copy. Copy it manually.",
      );
    }
  };

  const pending = (queue ?? []).filter(
    (row) => row.status === "pending",
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold">
          Minecraft delivery
        </h2>

        <p className="text-sm text-muted-foreground">
          Connect your Minecraft server and automatically deliver purchased packages.
        </p>
      </div>

      <div className="surface-panel space-y-5 p-5">
        <div>
          <h3 className="font-display text-lg font-bold">
            Plugin connection
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Generate a key and put it in your Minecraft
            plugin configuration.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Secret API key</Label>

          {keyLoading ? (
            <Loading />
          ) : apiKey ? (
            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-full overflow-x-auto rounded-lg border border-border bg-muted px-3 py-2 text-sm">
                {reveal
                  ? apiKey
                  : maskedKey}
              </code>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setReveal(
                    (current) =>
                      !current,
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
                disabled={
                  regenerate.isPending
                }
                onClick={() =>
                  regenerate.mutate()
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
              Generate API key
            </Button>
          )}
        </div>

        {apiKey && (
          <div className="space-y-2">
            <Label>
              Plugin configuration
            </Label>

            <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-xs">
              {config}
            </pre>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                copy(
                  config,
                  "Plugin config",
                )
              }
            >
              <Copy className="size-4" />
              Copy configuration
            </Button>
          </div>
        )}

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
          <p className="font-semibold">
            Keep the API key secret
          </p>

          <p className="mt-1 text-muted-foreground">
            Only put this key inside your Minecraft
            server/plugin configuration. Never put it in
            client-side website code.
          </p>
        </div>
      </div>

      <div className="surface-panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">
              Delivery queue
            </h3>

            <p className="text-sm text-muted-foreground">
              Commands waiting to be executed by the Minecraft plugin.
            </p>
          </div>

          <div className="rounded-full border border-border px-3 py-1 text-xs">
            {pending.length} pending
          </div>
        </div>

        {queueLoading ? (
          <Loading />
        ) : (queue ?? []).length === 0 ? (
          <Empty text="Nothing is waiting for delivery." />
        ) : (
          <div className="space-y-2">
            {(queue ?? []).map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      row.status === "pending"
                        ? "bg-amber-500/15 text-amber-600"
                        : row.status ===
                            "delivered"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-red-500/15 text-red-600"
                    }`}
                  >
                    {row.status}
                  </span>

                  <span className="font-semibold">
                    {row.ign}
                  </span>

                  {row.discord && (
                    <span className="text-xs text-muted-foreground">
                      Discord: {row.discord}
                    </span>
                  )}

                  <span className="text-sm text-muted-foreground">
                    {row.product_name}
                  </span>
                </div>

                <code className="mt-2 block overflow-x-auto rounded bg-muted p-2 text-xs">
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

/* -------------------------------------------------------------------------- */
/* SMALL UI HELPERS                                                           */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Loading...
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="surface-panel p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-display text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}
