import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { Bundle, Product } from "./store-data";
import { effectivePrice } from "./store-data";

export type CartItemType = "product" | "bundle";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: CartItemType;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  add: (product: Product, quantity?: number) => void;
  addBundle: (bundle: Bundle, quantity?: number) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}

const CartContext =
  createContext<CartContextValue | null>(null);

const STORAGE_KEY = "smffa-cart";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UUID_REGEX.test(value)
  );
}

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(
          STORAGE_KEY,
        );

      if (!raw) return;

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        window.localStorage.removeItem(
          STORAGE_KEY,
        );
        return;
      }

      /*
       * Only keep items that use a real Supabase UUID.
       *
       * This automatically removes old cart items such as:
       * "spearmace-core"
       * "bundle-starter-pack"
       */
      const migrated: CartItem[] =
        parsed
          .filter(
            (
              item,
            ): item is Record<
              string,
              unknown
            > =>
              item !== null &&
              typeof item === "object",
          )
          .map((item) => ({
            id: String(item.id ?? ""),
            name: String(
              item.name ?? "",
            ),
            price: Number(
              item.price ?? 0,
            ),
            quantity: Math.max(
              1,
              Math.floor(
                Number(
                  item.quantity ?? 1,
                ),
              ),
            ),
            type:
              item.type ===
                "bundle" ||
              item.type === "product"
                ? item.type
                : "product",
          }))
          .filter(
            (item) =>
              isValidUUID(item.id) &&
              item.name.length > 0 &&
              Number.isFinite(
                item.price,
              ),
          );

      setItems(migrated);

      /*
       * Save the cleaned cart immediately.
       */
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(migrated),
      );
    } catch {
      window.localStorage.removeItem(
        STORAGE_KEY,
      );
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items),
      );
    } catch {
      /* Ignore localStorage errors. */
    }
  }, [items]);

  const add = useCallback(
    (
      product: Product,
      quantity = 1,
    ) => {
      const safeQuantity = Math.max(
        1,
        Math.floor(quantity),
      );

      /*
       * Product.id comes directly from Supabase.
       */
      if (!isValidUUID(product.id)) {
        console.error(
          "[Cart] Invalid product UUID:",
          product.id,
        );

        return;
      }

      setItems((prev) => {
        const existing =
          prev.find(
            (item) =>
              item.id === product.id &&
              item.type ===
                "product",
          );

        if (existing) {
          return prev.map(
            (item) =>
              item.id ===
                product.id &&
              item.type ===
                "product"
                ? {
                    ...item,
                    quantity:
                      item.quantity +
                      safeQuantity,
                  }
                : item,
          );
        }

        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            price:
              effectivePrice(
                product,
              ),
            quantity:
              safeQuantity,
            type: "product",
          },
        ];
      });
    },
    [],
  );

  const addBundle = useCallback(
    (
      bundle: Bundle,
      quantity = 1,
    ) => {
      const safeQuantity = Math.max(
        1,
        Math.floor(quantity),
      );

      if (!isValidUUID(bundle.id)) {
        console.error(
          "[Cart] Invalid bundle UUID:",
          bundle.id,
        );

        return;
      }

      setItems((prev) => {
        const existing =
          prev.find(
            (item) =>
              item.id ===
                bundle.id &&
              item.type ===
                "bundle",
          );

        if (existing) {
          return prev.map(
            (item) =>
              item.id ===
                bundle.id &&
              item.type ===
                "bundle"
                ? {
                    ...item,
                    quantity:
                      item.quantity +
                      safeQuantity,
                  }
                : item,
          );
        }

        return [
          ...prev,
          {
            id: bundle.id,
            name: bundle.name,
            price: Number(
              bundle.price,
            ),
            quantity:
              safeQuantity,
            type: "bundle",
          },
        ];
      });
    },
    [],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.filter(
          (item) =>
            item.id !== id,
        ),
      );
    },
    [],
  );

  const setQuantity = useCallback(
    (
      id: string,
      quantity: number,
    ) => {
      const safeQuantity =
        Math.floor(quantity);

      setItems((prev) =>
        safeQuantity <= 0
          ? prev.filter(
              (item) =>
                item.id !== id,
            )
          : prev.map(
              (item) =>
                item.id === id
                  ? {
                      ...item,
                      quantity:
                        safeQuantity,
                    }
                  : item,
            ),
          );
    },
    [],
  );

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value =
    useMemo<CartContextValue>(() => {
      const count =
        items.reduce(
          (sum, item) =>
            sum + item.quantity,
          0,
        );

      const total =
        items.reduce(
          (sum, item) =>
            sum +
            item.quantity *
              item.price,
          0,
        );

      return {
        items,
        count,
        total,
        add,
        addBundle,
        remove,
        setQuantity,
        clear,
      };
    }, [
      items,
      add,
      addBundle,
      remove,
      setQuantity,
      clear,
    ]);

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx =
    useContext(CartContext);

  if (!ctx) {
    throw new Error(
      "useCart must be used inside CartProvider",
    );
  }

  return ctx;
}
