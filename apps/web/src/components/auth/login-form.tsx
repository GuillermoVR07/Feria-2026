"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInInternalUser } from "@/features/auth/api";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";

export function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: signInInternalUser,
    onSuccess: () => {
      router.replace("/panel/dashboard");
    },
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <Card>
        <CardHeader>
          <CardTitle>Acceso interno</CardTitle>
          <CardDescription>
            Ingresa con una cuenta habilitada en Supabase Auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudo iniciar sesion</AlertTitle>
              <AlertDescription>{mutation.error.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="email">Correo</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className="pl-9"
                placeholder="usuario@ejemplo.com"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Contrasena</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className="pl-9"
                placeholder="********"
                {...form.register("password")}
              />
            </div>
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={mutation.isPending} size="lg">
        {mutation.isPending ? "Ingresando..." : "Ingresar al panel"}
      </Button>
    </form>
  );
}
