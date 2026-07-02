# OralDiagnostic - Contexto de implementacion Supabase Fase 18

Fecha: 2026-07-02

Proyecto Supabase: `OralDiagnostic`

Project ref: `lsicnvutjvemohcxiwjk`

## Resumen

Se documento la Fase 18 del documento `docs/backend_supabase_por_fases.md`: uso posterior con MCP.

Objetivo:

- Dejar una guia para continuar el proyecto usando MCP sin perder el orden.
- Registrar el orden recomendado de implementacion.
- Guardar una instruccion base reutilizable.
- Marcar criterios de aceptacion del backend MVP con estado actual.

## Subfase 18.1 - Orden recomendado para pedir implementacion

Orden definido por el documento base:

1. Crear proyecto Supabase local.
2. Crear migraciones `0001` a `0007`.
3. Aplicar migraciones y validar SQL.
4. Crear buckets privados.
5. Implementar `_shared`.
6. Implementar `health-check`.
7. Implementar `create-case`.
8. Implementar `submit-questionnaire`.
9. Implementar `request-image-upload`.
10. Implementar `finalize-image-upload`.
11. Implementar `validate-image`.
12. Implementar `run-inference`.
13. Implementar `generate-report`.
14. Implementar `get-case-result`.
15. Implementar `review-case`.
16. Implementar `dashboard-metrics`.
17. Implementar pruebas.
18. Generar tipos para frontend.

## Estado actual frente al orden recomendado

| Paso | Estado |
|---|---|
| Proyecto Supabase remoto | Hecho |
| Migraciones base | Hecho |
| Validacion SQL | Hecho parcialmente |
| Buckets privados | Hecho |
| `_shared` | Hecho |
| `health-check` | Hecho |
| `create-case` | Hecho |
| `submit-questionnaire` | Hecho |
| `request-image-upload` | Hecho |
| `finalize-image-upload` | Hecho |
| `validate-image` | Hecho |
| `run-inference` | Hecho y probado con IA externa |
| `generate-report` | Hecho y probado |
| `get-case-result` | Hecho y probado con observacion de `reason_codes` |
| `review-case` | Hecho, falta prueba con usuario interno real |
| `dashboard-metrics` | Hecho, falta prueba con usuario interno real |
| Pruebas | Hecho parcialmente con flujo completo y negativas publicas |
| Tipos frontend | Pendiente |

## Subfase 18.2 - Instruccion base para MCP

Instruccion recomendada para futuras tareas:

```text
Implementa el backend Supabase del proyecto OralDiagnostic siguiendo estrictamente el documento backend_supabase_por_fases.md.
No inventes nombres de tablas, columnas, enums, estados, rutas de Storage ni Edge Functions.
Todas las tablas deben tener RLS.
Todas las operaciones publicas deben pasar por Edge Functions.
No uses lenguaje diagnostico.
No expongas service_role al frontend.
Todas las respuestas deben usar el formato estandar success/request_id/data/error.
Todos los comentarios del codigo y SQL deben estar en espanol.
```

Instruccion adicional por el estado actual:

```text
Antes de modificar Edge Functions, compara el contrato documentado con la version desplegada en Supabase.
Si hay diferencias, documentalas y pregunta antes de cambiar comportamiento en produccion.
No insertes inferencias ni recomendaciones falsas para simular IA.
Usa el servicio IA externo ya conectado para validar run-inference.
```

## Subfase 18.3 - Criterios de aceptacion del backend MVP

| Criterio | Estado actual |
|---|---|
| Base de datos creada con migraciones | Cumplido |
| Tablas, enums, relaciones, indices y triggers aplicados | Cumplido |
| RLS activo y probado | Cumplido parcialmente |
| Buckets privados creados | Cumplido |
| Edge Functions principales implementadas | Cumplido |
| Crear caso | Cumplido |
| Consentimiento | Cumplido |
| Cuestionario | Cumplido |
| Upload | Cumplido |
| Validacion | Cumplido |
| IA | Cumplido |
| Recomendacion | Cumplido |
| PDF | Cumplido |
| Revision especialista | Implementado, falta prueba con JWT interno |
| Auditoria en acciones criticas | Cumplido |
| Modelo IA versionado | Cumplido |
| Dashboard agregado funcionando | Implementado, falta prueba con JWT interno |
| Tokens temporales funcionando | Cumplido |
| URLs firmadas funcionando | Cumplido |
| Sin acceso anonimo directo a tablas sensibles | Cumplido en pruebas realizadas |
| Sin lenguaje diagnostico | Cumplido en respuestas probadas |
| Tipos listos para frontend | Pendiente |

## Recomendacion para siguientes tareas MCP

Siguiente orden sugerido:

1. Ajustar `get-case-result` para devolver `reason_codes`.
2. Probar `review-case` con usuario especialista/admin real.
3. Probar `dashboard-metrics` con usuario autorizado real.
4. Generar tipos TypeScript para frontend.
5. Crear contrato frontend en un archivo dedicado si se empieza la app web.
6. Revisar anexos antes de refactorizar `_shared` o Edge Functions.

## Que son los anexos

Los anexos del documento `docs/backend_supabase_por_fases.md` son material de referencia al final del documento.

No son fases nuevas del flujo principal. Son ejemplos, politicas y listas de comprobacion que ayudan a mantener consistencia.

Anexos detectados:

| Anexo | Contenido | Necesario revisarlo ahora |
|---|---|---|
| Anexo A | Ejemplo de `_shared/errors.ts` | Si se cambian errores o codigos de respuesta |
| Anexo B | Ejemplo de `_shared/response.ts` | Si se cambia el formato `success/request_id/data/error` |
| Anexo C | Ejemplo de `_shared/supabase-admin.ts` | Si se toca el cliente admin o secrets |
| Anexo D | Politica de datos sensibles | Si se conecta frontend, se usan datos reales o se cambia logging |
| Anexo E | Lista final de archivos backend esperados | Si se hace auditoria de completitud o despliegue final |

## Son necesarios los anexos?

Para documentar Fase 17 y 18:

- No fue necesario modificarlos.
- Si fue util identificar que existen.

Para los proximos pasos:

- Si se va a tocar `_shared`, errores, respuestas o cliente admin, si conviene revisarlos.
- Si se va a conectar frontend real, si conviene revisar especialmente Anexo D.
- Si se va a cerrar el backend como entrega final, si conviene revisar Anexo E.

## Resultado de Fase 18

Fase 18 documentada.

Estado final:

- Hay guia para continuar con MCP.
- Hay criterios de aceptacion con estado actual.
- Quedan identificados pendientes reales sin inventar implementacion.
- Los anexos quedan explicados y marcados segun cuando conviene revisarlos.
