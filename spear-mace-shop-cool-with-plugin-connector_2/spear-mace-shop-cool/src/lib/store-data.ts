import { supabase } from "@/integrations/supabase/client";

export type ProductCategory = "keys" | "ranks" | "1gbp" | "sale";

export const CATEGORIES: { id: ProductCategory; label: string; blurb: string }[] = [
  { id: "keys", label: "Keys", blurb: "Crate keys for instant loot" },
  { id: "ranks", label: "Ranks", blurb: "Permanent perks and kits" },
  { id: "1gbp", label: "£1 Rank", blurb: "The cheapest way in" },
  { id: "sale", label: "Sale", blurb: "Limited time discounts" },
];

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sale_price: number | null;
  description: string | null;
  badge: string | null;
  image_url: string | null;
  sort_order: number;
  is_visible: boolean;
  delivery_commands: string | null;
}

export interface SiteSettings {
  server_ip: string;
  discord_url: string;
  store_name: string;
  home_heading: string;
  home_text: string;
  hero_image_url: string;
  faq_text: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  server_ip: "",
  discord_url: "",
  store_name: "SpearMaceFFA Store",
  home_heading: "Welcome to the official SpearMaceFFA store",
  home_text: "",
  hero_image_url: "",
  faq_text: "",
};

export function formatGBP(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

export function effectivePrice(product: Product) {
  return product.sale_price != null && product.sale_price < product.price
    ? product.sale_price
    : product.price;
}

export async function fetchProducts(includeHidden = false): Promise<Product[]> {
  let query = supabase.from("products").select("*").order("sort_order", { ascending: true });
  if (!includeHidden) query = query.eq("is_visible", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function fetchSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw error;
  const map = { ...DEFAULT_SETTINGS } as Record<string, string>;
  for (const row of data ?? []) {
    if (row.key) map[row.key] = row.value ?? "";
  }
  return map as unknown as SiteSettings;
}

export const productsQuery = (includeHidden = false) => ({
  queryKey: ["products", includeHidden],
  queryFn: () => fetchProducts(includeHidden),
});

export const settingsQuery = () => ({
  queryKey: ["site_settings"],
  queryFn: fetchSettings,
});

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadStoreImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("store-images").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from("store-images")
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data) throw signError ?? new Error("Could not create image link");
  return data.signedUrl;
}
