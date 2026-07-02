import { callEdgeFunction } from "@/lib/supabase/edge-functions";

import { dashboardMetricsResponseSchema } from "./schemas";

export async function getDashboardMetrics(accessToken: string) {
  const result = await callEdgeFunction("dashboard-metrics", {
    method: "GET",
    bearerToken: accessToken,
    responseSchema: dashboardMetricsResponseSchema,
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.data.data;
}
