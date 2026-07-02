"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, ClipboardCheck, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { signOutInternalUser } from "@/features/auth/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/panel/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/panel/revision",
    label: "Revision",
    icon: ClipboardCheck,
  },
];

async function getInternalSession() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || "No se pudo leer la sesion.");
  }

  return data.session;
}

export function PanelShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const sessionQuery = useQuery({
    queryKey: ["internal-session"],
    queryFn: getInternalSession,
    retry: false,
  });

  const signOutMutation = useMutation({
    mutationFn: signOutInternalUser,
    onSuccess: () => router.replace("/login"),
  });

  if (sessionQuery.isLoading) {
    return (
      <main className="min-h-dvh bg-background p-5 text-foreground">
        <div className="mx-auto grid w-full max-w-6xl gap-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </main>
    );
  }

  if (!sessionQuery.data) {
    return (
      <main className="min-h-dvh bg-background px-5 py-8 text-foreground">
        <section className="mx-auto grid w-full max-w-xl gap-4">
          <Alert variant="destructive">
            <ShieldCheck className="size-4" aria-hidden="true" />
            <AlertTitle>Sesion requerida</AlertTitle>
            <AlertDescription>
              El panel interno requiere una cuenta autenticada y autorizada por el backend.
            </AlertDescription>
          </Alert>
          <Link href="/login" className={buttonVariants()}>
            Ir al login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium">Panel interno</p>
              <p className="text-sm text-muted-foreground">
                {sessionQuery.data.user.email ?? "Usuario autenticado"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Sesion activa</Badge>
            <Button
              variant="outline"
              onClick={() => signOutMutation.mutate()}
              disabled={signOutMutation.isPending}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Salir
            </Button>
          </div>
        </header>

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-[220px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: active ? "default" : "ghost" }),
                    "justify-start",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
