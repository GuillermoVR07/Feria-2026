# OralDiagnostic - Contexto de implementacion Supabase Fase 10

Fecha: 2026-07-01

Proyecto Supabase: `OralDiagnostic`

## Resumen

Se avanzo con la Fase 10 del documento `docs/backend_supabase_por_fases.md`: motor de recomendacion preventiva.

Decision principal:

- La IA real queda pausada porque el equipo local no puede ejecutar inferencia.
- No se activo ningun modelo IA.
- No se configuro `AI_SERVICE_URL`.
- No se configuro `AI_SERVICE_TOKEN`.
- No se invento inferencia ni resultado IA.
- Se preparo el motor de recomendacion para que funcione cuando `run-inference` pueda recibir una respuesta real del servicio IA.

## Estado remoto verificado por MCP

Proyecto remoto:

```text
OralDiagnostic
project_id: lsicnvutjvemohcxiwjk
```

Validaciones MCP realizadas:

```json
{
  "active_models": 0,
  "total_models": 1
}
```

```json
{
  "recommendations_count": 0
}
```

Reglas activas:

```text
RULE_AI_HIGH
RULE_AI_LOW_MONITORING
RULE_AI_MODERATE
RULE_DURATION_ALERT_SYMPTOMS
RULE_DYSPHAGIA_GROWTH_LUMP
RULE_IMAGE_REJECTED
```

## Archivos locales creados o modificados

Archivo creado:

```text
supabase/functions/_shared/recommendation-engine.ts
```

Archivo modificado:

```text
supabase/functions/run-inference/index.ts
```

Documento creado:

```text
docs/fase_10.md
```

## Implementacion aplicada

### Motor compartido

Se creo `buildPreventiveRecommendation` en `_shared/recommendation-engine.ts`.

Entradas:

- Estado de calidad de imagen.
- Nivel IA.
- Probabilidad IA.
- Dias de evolucion.
- Sintomas del cuestionario.
- Codigos activos en `triage_rules`.

Salidas:

- `suspicion_level`
- `urgency_level`
- `professional_referral`
- `reason_codes`
- `message`

### Reglas implementadas

El motor aplica las reglas documentadas en Fase 10:

1. Imagen rechazada:
   - `IMAGE_QUALITY_REJECTED`
   - urgencia `none`
   - no ejecuta IA.

2. IA alta:
   - `AI_HIGH`
   - urgencia `urgent`
   - derivacion profesional.

3. Disfagia con crecimiento o bulto:
   - `DYSPHAGIA_WITH_GROWTH_OR_LUMP`
   - urgencia `urgent`
   - derivacion profesional.

4. Lesion mayor a 14 dias con senales de alerta:
   - `LESION_OVER_14_DAYS`
   - `ALERT_SYMPTOMS`
   - urgencia `priority`
   - derivacion profesional.

5. IA moderada:
   - `AI_MODERATE`
   - urgencia `priority`
   - derivacion profesional.

6. IA baja:
   - `AI_LOW`
   - urgencia `routine`
   - monitoreo preventivo.

## Integracion con `run-inference`

`run-inference` ahora:

1. Mantiene el bloqueo si no hay modelo IA activo.
2. Mantiene la llamada al futuro servicio IA externo.
3. Cuando exista respuesta IA real:
   - consulta `risk_questionnaires`;
   - consulta reglas activas en `triage_rules`;
   - ejecuta `buildPreventiveRecommendation`;
   - crea `recommendations`;
   - actualiza `cases.final_suspicion_level`;
   - actualiza `cases.final_urgency_level`;
   - actualiza `cases.final_recommendation`;
   - decide si el caso queda en `under_review` o `recommendation_ready`.

## Deploy remoto

Se desplego `run-inference` mediante MCP de Supabase.

Resultado remoto:

```json
{
  "slug": "run-inference",
  "version": 2,
  "status": "ACTIVE",
  "verify_jwt": false
}
```

Motivo de `verify_jwt = false`:

- La funcion ya operaba asi desde fases anteriores.
- El acceso se controla dentro del cuerpo de la funcion por:
  - `case_code + case_token`; o
  - Auth interno.

## Desviaciones o decisiones documentadas

### IA real pausada

La Fase 10 queda preparada, pero la ruta feliz completa sigue bloqueada por falta de IA operativa.

Motivo:

- El equipo local no puede ejecutar TensorFlow/modelos IA.
- No existe servicio IA desplegado.
- No hay `AI_SERVICE_URL`.
- No hay `AI_SERVICE_TOKEN`.
- El modelo registrado permanece inactivo.

### No se creo endpoint nuevo

No se creo una Edge Function nueva para recomendaciones.

Motivo:

- El documento base indica que el motor de recomendacion se ejecuta dentro de `run-inference`.
- Crear una funcion adicional habria ampliado el contrato sin necesidad.

### No se insertaron recomendaciones manuales

No se insertaron filas en `recommendations`.

Motivo:

- Una recomendacion real debe estar asociada al flujo correcto.
- No se debe simular inferencia ni crear resultados falsos.

## Pendientes despues de Fase 10

1. Mantener IA real pendiente hasta tener servicio externo.
2. No activar `ai_models` todavia.
3. Cuando exista servicio IA:
   - configurar `AI_SERVICE_URL`;
   - configurar `AI_SERVICE_TOKEN`;
   - activar modelo solo si la ruta feliz esta probada.
4. Probar `run-inference` completo con:
   - imagen aceptada;
   - cuestionario existente;
   - modelo activo;
   - respuesta IA valida;
   - Grad-CAM si aplica.
5. Verificar que `generate-report` pueda ejecutarse despues de crear `recommendations`.

## Estado final de Fase 10

```text
Fase 10 implementada a nivel de motor y despliegue de Edge Function.
Ruta feliz completa pendiente por dependencia externa de IA.
No se activo modelo IA.
No se genero recomendacion falsa.
No se cambio el esquema de base de datos.
```

## Validacion posterior con Deno

Despues de instalar Deno localmente, se valido:

```text
deno 2.9.0
deno check supabase/functions/run-inference/index.ts
deno check supabase/functions/_shared/recommendation-engine.ts
```

Resultado:

```text
Check OK
```

Nota:

- Durante Fase 11 se desplego una nueva version de `run-inference`.
- Fase 10 quedo validada localmente y su motor sigue siendo usado por la version posterior.
