/* ============================================================
 * sw.js — Service Worker
 * ------------------------------------------------------------
 * Su única función: cachear los ARCHIVOS DE LA INTERFAZ
 * (html, css, js, icono) para que la app abra sin conexión.
 *
 * Aclaración importante: este script NUNCA toca tus fotos.
 * Las fotos se procesan en la pestaña (app.js), no acá.
 * ============================================================ */

const CACHE = "galeria-v1";

// Lista de archivos que componen la app.
const ARCHIVOS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg",
];

// "install": se dispara cuando el navegador registra el SW.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS))
  );
});

// "activate": limpiamos cachés viejas si cambiamos la versión.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(
        claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))
      )
    )
  );
});

// "fetch": redirigimos cada pedido de red.
// Estrategia "cache first": si está en caché, responde sin internet.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((respuesta) => respuesta || fetch(event.request))
  );
});
