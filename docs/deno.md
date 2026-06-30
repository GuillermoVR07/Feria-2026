# Deno en este proyecto

## Para que sirve

Deno es el runtime de TypeScript/JavaScript que usa Supabase Edge Functions. En este proyecto sirve para validar localmente el codigo de `supabase/functions` antes de desplegarlo con Supabase.

Usos principales:

- Ejecutar `deno check` para detectar errores de tipos sin correr la funcion.
- Ejecutar `deno fmt` para formatear codigo TypeScript.
- Ejecutar `deno lint` para detectar problemas comunes.
- Probar funciones localmente cuando se use Supabase CLI.
- Trabajar con imports remotos como `jsr:` y `https://esm.sh`.

## Instalacion en Windows

Opcion recomendada por la documentacion oficial de Deno:

```powershell
irm https://deno.land/install.ps1 | iex
```

Luego cerrar y abrir PowerShell para que tome el `PATH`.

Alternativas:

```powershell
winget install DenoLand.Deno
```

```powershell
scoop install deno
```

```powershell
choco install deno
```

La documentacion oficial indica que Deno es un binario unico y que en Windows el instalador por PowerShell lo deja normalmente en:

```text
%USERPROFILE%\.deno\bin\deno.exe
```

## Verificar instalacion

```powershell
deno --version
```

Si el comando imprime la version, la instalacion quedo correcta.

Si aparece que `deno` no se reconoce:

1. Cerrar y abrir PowerShell.
2. Verificar que `%USERPROFILE%\.deno\bin` este en el `PATH`.
3. Si se instalo con `winget`, `scoop` o `choco`, revisar el PATH administrado por ese instalador.

## Que significa `deno check`

`deno check` revisa tipos de TypeScript sin ejecutar el codigo.

Ejemplo:

```powershell
deno check supabase/functions/admin-upsert-ai-model/index.ts
```

Si la salida solo muestra algo como:

```text
Check supabase/functions/admin-upsert-ai-model/index.ts
```

y no aparecen errores, el archivo paso correctamente.

## Comandos recomendados para este proyecto

Validar una funcion concreta:

```powershell
deno check supabase/functions/admin-upsert-ai-model/index.ts
```

Validar varias funciones:

```powershell
deno check `
  supabase/functions/health-check/index.ts `
  supabase/functions/create-case/index.ts `
  supabase/functions/submit-questionnaire/index.ts
```

Validar todas las Edge Functions con archivo `index.ts`:

```powershell
Get-ChildItem supabase/functions -Recurse -Filter index.ts |
  ForEach-Object { deno check $_.FullName }
```

Formatear codigo:

```powershell
deno fmt supabase/functions
```

Revisar lint:

```powershell
deno lint supabase/functions
```

Ver informacion de dependencias y cache:

```powershell
deno info
```

Actualizar Deno:

```powershell
deno upgrade
```

Si se instalo con winget:

```powershell
winget upgrade DenoLand.Deno
```

## Deno y Supabase Edge Functions

Las Edge Functions de Supabase corren sobre un runtime compatible con Deno. Por eso los archivos usan:

```ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
```

Esto agrega tipos del runtime de Edge Functions, como `Deno.serve`.

Tambien se usan imports remotos:

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
```

La primera vez que se corre `deno check`, Deno puede descargar y cachear dependencias remotas. Despues las reutiliza desde su cache.

## Buenas practicas

- Correr `deno check` antes de desplegar una funcion.
- Revisar una funcion a la vez cuando se esta depurando.
- Correr validacion completa antes de cerrar una fase.
- No guardar secretos en archivos del repo.
- Mantener `SUPABASE_SERVICE_ROLE_KEY` solo en Supabase Secrets o entorno seguro.
- No importar `_shared/supabase-admin.ts` desde frontend.
- Usar mensajes de API en espanol y sin lenguaje diagnostico medico definitivo.

## Referencias oficiales

- Instalacion: https://docs.deno.com/runtime/getting_started/installation/
- `deno check`: https://docs.deno.com/runtime/reference/cli/check/
