import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Login — SpearMaceFFA Store" },
      {
        name: "description",
        content: "Staff login for the SpearMaceFFA store dashboard.",
      },
      {
        property: "og:title",
        content: "Staff Login — SpearMaceFFA Store",
      },
      {
        property: "og:description",
        content: "Staff login for the SpearMaceFFA store dashboard.",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email" })
    .max(255),

  password: z
    .string()
    .min(8, { message: "Invalid email or password" })
    .max(72),
});

const OWNER_EMAIL = "ingmarltd11@gmail.com";

function AuthPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = schema.safeParse({
      email,
      password,
    });

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Check your login details",
      );
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = parsed.data.email.toLowerCase();

      /*
       * Only login is available here.
       *
       * There is intentionally NO signUp() call anywhere in this file.
       */
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: parsed.data.password,
      });

      if (error || !data.user) {
        toast.error("Invalid email or password");
        return;
      }

      /*
       * Never trust the frontend alone for admin permissions.
       * Supabase/database policies must also protect the admin area.
       *
       * The owner email is recognized here only for UI/login flow.
       * It does NOT give somebody admin access by itself.
       */
      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        await supabase.auth.signOut();
        toast.error("Could not verify staff permissions");
        return;
      }

      if (!role) {
        await supabase.auth.signOut();
        toast.error("This account does not have staff access");
        return;
      }

      if (normalizedEmail === OWNER_EMAIL) {
        toast.success("Welcome back, owner");
      } else {
        toast.success("Welcome back, staff");
      }

      await navigate({
        to: "/admin",
        replace: true,
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);

      await supabase.auth.signOut();

      toast.error("Something went wrong while logging in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="surface-panel p-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold">
            Staff login
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with an authorized staff account to manage the store.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email
            </Label>

            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={loading}
              placeholder="staff@example.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password
            </Label>

            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              autoComplete="current-password"
              disabled={loading}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Staff accounts can only be created by an authorized administrator.
        </p>
      </div>
    </div>
  );
}
