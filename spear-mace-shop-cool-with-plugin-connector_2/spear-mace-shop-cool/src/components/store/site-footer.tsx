import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { settingsQuery } from "@/lib/store-data";

export function SiteFooter() {
  const { data: settings } = useQuery(settingsQuery());

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {settings?.store_name || "SpearMaceFFA Store"} · Not
          affiliated with Mojang or Microsoft.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/faq" className="transition-colors hover:text-foreground">
            Rank FAQ
          </Link>
          {settings?.discord_url ? (
            <a
              href={settings.discord_url}
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-foreground"
            >
              Discord
            </a>
          ) : null}
          <Link to="/auth" className="transition-colors hover:text-foreground">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
}
