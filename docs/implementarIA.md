# Implementar IA - OralDiagnostic

Fecha: 2026-07-01

## 1. Estado actual de `ai-service`

Ya existe la base del microservicio:

- Carpeta: `ai-service/`
- Framework: FastAPI.
- Runtime local: Python 3.11.9 en `ai-service/venv`.
- Endpoint de salud: `GET /health`.
- Endpoint IA: `POST /v1/inference/oral-lesion`.
- Autenticacion: `Authorization: Bearer {AI_AUTH_TOKEN}`.
- Descarga de imagen desde URL firmada temporal.
- Preprocesamiento a RGB `224x224`.
- Loader de modelo.
- Inferencia compatible con `low`, `moderate`, `high`.
- Grad-CAM configurado como obligatorio por defecto.
- Dockerfile reservado para despliegue futuro en nube.
- Tests de contrato funcionando.

Verificacion actual:

```text
3 passed
```

Esto significa que el contrato FastAPI funciona, pero todavia no significa que la inferencia real ni Grad-CAM real esten completos.

## 2. Problema actual con TensorFlow

El comando:

```powershell
.\venv\Scripts\python.exe -c "import tensorflow as tf; print(tf.__version__)"
```

falla con:

```text
ImportError: DLL load failed while importing _pywrap_tf2:
Error en una rutina de inicializacion de biblioteca de vinculos dinamicos (DLL).
```

Este error bloquea:

- carga de `MobileNetV3Small`;
- carga de `.keras`;
- inferencia real;
- Grad-CAM real.

Por ahora solo esta validado el contrato del servicio.

## 3. Causas probables del error TensorFlow en Windows

Segun la documentacion oficial de TensorFlow:

- En Windows nativo, TensorFlow 2.10 fue la ultima version con soporte GPU nativo.
- Desde TensorFlow 2.11, para GPU se recomienda WSL2.
- Para CPU en Windows, los builds modernos dependen de paquetes de Intel.
- TensorFlow en Windows requiere Microsoft Visual C++ Redistributable.
- Los binarios de TensorFlow usan instrucciones AVX, por lo que pueden fallar en CPUs antiguas o incompatibles.

Fuentes:

- TensorFlow pip install: https://www.tensorflow.org/install/pip
- Seccion Windows Native: https://www.tensorflow.org/install/pip#windows-native
- Requisitos de hardware/software: https://www.tensorflow.org/install/pip#hardware-requirements

## 4. Como intentar arreglar TensorFlow sin Docker

Primero actualizar herramientas:

```powershell
cd C:\Feria-2026\ai-service
.\venv\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
```

Luego reinstalar TensorFlow limpio:

```powershell
.\venv\Scripts\python.exe -m pip uninstall tensorflow tensorflow-intel tensorflow-cpu keras -y
.\venv\Scripts\python.exe -m pip install tensorflow-cpu==2.15.1
.\venv\Scripts\python.exe -c "import tensorflow as tf; print(tf.__version__)"
```

Si eso falla, probar:

```powershell
.\venv\Scripts\python.exe -m pip uninstall tensorflow tensorflow-intel tensorflow-cpu keras -y
.\venv\Scripts\python.exe -m pip install tensorflow==2.15.1
.\venv\Scripts\python.exe -c "import tensorflow as tf; print(tf.__version__)"
```

Tambien verificar:

1. Instalar o reparar Microsoft Visual C++ Redistributable 2015-2022 x64.
2. Reiniciar terminal.
3. Volver a ejecutar el import.

Si sigue fallando con error DLL o `0xc000001d`, es probable que el entorno Windows/CPU no pueda ejecutar ese build de TensorFlow. En ese caso hay tres caminos:

1. Validar modelo real en Linux/nube.
2. Usar WSL2 sin Docker.
3. Cambiar el backend IA a PyTorch, que tambien es compatible con el plan original.

## 5. Se debe usar `MobileNetV3Small(weights="imagenet")`?

Respuesta corta:

```text
Si, pero solo como base tecnica preentrenada o fallback de integracion.
No, como modelo final clinico para lesiones bucales.
```

`MobileNetV3Small(weights="imagenet")` sirve para:

- no crear una red desde cero;
- probar carga de modelo;
- probar preprocesamiento;
- probar endpoint;
- probar Grad-CAM;
- mantener un modelo liviano;
- preparar el pipeline completo.

Pero no sirve por si solo para afirmar que clasifica lesiones bucales, porque ImageNet no esta entrenado especificamente para lesiones orales.

Decision recomendada:

- Usar `MobileNetV3Small(weights="imagenet")` como base preentrenada inicial.
- No activar `ai_models.is_active = true` para flujo real solo con ImageNet.
- Buscar o construir encima de esa base un checkpoint adaptado a lesiones bucales.

