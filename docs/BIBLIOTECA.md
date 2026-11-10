# Biblioteca de ejercicios

Pestaña **Ejercicios** de la app: catálogo con buscador, filtros y ficha de detalle.
No toca el programa de entrenamiento (`PROGRAM`), los registros (`logs`) ni la API.

## Estado

- **Prototipo:** 10 ejercicios de **Pecho**. Las otras 9 categorías aparecen en los filtros como
  "pronto" y se agregan después de validar este prototipo.
- Imágenes: dibujos de línea de [Workout Guide](https://github.com/bryllim/workout-guide)
  (CC BY-SA 4.0), 3 fotogramas por ejercicio. El **pullover con mancuerna** no tiene
  animación validada y se muestra como *pendiente de animación*.
- No se usan imágenes de Gym visual en la biblioteca: no hay una licencia propia para ellas.

## Estructura de archivos

```
data/exercises/
  index.json        # categorías, equipamientos y niveles
  chest.json        # una lista por categoría (se carga solo al verla)
assets/ejercicios/<slug>/frame-1.svg, frame-2.svg, frame-3.svg   # medio "frames"
assets/exercises/<categoria>/<slug>/preview.webp, animation.gif|webm   # medio "local" (propio)
```

`assets/ejercicios/` ya existía para el modal de técnica de "Hoy". La biblioteca la reutiliza para no
duplicar archivos.

## Esquema de una ficha (`data/exercises/<categoria>.json`)

| Campo | Ejemplo | Notas |
|---|---|---|
| `id` | `pecho-press-banca-barra` | Único y estable. No se reutiliza ni se cambia. |
| `categoria` | `chest` | Debe existir en `index.json`. |
| `nombre_es` / `nombre_en` | Press banca con barra / Barbell bench press | |
| `grupo` | `Pecho` | Músculo principal: `Pecho`, `Espalda`, `Hombro`, `Bíceps`, `Tríceps`, `Core`, `Cuádriceps`, `Isquiotibiales`, `Glúteo`. Debe estar en `GROUP_SLUGS` (index.html) para colorear el mapa. |
| `sec` | `["Tríceps","Hombro"]` | Músculos secundarios (mismos nombres que `grupo`). |
| `equipamiento` | `Barra` | Uno de `equipamientos` en `index.json`. |
| `tipo` | `Compuesto` | `Compuesto` o `Aislamiento`. |
| `dificultad` | `Intermedio` | Uno de `niveles` en `index.json`. |
| `instrucciones` | lista de pasos | Texto propio, en español. |
| `errores` | lista | Errores frecuentes. |
| `media` | ver abajo | |

### Campo `media`

- Fotogramas de Workout Guide: `{ "fuente": "frames", "slug": "bench-press", "estado": "disponible" }`
- Medio propio: `{ "fuente": "local", "ruta": "assets/exercises/chest/mi-ejercicio/", "webm": true }`
  (usa `preview.webp` y `animation.gif`; con `"webm": true` usa `animation.webm` en un `<video>`).
- Sin animación validada: `{ "fuente": "ninguna", "estado": "pendiente" }`. La app muestra el mapa
  muscular y los textos, y marca el ejercicio como **pendiente de animación**.

## Cómo agregar un ejercicio

1. Elige el medio. **Solo** imágenes con derechos de uso compatibles: propias, o de una fuente con
   licencia (por ejemplo CC BY-SA con crédito en Ajustes → Créditos). No se inventan animaciones: si no
   hay una validada, usa `"fuente": "ninguna"`.
2. Si es medio propio, optimízalo: `tools/optimize-media.sh entrada.png assets/exercises/chest/mi-ejercicio`
   (genera `preview.webp`, `animation.gif` y `animation.webm`).
3. Agrega la ficha al archivo de su categoría. Si la categoría estaba "pronto", cambia
   `disponible` a `true` en `index.json` y crea `<categoria>.json`.
4. Revisa que el `id` sea único y que los nombres de músculos existan en `GROUP_SLUGS`.
5. Sube el número de versión de `CACHE` en `sw.js` si agregaste archivos que deban estar
   disponibles sin conexión.

## Comportamiento

- Los datos se cargan **por categoría**; no se descarga toda la biblioteca al abrir la pestaña.
- Los fotogramas se cargan al verlos (`loading="lazy"`) y el Service Worker los guarda para uso sin conexión.
- Los filtros (categoría, equipamiento, dificultad y búsqueda sin tildes) se conservan al abrir y cerrar
  una ficha. El botón "atrás" de Android cierra la ficha y no sale de la app.
- Con cientos de ejercicios por categoría conviene paginar o virtualizar la lista (hoy se dibujan todos).

## Lista de validación (antes de ampliar)

- [ ] **Anatomía:** el músculo principal y los secundarios corresponden al ejercicio.
- [ ] **Biomecánica:** los 3 fotogramas muestran inicio, punto medio y final correctos; los pasos y errores son seguros.
- [ ] **Imágenes:** nítidas en pantalla pequeña; mismo estilo entre ejercicios.
- [ ] **Móvil:** las tarjetas, filtros y ficha se usan bien con una mano en Android.
- [ ] **Rendimiento:** la pestaña abre rápido y no descarga más de lo necesario (revisar la pestaña Red).
- [ ] **Derechos:** cada imagen tiene licencia compatible y su crédito está en Ajustes → Créditos.

## Licencias

- Dibujos: Workout Guide / Everkinetic, CC BY-SA 4.0 (ver `assets/ejercicios/ATTRIBUTION.md`).
- Mapa muscular: react-native-body-highlighter, MIT (ver `assets/body/`).
- Textos de las fichas: propios.
