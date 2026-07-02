import Link from "next/link";
import { Activity, ArrowRight, ShieldCheck, Stethoscope } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MEDICAL_DISCLAIMER } from "@/config/constants";
import { envClient } from "@/config/env.client";

export default function Home() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium">{envClient.NEXT_PUBLIC_APP_NAME}</p>
              <p className="text-xs text-muted-foreground">MVP demo</p>
            </div>
          </div>
          <Badge variant="secondary">{envClient.NEXT_PUBLIC_APP_ENV}</Badge>
        </header>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <Badge className="mb-4" variant="outline">
              Feria de investigacion
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-balance sm:text-5xl">
              Triaje visual preventivo para lesiones orales
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Flujo guiado para crear un caso anonimo, registrar consentimiento,
              cargar una imagen y consultar una orientacion preventiva generada
              desde el backend Supabase.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/casos/nuevo/consentimiento" className={buttonVariants({ size: "lg" })}>
                Iniciar caso
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Acceso interno
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Base tecnica lista</CardTitle>
                <CardDescription>Subfases 0 y 1 preparadas para el MVP.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Configuracion publica validada</p>
                    <p className="text-sm text-muted-foreground">
                      Solo variables NEXT_PUBLIC en el navegador.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="mt-0.5 size-5 text-primary" aria-hidden="true" />
                  <div>
                    <p className="font-medium">Edge Functions centralizadas</p>
                    <p className="text-sm text-muted-foreground">
                      Las llamadas pasan por un helper con timeout y errores normalizados.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <ShieldCheck className="size-4" aria-hidden="true" />
              <AlertTitle>Aviso obligatorio</AlertTitle>
              <AlertDescription>{MEDICAL_DISCLAIMER}</AlertDescription>
            </Alert>
          </div>
        </div>
      </section>
    </main>
  );
}
