import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, Loader2, Plus, RefreshCw, Save, Trash2, Upload } from "lucide-react";
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
  formatGBP,
  productsQuery,
  settingsQuery,
  uploadStoreImage,
} from "@/lib/store-data";
import type { Product, SiteSettings } from "@/lib/store-data";

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
          <TabsTrigger value="settings">Site settings</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="plugin">Plugin</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsPanel />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsPanel />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersPanel />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <PaymentsPanel />
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
            <img src={draft.image_url} alt={draft.name} className="
