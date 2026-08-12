import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/checkout/cancel")({
  head: () => ({
    meta: [
      { title: "Payment cancelled — SpearMaceFFA Store" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CancelPage,
});

function CancelPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="surface-panel p-8">
        <XCircle className="mx-auto size-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Payment cancelled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No money was taken. You can try again from the store whenever you want.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/store">Back to store</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
