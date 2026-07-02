# OralDiagnostic - Contexto de implementacion Supabase Fase 14

Fecha: 2026-07-02

Proyecto Supabase: `OralDiagnostic`

Project ref: `lsicnvutjvemohcxiwjk`

## Resumen

Se ejecuto la Fase 14 del documento `docs/backend_supabase_por_fases.md`: QA tecnico backend.

Objetivo:

- Verificar que el backend remoto en Supabase permita el flujo completo anonimo controlado.
- Confirmar que `run-inference` llama al servicio IA externo de Hugging Face.
- Confirmar que se persisten inferencias, recomendaciones, auditoria, reporte PDF y resultado consultable.
- Ejecutar pruebas negativas sin insertar datos falsos manualmente.

Decision importante:

- No se inventaron inferencias.
- No se insertaron recomendaciones manualmente.
- La prueba uso Edge Functions reales y Storage real.
- La `anon/publishable key` se obtuvo desde el MCP de Supabase y no se guardo en archivos.

## Subfase 14.1 - Pruebas de base de datos

### Restricciones verificadas por SQL

Se verificaron constraints e indices en la base remota:

| Regla | Estado |
|---|---|
| Edad entre 0 y 120 | Verificado con constraint `case_subjects_age_years_check`. |
| Cuestionario unico por caso | Verificado con unique `risk_questionnaires_case_id_key`. |
| Probabilidad IA entre 0 y 1 | Verificado con constraint `ai_inferences_probability_check`. |
| Imagen maximo 10 MB | Verificado con constraint `case_images_size_bytes_check`. |
| Modelo unico por `name + version` | Verificado con unique `ai_models_name_version_key`. |
| Solo un modelo activo por nombre | Verificado con indice parcial `uq_ai_models_one_active_per_name`. |
| Ruta Storage unica por bucket | Verificado con unique `case_images_bucket_name_object_path_key`. |

### Pruebas negativas ejecutadas via Edge Functions

| Prueba | Resultado |
|---|---|
| Crear caso con consentimiento falso | HTTP 400. |
| Crear caso con edad 130 | HTTP 400. |
| Crear cuestionario duplicado | HTTP 400 despues del primer guardado correcto. |
| Solicitar imagen mayor a 10 MB | HTTP 400. |

### Pruebas no ejecutadas destructivamente

No se hicieron inserts manuales destructivos para forzar errores de modelos o inferencias.

Motivo:

- Las restricciones ya fueron verificadas por catalogo SQL.
- Insertar registros invalidos directamente no aporta al flujo funcional.
- Se evito generar datos basura en produccion.

## Subfase 14.2 - Pruebas de Edge Functions

Se ejecuto un flujo completo como visitante anonimo, con token temporal de caso:

```text
create-case
submit-questionnaire
request-image-upload
finalize-image-upload
validate-image
run-inference
generate-report
get-case-result
```

### Prueba de `run-inference`

Resultado exitoso:

```text
case_code: OD-20260702-3B62E244
case_id: 2e2779d7-8ef9-4f7e-bdc3-bd82c9ac9823
image_id: 6ccf3595-5dce-4638-8658-85b53f155c88
quality_status: accepted
inference_id: 0dc87c03-bbf8-4020-9165-fef302e1c1d7
suspicion_level: low
probability: 0.908816
urgency_level: priority
next_step: generate_report
```

Confirmacion por SQL:

```text
status: under_review
final_suspicion_level: low
final_urgency_level: priority
has_final_recommendation: true
ai_inferences: 1
recommendations: 1
gradcam_images: 0
ai_audit_events: 3
```

Interpretacion:

- `run-inference` llamo correctamente al servicio IA externo.
- La inferencia se guardo en `ai_inferences`.
- La recomendacion preventiva se guardo en `recommendations`.
- El caso se actualizo con resultado final.
- Se registraron eventos de auditoria de IA.
- No se creo Grad-CAM porque el servicio IA no devolvio `gradcam_base64`.

### Prueba completa con PDF y resultado

Resultado exitoso:

```text
case_code: OD-20260702-21C5D38E
case_id: ee2fff0e-1bb4-4f37-8f99-d6e6b2f94fc0
image_id: 18238f19-187f-44d5-b5b1-dc27943add15
quality_status: accepted
inference_id: e47da01f-c1d4-4f8b-9bfe-4c2cf60d032b
report_id: 302453d7-0165-4c7e-b41c-082e2a7685f7
result_status: reported
result_suspicion: low
result_urgency: routine
has_report_url: true
has_disclaimer: true
```

### Conteo final de evidencia QA

Consulta resumida sobre los casos QA:

```text
qa_cases: 2
questionnaires: 2
original_images: 2
accepted_quality_checks: 2
ai_inferences: 2
recommendations: 2
pdf_reports: 1
audit_events: 17
```

## Subfase 14.3 - Pruebas de seguridad

### Acceso anonimo directo a tablas

Se probo acceso REST directo con la public/anon key a tablas sensibles:

```text
cases -> bloqueado / 404
case_subjects -> bloqueado / 404
case_images -> bloqueado / 404
ai_inferences -> bloqueado / 404
recommendations -> bloqueado / 404
audit_logs -> bloqueado / 404
```

Interpretacion:

- El flujo anonimo no opera por acceso directo a tablas.
- El acceso publico queda canalizado por Edge Functions.

### Endpoints internos sin usuario valido

| Funcion | Metodo | Resultado |
|---|---|---|
| `review-case` | POST | HTTP 401. |
| `dashboard-metrics` | GET | HTTP 401. |

Interpretacion:

- `review-case` no permite revision anonima.
- `dashboard-metrics` no expone metricas agregadas a anonimos.

### Logs sin secretos planos

Se reviso `api_request_logs` de las ultimas pruebas:

```text
suspicious_metadata_rows: 0
```

Patrones buscados:

- `case_token`
- `odct_`
- `service_role`
- `authorization`

## Resultado de Fase 14

Fase 14 completada con evidencia funcional.

Pendiente o limitacion:

- Grad-CAM no fue generado porque el servicio IA no retorno imagen Grad-CAM.
- No se probaron perfiles internos reales de promotor, investigador, especialista y admin porque no se contaba con sesiones JWT internas activas en esta ejecucion.
