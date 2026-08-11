CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'keys',
  price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2),
  description text,
  badge text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view visible products" ON public.products FOR SELECT TO anon, authenticated USING (is_visible = true);
CREATE POLICY "Admins can view all products" ON public.products FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete settings" ON public.site_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ign text NOT NULL,
  email text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can place an order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (key, value) VALUES
 ('server_ip','play.spearmaceffa.net'),
 ('discord_url','https://discord.gg/'),
 ('store_name','SpearMaceFFA Store'),
 ('home_heading','Welcome to the official SpearMaceFFA store'),
 ('home_text','Welcome to the official SpearMaceFFA store owner by txn_chxdeo and iamlazyy.'),
 ('hero_image_url',''),
 ('faq_text','By purchasing any rank from our Minecraft server store, you agree to the following terms and conditions:

1. All Purchases Are Final
- Once a rank has been purchased and delivered, you are not eligible for a refund, chargeback, or money-back request under any circumstances.

2. No Rank Switching or Transfers
- Purchased ranks cannot be changed, swapped, transferred, or exchanged for another rank after the purchase has been completed.

3. Purchasing a rank such as TxN rank will give you a discounted price on higher ranks, such as the legendary kit going from 70 GBP to 45 GBP.

4. Responsibility Before Purchase
- It is the buyer''s responsibility to carefully review the rank, perks, and pricing before completing the purchase.

5. Bans / mutes / server rules
- Purchasing a rank does not exempt any player from server rules. If a player is punished or banned for breaking server rules, no refunds will be issued.

6. We withhold the right to remove purchased goods
- We actively have the right to remove purchased goods with any reason we deem fit.

7. Agreement to Terms
- By completing a purchase on our store, you acknowledge that you have read, understood, and agreed to this policy.

WE WITHHOLD THE RIGHT TO EDIT THESE AT ANY POINT IN TIME AND IT IS ON THE PURCHASING INDIVIDUALS TO ACKNOWLEDGE THIS.

* Purchasing a rank, or any package, does NOT make you immune to bans, punishments, ss, or moderation actions. All players are still required to follow the server rules and can be banned if those rules are violated. Enjoy your rank.');

INSERT INTO public.products (name, category, price, sale_price, badge, sort_order) VALUES
 ('Legendary Keyall x1','keys',10.50,NULL,NULL,1),
 ('Koth Keyall x1','keys',14.00,NULL,NULL,2),
 ('Vip Keyall x1','keys',2.00,NULL,NULL,3),
 ('Spear Keyall x1','keys',5.00,NULL,NULL,4),
 ('TxN Keyall x1','keys',6.10,NULL,NULL,5),
 ('Nemesis','ranks',97.65,NULL,'Discounted heavily',1),
 ('Legendary','ranks',70.00,NULL,NULL,2),
 ('TxN Rank','ranks',25.00,NULL,NULL,3),
 ('Spear','ranks',20.00,NULL,NULL,4),
 ('Vip+','ranks',12.99,NULL,NULL,5),
 ('Turtle','ranks',10.00,NULL,NULL,6),
 ('Vip','ranks',8.50,NULL,NULL,7),
 ('Mini Spear','ranks',3.00,NULL,NULL,8),
 ('Meow Rank','1gbp',1.00,NULL,'£1 rank',1);