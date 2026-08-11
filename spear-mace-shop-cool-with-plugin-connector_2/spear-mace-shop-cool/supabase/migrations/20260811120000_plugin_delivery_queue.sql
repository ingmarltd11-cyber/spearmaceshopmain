-- Adds Minecraft plugin delivery: per-product commands, a secret API key the
-- plugin authenticates with, and a queue of commands to run in-game.

ALTER TABLE public.products
  ADD COLUMN delivery_commands text;
COMMENT ON COLUMN public.products.delivery_commands IS
  'One server command per line, run for each purchase. Use {ign} for the buyer''s in-game name.';

-- Single-row table holding the plugin''s secret key. Only admins may read/write it.
CREATE TABLE public.plugin_settings (
  id boolean PRIMARY KEY DEFAULT true,
  api_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  regenerated_at timestamptz,
  last_polled_at timestamptz,
  CONSTRAINT plugin_settings_singleton CHECK (id)
);
GRANT SELECT, INSERT, UPDATE ON public.plugin_settings TO authenticated;
GRANT ALL ON public.plugin_settings TO service_role;
ALTER TABLE public.plugin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view the plugin key" ON public.plugin_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can set the plugin key" ON public.plugin_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can regenerate the plugin key" ON public.plugin_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- One row per command that still has to be run in-game (or has been run).
CREATE TABLE public.delivery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  ign text NOT NULL,
  discord text,
  command text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);
GRANT SELECT ON public.delivery_queue TO authenticated;
GRANT ALL ON public.delivery_queue TO service_role;
ALTER TABLE public.delivery_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view the delivery queue" ON public.delivery_queue FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- When an order flips to "paid", queue every configured command for every
-- item in that order, once per quantity, with {ign} filled in.
CREATE OR REPLACE FUNCTION public.enqueue_delivery_for_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item jsonb;
  prod RECORD;
  cmd text;
  qty integer;
  n integer;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      SELECT id, name, delivery_commands INTO prod
      FROM public.products
      WHERE id = NULLIF(item->>'id','')::uuid;

      IF prod.delivery_commands IS NOT NULL AND length(trim(prod.delivery_commands)) > 0 THEN
        qty := GREATEST(COALESCE((item->>'quantity')::int, 1), 1);
        FOR n IN 1..qty LOOP
          FOR cmd IN SELECT unnest(string_to_array(prod.delivery_commands, E'\n'))
          LOOP
            cmd := trim(both E' \r' from cmd);
            IF length(cmd) > 0 THEN
              INSERT INTO public.delivery_queue (order_id, product_id, product_name, ign, discord, command)
              VALUES (NEW.id, prod.id, prod.name, NEW.ign, NULL, replace(cmd, '{ign}', NEW.ign));
            END IF;
          END LOOP;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_delivery_for_order() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_enqueue_delivery
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enqueue_delivery_for_order();
