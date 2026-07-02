import type { z } from "zod";

import type { dashboardMetricsResponseSchema } from "./schemas";

export type DashboardMetrics = z.infer<typeof dashboardMetricsResponseSchema>["data"];
