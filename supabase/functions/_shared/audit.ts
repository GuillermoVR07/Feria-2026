// Registro técnico y auditoría funcional.
// No almacenar IP cruda ni user-agent crudo en metadata.

type SupabaseAdminClient = ReturnType<typeof import('./supabase-admin.ts').createSupabaseAdminClient>

export type ApiRequestLogInput = {
  requestId: string
  functionName: string
  method: string
  statusCode?: number
  actorId?: string | null
  caseId?: string | null
  durationMs?: number
  errorCode?: string | null
  metadata?: Record<string, unknown>
}

export type AuditLogInput = {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  caseId?: string | null
  ipHash?: string | null
  userAgentHash?: string | null
  metadata?: Record<string, unknown>
}

export async function logApiRequest(adminClient: SupabaseAdminClient, input: ApiRequestLogInput): Promise<void> {
  const { error } = await adminClient
    .from('api_request_logs')
    .insert({
      request_id: input.requestId,
      function_name: input.functionName,
      method: input.method,
      status_code: input.statusCode ?? null,
      actor_id: input.actorId ?? null,
      case_id: input.caseId ?? null,
      duration_ms: input.durationMs ?? null,
      error_code: input.errorCode ?? null,
      metadata: input.metadata ?? {}
    })

  if (error) {
    console.error('No se pudo registrar api_request_logs.', error)
  }
}

export async function logAuditEvent(adminClient: SupabaseAdminClient, input: AuditLogInput): Promise<void> {
  const { error } = await adminClient
    .from('audit_logs')
    .insert({
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      case_id: input.caseId ?? null,
      ip_hash: input.ipHash ?? null,
      user_agent_hash: input.userAgentHash ?? null,
      metadata: input.metadata ?? {}
    })

  if (error) {
    console.error('No se pudo registrar audit_logs.', error)
  }
}