## 6. Busqueda de checkpoint publico ya entrenado para lesiones bucales

Se busco un checkpoint publico ya entrenado/adaptado para lesiones bucales que permita Grad-CAM.

Resultado honesto:

```text
No encontre un checkpoint publico claro, listo para descargar, de imagenes clinicas intraorales,
con clases documentadas y compatible directamente con Grad-CAM para usar en produccion.
```

Lo que si aparece disponible publicamente:

### 6.1 Multi-OSCC

Repositorio:

```text
https://github.com/guanjinquan/OSCC-PathologyImageDataset
```

Que ofrece:

- Dataset publico de histopatologia OSCC.
- Baselines y pesos para tareas de patologia.
- Modelos tipo ViT/Swin/encoders de patologia.
- Publica dataset en Zenodo.
- Licencia GPL-3.0 en GitHub.

Limitaciones para OralDiagnostic:

- Es histopatologia, no fotos clinicas intraorales.
- No coincide con el flujo de usuario del MVP, que sube imagen bucal visible.
- Usa principalmente arquitecturas de patologia/ViT/Swin, no necesariamente MobileNetV3Small.
- Grad-CAM clasico aplica mejor a CNNs; con ViT se suelen usar mapas de atencion u otras tecnicas.

Uso recomendado:

- Bueno como referencia academica o futura linea histopatologica.
- No es el checkpoint ideal para el MVP de imagen clinica oral.

Fuente:

- https://github.com/guanjinquan/OSCC-PathologyImageDataset
- https://arxiv.org/abs/2507.16360

### 6.2 Papers recientes de lesion oral

Se encontraron trabajos sobre clasificacion de lesiones orales, pero no necesariamente con checkpoint publico listo para usar:

- Clasificacion multimodal RGB-HSI de lesion oral:
  - https://arxiv.org/abs/2511.12268
- Clasificacion multicase/multiclase de lesiones orales:
  - https://arxiv.org/abs/2511.21582
- Deteccion multimodal de cancer oral:
  - https://arxiv.org/abs/2510.03878

Limitacion:

- Sirven como referencia tecnica.
- No entregan necesariamente un `.keras` publico listo para integrar.
- Hay que revisar licencia, dataset, clases y disponibilidad de pesos antes de usarlos.

## 7. Decision practica para este proyecto

Para avanzar sin inventar y sin crear desde cero:

1. Mantener `MobileNetV3Small(weights="imagenet")` como base preentrenada.
2. Usarla para completar pipeline tecnico y Grad-CAM.
3. Buscar un dataset/checkpoint especifico de lesiones bucales.
4. Si no aparece checkpoint confiable, hacer fine-tuning del cabezal sobre MobileNetV3Small con dataset documentado.
5. Marcar el modelo como no validado clinicamente hasta tener evaluacion minima.

Esto respeta:

- No crear arquitectura desde cero.
- Usar modelo ya hecho.
- Mantener IA como apoyo al triaje, no diagnostico.

## 8. Lo que falta para completar `ai-service`

### Fase 1 - Corregir entorno local

Objetivo:

```text
TensorFlow debe importar sin error.
```

Tareas:

1. Reparar Visual C++ Redistributable.
2. Reinstalar TensorFlow.
3. Verificar:

```powershell
.\venv\Scripts\python.exe -c "import tensorflow as tf; print(tf.__version__)"
```

Criterio de aceptacion:

```text
El comando imprime version de TensorFlow sin error DLL.
```

### Fase 2 - Probar modelo base preentrenado

Objetivo:

```text
Confirmar que MobileNetV3Small carga como modelo ya hecho.
```

Tareas:

1. Ejecutar loader:

```powershell
.\venv\Scripts\python.exe -c "from app.config import get_settings; from app.model_loader import load_model; print(load_model(get_settings()).source)"
```

2. Verificar que devuelve:

```text
tf.keras.applications.MobileNetV3Small(weights='imagenet')
```

Criterio de aceptacion:

```text
El modelo carga sin descargar ni entrenar arquitectura propia.
```

### Fase 3 - Validar Grad-CAM con MobileNetV3Small

Objetivo:

```text
Generar Grad-CAM real usando el modelo base.
```

Tareas:

1. Usar imagen de prueba local.
2. Ejecutar inferencia.
3. Confirmar que `gradcam_base64` no sea null.
4. Confirmar que el base64 decodifica como PNG.

Criterio de aceptacion:

```text
El endpoint devuelve gradcam_base64 y gradcam_mime_type=image/png.
```

### Fase 4 - Elegir checkpoint especifico de lesion oral

Objetivo:

```text
Reemplazar la base ImageNet por un checkpoint mas adecuado.
```

Tareas:

