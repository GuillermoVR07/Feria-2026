"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardMetrics } from "@/features/dashboard/types";

const suspicionColors: Record<string, string> = {
  low: "#0f766e",
  moderate: "#d97706",
  high: "#dc2626",
};

const qualityColors: Record<string, string> = {
  accepted: "#16a34a",
  rejected: "#e11d48",
};

const suspicionLabels: Record<string, string> = {
  low: "Baja",
  moderate: "Moderada",
  high: "Alta",
};

const qualityLabels: Record<string, string> = {
  accepted: "Aceptadas",
  rejected: "Rechazadas",
};

export function DashboardCharts({ metrics }: { metrics: DashboardMetrics }) {
  const suspicionData = Object.entries(metrics.by_suspicion_level).map(([key, value]) => ({
    name: suspicionLabels[key] ?? key,
    value,
    color: suspicionColors[key] ?? "#64748b",
  }));

  const qualityData = Object.entries(metrics.image_quality).map(([key, value]) => ({
    name: qualityLabels[key] ?? key,
    value,
    color: qualityColors[key] ?? "#64748b",
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Niveles de sospecha</CardTitle>
          <CardDescription>Distribucion agregada de resultados finales.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={suspicionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {suspicionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calidad de imagen</CardTitle>
          <CardDescription>Validaciones tecnicas aceptadas y rechazadas.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={qualityData}
                dataKey="value"
                nameKey="name"
                outerRadius={88}
                label
              >
                {qualityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
