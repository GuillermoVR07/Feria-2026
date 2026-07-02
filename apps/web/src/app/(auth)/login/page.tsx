import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { buttonVariants } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-background px-5 py-8 text-foreground">
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-md content-center gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Inicio
          </Link>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-semibold">Panel OralDiagnostic</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Acceso reservado para usuarios internos habilitados.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
