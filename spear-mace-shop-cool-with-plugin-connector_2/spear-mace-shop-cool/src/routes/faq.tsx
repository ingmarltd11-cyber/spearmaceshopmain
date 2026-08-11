import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { settingsQuery } from "@/lib/store-data";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Rank FAQ & Terms — SpearMaceFFA Store" },
      {
        name: "description",
        content:
          "Rank FAQ and purchase terms for the SpearMaceFFA store: refunds, transfers, punishments and buyer responsibilities.",
      },
      { property: "og:title", content: "Rank FAQ & Terms — SpearMaceFFA Store" },
      {
        property: "og:description",
        content: "Read the SpearMaceFFA rank purchase terms before you buy.",
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { data: settings } = useQuery(settingsQuery());

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-extrabold">Rank FAQ</h1>
      <p className="mt-2 text-muted-foreground">
        By purchasing anything from this store you agree to the terms below.
      </p>
      <div className="surface-panel mt-8 whitespace-pre-line p-6 text-sm leading-relaxed text-foreground/90">
        {settings?.faq_text || "The terms will appear here once they are added in the dashboard."}
      </div>
    </div>
  );
}
