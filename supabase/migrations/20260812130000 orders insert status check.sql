-- Anyone (anon/authenticated) could previously insert an order row with
-- ANY status, including 'paid', straight from the browser, since the
-- INSERT policy was WITH CHECK (true). This tightens it so a newly
-- created order must always start as 'pending' — only the trusted
-- server-side checkout route (using the service role key) or an admin
-- can ever mark an order 'paid'.

DROP POLICY IF EXISTS "Anyone can place an order" ON public.orders;

CREATE POLICY "Anyone can place a pending order"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');