1. Buscar checkpoint publico especifico.
2. Confirmar licencia.
3. Confirmar modalidad:
   - fotos clinicas intraorales;
   - no histopatologia, salvo que se cambie el alcance.
4. Confirmar clases.
5. Confirmar compatibilidad con Grad-CAM.
6. Descargar artefacto.

Criterio de aceptacion:

```text
Existe un archivo de modelo documentado y compatible con el endpoint.
```

### Fase 5 - Colocar artefacto del modelo

Ruta esperada:

```text
ai-service/models/oral-lesion-triage-cnn/1.0.0/model.keras
```

Configurar `.env`:

```env
AI_MODEL_PATH=models/oral-lesion-triage-cnn/1.0.0/model.keras
AI_MODEL_NAME=oral-lesion-triage-cnn
AI_MODEL_VERSION=1.0.0
AI_MODEL_ARCHITECTURE=mobilenetv3-small
AI_REQUIRE_GRADCAM=true
AI_REQUIRE_CLINICAL_CHECKPOINT=true
```

Criterio de aceptacion:

```text
El servicio carga el modelo desde AI_MODEL_PATH.
```

### Fase 6 - Mapear clases a `low/moderate/high`

Objetivo:

```text
Que el output del modelo real se traduzca de forma documentada a las clases del backend.
```

Tareas:

1. Leer clases originales del checkpoint.
2. Crear mapeo explicito.
3. Documentar el mapeo.
4. Ajustar `app/inference.py`.

Ejemplo:

```text
normal -> low
benign -> low/moderate segun criterio documentado
opmd -> moderate
oscc -> high
```

No inventar este mapeo sin fuente o decision documentada.

### Fase 7 - Crear prueba real de modelo y Grad-CAM

Crear archivo:

```text
ai-service/tests/test_real_model_gradcam.py
```

Debe validar:

- carga de modelo real;
- inferencia con imagen real de prueba;
- `suspicion_level` en `low/moderate/high`;
- `class_probabilities` con tres clases;
- `gradcam_base64` no vacio;
- PNG valido.

Esta prueba puede quedar marcada para ejecutarse solo cuando exista modelo real.

### Fase 8 - Ejecutar servicio local

Comando:

```powershell
cd C:\Feria-2026\ai-service
.\venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```

Probar:

```text
http://127.0.0.1:8000/health
```

Criterio de aceptacion:

```text
El servicio responde health OK y no carga secretos en logs.
```

### Fase 9 - Probar endpoint IA local

Enviar request con:

```text
Authorization: Bearer {AI_AUTH_TOKEN}
```

Payload compatible con Supabase:

```json
{
  "case_code": "OD-TEST",
  "image_id": "00000000-0000-0000-0000-000000000001",
  "image_url": "https://url-firmada-temporal",
  "model": {
    "name": "oral-lesion-triage-cnn",
    "version": "1.0.0",
    "architecture": "mobilenetv3-small"
  }
}
```

Criterio de aceptacion:

```text
Devuelve suspicion_level, probability, class_probabilities, gradcam_base64 y latency_ms.
```

### Fase 10 - Conectar Supabase

Cuando el servicio este accesible por HTTPS:

```text
AI_SERVICE_URL=https://url-del-ai-service
AI_SERVICE_TOKEN=mismo-valor-que-AI_AUTH_TOKEN
```

No usar `localhost` si Supabase esta remoto, porque Supabase no puede entrar a tu maquina directamente.

Opciones sin Docker:

1. Túnel temporal con ngrok/cloudflared.
2. Despliegue temporal en nube.
3. WSL2/local solo si Supabase tambien esta local.

### Fase 11 - Activar modelo en Supabase

No activar todavia.

Activar solo cuando:

- TensorFlow funciona;
- modelo carga;
- Grad-CAM funciona;
- endpoint responde;
- Supabase puede llamar al servicio;
- `run-inference` guarda `ai_inferences`;
- Grad-CAM queda en `case-gradcam`;
- `recommendations` se crea.

### Fase 12 - Prueba end-to-end

Flujo final:

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

Criterio de aceptacion final:

```text
Un caso con imagen valida genera inferencia, Grad-CAM, recomendacion preventiva y reporte,
sin lenguaje diagnostico y con modelo versionado.
```

## 9. Recomendacion final

Para avanzar ahora:

1. Arreglar TensorFlow local.
2. Validar MobileNetV3Small + Grad-CAM como integracion tecnica.
3. No activar modelo real en Supabase todavia.
4. Buscar checkpoint clinico oral especifico; si no aparece uno confiable, usar MobileNetV3Small como base de transferencia y documentar claramente que no es validacion clinica.

La respuesta a "debo usar MobileNetV3Small(weights='imagenet')" es:

```text
Usalo para completar el pipeline y no crear desde cero.
No lo uses como modelo clinico final sin adaptacion/validacion.
```

