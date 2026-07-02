import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 text-slate-950">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col justify-center gap-6">
        <div className="flex size-12 items-center justify-center rounded-full bg-teal-100 text-teal-800">
          <WifiOff className="size-6" aria-hidden="true" />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-teal-800">
            Sin conexion
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-normal sm:text-4xl">
            OralDiagnostic necesita internet para continuar el flujo.
          </h1>
          <p className="text-base leading-7 text-slate-700">
            Puedes volver al inicio cuando recuperes conexion. Por seguridad, la
            app no guarda tokens de caso, URLs firmadas ni resultados medicos en
            cache offline.
          </p>
        </div>

        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
          <AlertTitle>Demo preventiva</AlertTitle>
          <AlertDescription>
            Este sistema no emite diagnostico medico. El resultado es una
            orientacion preventiva de triaje visual y debe ser revisado por un
            profesional de salud.
          </AlertDescription>
        </Alert>

        <div>
          <Link
            href="/"
            className={cn(
              buttonVariants(),
              "bg-teal-700 text-white hover:bg-teal-800",
            )}
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
