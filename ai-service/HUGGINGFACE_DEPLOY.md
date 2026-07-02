# Despliegue en Hugging Face Spaces

Esta guia asume que vas a subir la carpeta `ai-service/` directamente desde el navegador, sin Docker Desktop.

## 1. Antes de subir

La carpeta ya esta preparada para Docker Spaces:

- `README.md` tiene metadata de Hugging Face con `sdk: docker` y `app_port: 8000`.
- `Dockerfile` expone FastAPI en el puerto `8000`.
- `requirements.txt` usa TensorFlow para Linux, sin `tensorflow-intel`.
- `.dockerignore` no excluye modelos, para que Hugging Face pueda copiar `models/` al contenedor.
- Si `models/oral-lesion-triage-cnn/1.0.0/model.keras` no existe, el build crea un checkpoint tecnico sintetico para pruebas.

## 2. Modo de prueba tecnica sin modelo clinico

Usa este modo solo para comprobar que Supabase puede llamar al servicio. No es inferencia medica real.

El Dockerfile genera automaticamente:

```text
models/oral-lesion-triage-cnn/1.0.0/model.keras
```

si el archivo no fue subido previamente. Ese checkpoint usa una base MobileNetV3Small y una cabeza de 3 clases entrenada con imagenes sinteticas. Sirve para validar el flujo, no para uso clinico.

En Hugging Face, configura estos valores en `Settings` -> `Variables and secrets`:

Secrets:

```env
AI_AUTH_TOKEN=pon-un-token-largo-y-secreto
```

Variables:

```env
AI_MODEL_PATH=/home/user/app/models/oral-lesion-triage-cnn/1.0.0/model.keras
AI_MODEL_NAME=oral-lesion-triage-cnn
AI_MODEL_VERSION=1.0.0
AI_MODEL_ARCHITECTURE=mobilenetv3-small
AI_INPUT_HEIGHT=224
AI_INPUT_WIDTH=224
AI_INPUT_CHANNELS=3
AI_ENVIRONMENT=huggingface
AI_REQUIRE_CLINICAL_CHECKPOINT=true
AI_ALLOW_CONTRACT_FALLBACK=false
AI_ENABLE_GRADCAM=true
AI_REQUIRE_GRADCAM=false
AI_DOWNLOAD_TIMEOUT_SECONDS=10
AI_MAX_IMAGE_BYTES=10485760
```

## 3. Modo con modelo real

Cuando tengas el checkpoint real, subelo en esta ruta dentro del Space:

```text
models/oral-lesion-triage-cnn/1.0.0/model.keras
```

Luego cambia variables:

```env
AI_REQUIRE_CLINICAL_CHECKPOINT=true
AI_ALLOW_CONTRACT_FALLBACK=false
AI_ENABLE_GRADCAM=true
AI_REQUIRE_GRADCAM=false
```

Mantener `AI_REQUIRE_GRADCAM=false` evita que una falla de Grad-CAM bloquee la inferencia si la clasificacion fue valida.

## 4. Crear el Space

1. Entra a `https://huggingface.co/spaces`.
2. Click en `Create new Space`.
3. Nombre sugerido: `oraldiagnostic-ai-service`.
4. SDK: `Docker`.
5. Hardware: `CPU Basic` para empezar gratis.
6. Visibilidad: `Private` si el proyecto no debe ser publico.
7. Crea el Space.

## 5. Subir archivos desde el navegador

En el Space:

1. Abre la pestana `Files`.
2. Sube el contenido de `ai-service/`, no la carpeta padre.
3. Deben quedar en la raiz del Space:

```text
README.md
Dockerfile
requirements.txt
app/
models/
.dockerignore
.gitattributes
```

4. Espera el build. Puede tardar varios minutos porque instala TensorFlow.

## 6. Probar el servicio

Cuando el Space este en estado `Running`, abre:

```text
https://TU-USUARIO-oraldiagnostic-ai-service.hf.space/health
```

Debe devolver:

```json
{
  "service": "oraldiagnostic-ai-service",
  "status": "ok",
  "model_name": "oral-lesion-triage-cnn",
  "model_version": "1.0.0"
}
```

## 7. Conectar con Supabase

En Supabase, agrega estos secrets para Edge Functions:

```env
AI_SERVICE_URL=https://TU-USUARIO-oraldiagnostic-ai-service.hf.space
AI_SERVICE_TOKEN=el-mismo-valor-de-AI_AUTH_TOKEN
```

Despues activa el modelo solo cuando `/health` responda correctamente:

```sql
update public.ai_models
set is_active = false;

update public.ai_models
set is_active = true
where name = 'oral-lesion-triage-cnn'
  and version = '1.0.0';
```

## 8. Importante sobre el plan gratis

En hardware gratis, Hugging Face puede dormir el Space cuando no se usa. Antes de probar `run-inference`, abre `/health` para despertarlo.

Si `run-inference` falla por timeout en el primer intento, espera a que el Space termine de despertar y vuelve a intentar.

## 9. Seguridad

- No pongas `AI_AUTH_TOKEN` dentro del codigo.
- Usa `Secrets`, no `Variables`, para `AI_AUTH_TOKEN`.
- No subas `.env`.
- No uses el fallback tecnico como resultado clinico.
- El servicio no diagnostica cancer; solo entrega una senal tecnica para el flujo preventivo.
