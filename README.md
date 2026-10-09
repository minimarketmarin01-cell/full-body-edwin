# Full Body — Edwin

App de registro de entrenamientos para el programa "Full Body — Edwin" (hipertrofia, 3 días/semana). Frontend estático (PWA) + API en Cloudflare Workers + base de datos Cloudflare D1.

## Estructura

```
full-body-edwin/
├── index.html        # App (PWA, sin dependencias, funciona en el celular)
├── manifest.json
├── sw.js
├── icon-192.png / icon-512.png
└── worker/            # Backend (Cloudflare Worker + D1)
    ├── wrangler.toml
    ├── src/index.js
    └── migrations/
        ├── 0001_init.sql
        └── 0002_nutrition.sql
```

## 1. Frontend (GitHub Pages)

Ya está en este repo. Para publicarlo:

1. En GitHub: **Settings → Pages**.
2. Source: `Deploy from a branch` → branch `main` → carpeta `/ (root)`.
3. La app queda disponible en `https://<usuario>.github.io/full-body-edwin/`.

## 2. Backend (Cloudflare Worker + D1)

La base de datos D1 **ya está creada** (`fullbody-edwin`, database_id en `worker/wrangler.toml`). Falta desplegar el Worker desde tu cuenta de Cloudflare:

```bash
cd worker
npm install -g wrangler   # si no lo tienes
wrangler login
wrangler deploy
```

Wrangler te entrega una URL tipo `https://fullbody-edwin-api.<tu-subdominio>.workers.dev`.

Si prefieres usar tu propia base D1 en vez de la ya creada, créala y actualiza `database_id` en `wrangler.toml`, luego aplica el esquema:

```bash
wrangler d1 execute fullbody-edwin --remote --file=migrations/0001_init.sql
wrangler d1 execute fullbody-edwin --remote --file=migrations/0002_nutrition.sql
```

También puedes pegar el contenido de cada archivo `.sql` directamente en el **Console** de tu base D1 desde el dashboard de Cloudflare (Workers & Pages → D1 → tu base → Console), sin necesidad de instalar Wrangler.

## 3. Conectar la app con la API

1. Abre la app en el celular.
2. Ve a **Ajustes**.
3. Pega la URL del Worker (sin `/` final) y toca **Guardar**.
4. Toca **Probar conexión** para confirmar.

La URL queda guardada en el celular (localStorage), no hay que repetirlo cada vez.

## Uso

- **Hoy**: elige sesión A/B/C, registra peso y reps por serie. Cada serie se guarda al toque de "Ok". Si ya entrenaste ese día, los datos se recargan solos.
- **Nutrición**: calorías/proteína/carbos/grasas del día vs. metas calculadas automáticamente (Mifflin-St Jeor + reparto de macros para hipertrofia, a partir del perfil en Ajustes). Buscador de alimentos: primero una base local de ~38 alimentos comunes (instantánea, sin red), y si no aparece, resultados en vivo de Open Food Facts vía el Worker. También se puede agregar sacando una foto del plato: una IA (Google Gemini, tier gratis) estima el alimento y sus macros, editables antes de guardar.

### Activar "Agregar con foto" (gratis)

Requiere una API key gratuita de Google AI Studio (no pide tarjeta de crédito, uso personal queda muy por debajo del límite gratis):

1. Ve a **aistudio.google.com/apikey** e inicia sesión con una cuenta Google.
2. **Create API key** → **Create API key in new project**.
3. Copia la key (empieza con `AIza...`).
4. En el Cloudflare dashboard → tu Worker `fullbody-edwin-api` → pestaña **Settings** → **Variables and Secrets**.
5. **Add variable** → tipo **Secret** (encriptado) → nombre exacto `GEMINI_API_KEY` → pega la key → **Save and deploy**.

Sin ese secreto configurado, el botón "📷 Agregar con foto" muestra un error — el resto de la app sigue funcionando normal.
- **Historial**: progresión de carga por ejercicio (barras + tabla).
- **Volumen**: series semanales objetivo por grupo muscular (según el programa, referencia fija).
- **Ajustes**: URL de la API, notificaciones del descanso, perfil para metas de nutrición.

## Datos del programa (fuente: Programa_Full_Body_Edwin.xlsx)

- Objetivo: hipertrofia/estética. RIR 2 en básicos, 1-1.5 en aislados.
- Progresión: doble progresión (sube carga al completar el techo de reps en todas las series).
- Deload: cada 5-6 semanas.

## Créditos

Los polígonos SVG del diagrama anatómico ("Músculos trabajados") están portados de
[react-body-highlighter](https://github.com/giavinh79/react-body-highlighter) (© 2020 GV79,
licencia MIT).
