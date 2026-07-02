"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, FileSearch, ListChecks, UsersRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentAccessToken } from "@/features/auth/api";
import { getDashboardMetrics } from "@/features/dashboard/api";
import type { AppError } from "@/lib/http/errors";

import { DashboardCharts } from "./charts";
import { MetricCard } from "./metric-card";

async function loadDashboardMetrics() {
  const token = await getCurrentAccessToken();

  if (!token) {
    throw new Error("Sesion interna no disponible.");
  }

  return getDashboardMetrics(token);
}

export function DashboardView() {
  const metricsQuery = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: loadDashboardMetrics,
  });

  if (metricsQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (metricsQuery.error) {
    const error = metricsQuery.error as AppError;

    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudieron cargar las metricas</AlertTitle>
        <AlertDescription>
          {error.message}
          {error.requestId ? ` Solicitud: ${error.requestId}` : ""}
        </AlertDescription>
      </Alert>
    );
  }

  const metrics = metricsQuery.data;

  if (!metrics) {
    return (
      <Alert>
        <AlertTitle>Sin datos</AlertTitle>
        <AlertDescription>El backend no devolvio metricas para mostrar.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Indicadores agregados para explicar la demo de investigacion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Casos totales"
          value={metrics.total_cases}
          detail="Registros anonimos acumulados"
          icon={UsersRound}
        />
        <MetricCard
          title="Ultimos 30 dias"
          value={metrics.cases_last_30_days}
          detail="Casos creados recientemente"
          icon={ListChecks}
        />
        <MetricCard
          title="Pendientes revision"
          value={metrics.pending_review}
          detail="Listos para especialista/admin"
          icon={FileSearch}
        />
        <MetricCard
          title="Latencia IA"
          value={metrics.average_ai_latency_ms === null ? "N/D" : `${metrics.average_ai_latency_ms} ms`}
          detail="Promedio de inferencias registradas"
          icon={Clock}
        />
      </div>

      <DashboardCharts metrics={metrics} />
    </div>
  );
}
