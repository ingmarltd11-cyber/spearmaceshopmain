import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [
      { title: "Payment successful — SpearMaceFFA Store" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="surface-panel p-8">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
        <h1 className="mt-4 font-display text-2xl font-bold">Payment successful</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks! Your order is being processed. Delivery is sent to the IGN you entered
          once payment is confirmed.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/store">Back to store</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
