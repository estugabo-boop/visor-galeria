# 📷 Mi Galería — PWA educativa

Visor de fotos **100% local**: todo el código está comentado en español para que aprendas cómo funciona.

## ⚠️ Qué hace y qué NO hace

| Hace | No hace |
|------|---------|
| Muestra las fotos que **vos elegís** en el diálogo del sistema | No lee tu galería sin que selecciones archivos |
| Guarda todo en **memoria de la pestaña** | No sube nada a internet (no hay servidor) |
| Se instala como app (PWA) | No se oculta ni corre en segundo plano |

Esto es a propósito: una app que **se oculta + lee la galería en silencio + envía datos** es stalkerware, y no la voy a construir. Todo lo demás sí está acá para que aprendas.

## ▶️ Cómo ejecutarla

Necesitás un servidor local (por el Service Worker). Elegí uno:

```bash
# Opción 1: Python (viene con casi todos los sistemas)
cd visor-galeria
python -m http.server 8000

# Opción 2: Node
npx serve visor-galeria
```

Abrí <http://localhost:8000> y tocá **Elegir fotos**.

> En celular: usá la misma IP de tu PC (`http://192.168.x.x:8000`) desde la misma red Wi-Fi.

## 📚 Qué aprender por archivo

| Archivo | Conceptos |
|---------|-----------|
| `index.html` | Estructura, `input type=file`, ARIA, atributos |
| `style.css` | Variables CSS, **Grid**, `aspect-ratio`, `position: fixed`, responsive |
| `app.js` | **Eventos**, `async/await`, File System Access API, **Object URLs**, recursión, DOM, teclado |
| `sw.js` | **Service Worker**, caché, ciclo de vida (install/activate/fetch) |
| `manifest.json` | Cómo una web se convierte en "app instalable" |

## 🗺️ Sugerencia de estudio

1. Leé `app.js` de arriba a abajo — tiene un índice con Ctrl+F.
2. Cambiá algo visible (el color en `style.css`, el texto del título) y recargá.
3. Borrá una función y mirá qué error da la consola (F12 → pestaña Console).
4. Agregá un desafío: ordenar las fotos por nombre, o un contador de fotos.

## 🔒 Conceptos de seguridad que ilustra

- **Principle of least privilege**: la web solo ve lo que el usuario selecciona.
- **Sandbox del navegador**: no hay acceso a disco sin diálogo del SO.
- **Object URLs efímeras**: la memoria se libera explícitamente.
