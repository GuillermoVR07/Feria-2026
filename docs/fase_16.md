# OralDiagnostic - Contexto de implementacion Supabase Fase 16

Fecha: 2026-07-02

Proyecto Supabase: `OralDiagnostic`

Project ref: `lsicnvutjvemohcxiwjk`

## Resumen

Se documento la Fase 16 del documento `docs/backend_supabase_por_fases.md`: limitaciones tecnicas y recomendaciones Supabase.

Esta fase no requirio cambios de esquema ni despliegue nuevo. Su objetivo fue dejar claras las limitaciones reales observadas despues de probar el flujo completo con IA externa.

## Subfase 16.1 - Limitaciones tecnicas

### 1. La inferencia CNN no corre dentro de Edge Functions

Estado:

- Cumplido.
- La inferencia se ejecuta en Hugging Face Space mediante el servicio Docker `oraldiagnostic-ai-service`.
- Supabase Edge Function `run-inference` solo orquesta la llamada, crea URL firmada, valida respuesta y persiste resultados.

Motivo:

- Edge Functions no son el lugar correcto para ejecutar CNN pesada en produccion.

### 2. Cold starts y tiempos de respuesta

Estado:

- Limitacion vigente.
- La prueba fue exitosa, pero el servicio IA externo puede tardar por cold start de Hugging Face.
- `run-inference` usa timeout de 30 segundos.

Riesgo:

- Si Hugging Face tarda mas de lo esperado, el caso puede quedar en `ai_failed`.

### 3. Limites de Storage dependen del plan

Estado:

- Buckets configurados con limite de 10 MB.
- Capacidad total, transferencia y costos dependen del plan Supabase.

### 4. Backups y retencion avanzada dependen del plan

Estado:

- No verificable desde MCP.
- Debe revisarse manualmente en Dashboard Supabase.

### 5. Acceso anonimo directo a tablas sensibles no es aceptable

Estado:

- Cumplido en las pruebas realizadas.
- REST anonimo directo a tablas sensibles quedo bloqueado.
- El flujo publico opera por Edge Functions y tokens temporales.

### 6. Dashboard MVP debe ser agregado

Estado:

- Cumplido parcialmente.
- Existe `v_dashboard_metrics`.
- `dashboard-metrics` bloquea acceso anonimo.

Pendiente:

- Probar acceso con usuario investigador real.

### 7. Reglas clinicas preventivas, no diagnosticas

Estado:

- Cumplido.
- Las recomendaciones generadas usan lenguaje preventivo.
- El resultado y el PDF incluyen disclaimer medico.

### 8. Falsos positivos y falsos negativos del modelo IA

Estado:

- Limitacion vigente.
- El modelo actual sirve para pruebas del software, no para diagnostico clinico.
- Debe validarse con dataset real aprobado antes de uso sanitario.

### 9. Generalizacion dependiente del dataset

Estado:

- Limitacion vigente.
- El archivo `model.keras` subido permite probar integracion, pero no reemplaza validacion clinica.

### 10. No usar entrenamiento automatico con imagenes reales sin consentimiento especifico

Estado:

- Vigente como regla de seguridad.
- El flujo actual registra consentimiento general del caso, pero cualquier uso de imagenes para entrenamiento requiere consentimiento especifico y marco etico/legal.

## Subfase 16.2 - Recomendaciones

### Recomendaciones tecnicas inmediatas

1. Mantener IA separada en Docker externo.
2. Mantener `run-inference` como orquestador, no como motor IA.
3. Usar URLs firmadas de corta duracion para imagenes y reportes.
4. Mantener RLS activo aunque el flujo principal pase por Edge Functions.
5. Mantener `request_id` en logs tecnicos.
6. No guardar tokens planos en tablas ni logs.
7. No exponer `service_role` en frontend.
8. Restringir CORS antes de produccion real.
9. Agregar rate limiting externo si el formulario queda publico.
10. Definir retencion de imagenes, Grad-CAM y reportes PDF.

### Recomendaciones para frontend

1. Consumir solo Edge Functions, no tablas directas.
2. Guardar temporalmente `case_code` y `case_token` del usuario anonimo.
3. Subir imagenes solo mediante URL firmada.
4. Mostrar siempre disclaimer medico.
5. Mostrar estados intermedios claros:
   - cuestionario completado
   - imagen subida
   - calidad aceptada o rechazada
   - inferencia en proceso
   - resultado disponible
6. No mostrar lenguaje de diagnostico definitivo.

### Recomendaciones para IA

1. Mantener versionado de modelo en `ai_models`.
2. No activar modelos sin prueba de contrato contra `run-inference`.
3. Hacer que el servicio IA devuelva, cuando sea posible:
   - `suspicion_level`
   - `probability`
   - `class_probabilities`
   - `model_name`
   - `model_version`
   - `architecture`
   - `latency_ms`
   - `gradcam_base64`
4. Agregar Grad-CAM real si se requiere cumplir totalmente la salida visual explicativa.
5. Documentar claramente que el modelo actual es para pruebas de software.

## Evidencia observada

Prueba de IA:

```text
run-inference: exitoso
ai_inferences creadas: 2
recommendations creadas: 2
pdf_reports creados: 1
disclaimer devuelto por API: si
Grad-CAM creado: no
```

Motivo de Grad-CAM pendiente:

- El servicio IA no retorno `gradcam_base64`.
- El backend esta preparado para guardarlo si se devuelve.

## Resultado de Fase 16

Fase 16 documentada.

Estado final:

- Supabase funciona como backend, Storage, auditoria y orquestador.
- Hugging Face funciona como servicio externo IA.
- El flujo completo ya fue probado con datos QA sinteticos.
- Quedan pendientes decisiones de produccion: backups, CORS real, retencion, roles internos con JWT reales y validacion clinica del modelo.
