/* ============================================================
 * app.js — Toda la lógica de la galería, comentada paso a paso.
 * ============================================================
 *
 * ÍNDICE (Ctrl+F para navegar):
 *  1. Qué es esto y qué NO puede hacer
 *  2. Referencias a los elementos del HTML
 *  3. Elegir fotos (input type="file")
 *  4. Abrir una carpeta completa (File System Access API)
 *  5. Object URLs: cómo el navegador muestra una imagen
 *  6. Dibujar la cuadrícula
 *  7. Lightbox: vista ampliada y teclado
 *  8. Service Worker: instalación como app
 *
 * ------------------------------------------------------------
 *  1) QUÉ ES ESTO Y QUÉ NO PUEDE HACER
 * ------------------------------------------------------------
 * Este archivo corre en TU navegador, en TU dispositivo.
 * Por seguridad, el navegador NO le da a una página web:
 *   - acceso a tu disco sin que elijas archivos en un diálogo,
 *   - acceso a contactos, micrófono, etc., sin permiso tuyo,
 *   - capacidad de leer el historial de otras pestañas.
 * O sea: esta app ve SOLAMENTE las fotos que vos seleccionás,
 * y sólo mientras la pestaña está abierta. No hay ninguna
 * función de "envío" ni de "oclto" — a propósito.
 * ============================================================ */

// "use strict" = modo estricto: el motor te avisa de errores
// comunes (variables sin declarar, etc.) en vez de ignorarlos.
"use strict";

/* ------------------------------------------------------------
 * 2) REFERENCIAS A LOS ELEMENTOS DEL HTML
 * ------------------------------------------------------------
 * document.getElementById() busca un elemento por su id=
 * (los ids están en index.html). Guardamos cada uno en una
 * constante para no repetir la búsqueda cada vez.
 * ------------------------------------------------------------ */
const inputFotos   = document.getElementById("inputFotos");
const inputCarpeta = document.getElementById("inputCarpeta");
const btnFotos     = document.getElementById("btnFotos");
const btnCarpeta   = document.getElementById("btnCarpeta");
const btnLimpiar   = document.getElementById("btnLimpiar");
const grid         = document.getElementById("grid");
const vacio        = document.getElementById("vacio");

const lightbox  = document.getElementById("lightbox");
const imgGrande = document.getElementById("imgGrande");
const btnCerrar = document.getElementById("btnCerrar");
const btnAnterior = document.getElementById("btnAnterior");
const btnSiguiente = document.getElementById("btnSiguiente");
const contador  = document.getElementById("contador");

/**
 * NUESTRO ESTADO EN MEMORIA.
 * Un "array" (lista) con un objeto por cada foto:
 *   { nombre: "IMG_001.jpg", url: "blob:http://..." }
 * Esto vive sólo en la RAM de la pestaña: si recargás la
 * página, se vacía. No se guarda en ningún lado más.
 */
let fotos = [];      // todas las fotos cargadas
let indiceActual = 0; // cuál se está viendo en el lightbox

/* ------------------------------------------------------------
 * 3) ELEGIR FOTOS (input type="file")
 * ------------------------------------------------------------
 * El botón no abre nada por sí mismo: le decimos al input
 * oculto que "haga clic". El navegador (no la web) muestra
 * el diálogo de archivos del sistema operativo.
 * ------------------------------------------------------------ */
btnFotos.addEventListener("click", () => inputFotos.click());

/**
 * El navegador dispara el evento "change" cuando el usuario
 * eligió archivos y confirmó. Recién AHORA tenemos acceso:
 * event.target.files es un FileList con los archivos elegidos.
 */
inputFotos.addEventListener("change", (event) => {
  const archivos = Array.from(event.target.files); // FileList -> Array
  agregarArchivos(archivos);
  // Limpiamos el input para que poder volver a elegir
  // los mismos archivos en el futuro (si no, el navegador
  // piensa que "no cambió nada").
  inputFotos.value = "";
});

/* ------------------------------------------------------------
 * 4) ABRIR UNA CARPETA COMPLETA
 * ------------------------------------------------------------
 * Hay dos caminos:
 *   A) File System Access API (Chrome/Edge modernos):
 *      te deja elegir una carpeta y la app "recuerda" el
 *      permiso mientras la pestaña esté abierta.
 *   B) Fallback: el viejo input[webkitdirectory], que simplemente
 *      entrega todos los archivos de la carpeta elegida.
 * ------------------------------------------------------------ */
btnCarpeta.addEventListener("click", async () => {
  // "async/await" = manejo de operaciones que tardan.
  // showDirectoryPicker() tarda porque espera tu elección.

  if ("showDirectoryPicker" in window) {
    // ---- Camino A: API moderna ----
    try {
      const directorio = await window.showDirectoryPicker();

      // Recorremos la carpeta de forma recursiva
      // (subcarpetas incluidas).
      const archivos = [];
      await recorrerDirectorio(directorio, archivos);
      agregarArchivos(archivos);
    } catch (error) {
      // "AbortError" = el usuario canceló el diálogo. Normal.
      if (error.name !== "AbortError") {
        console.error("No se pudo abrir la carpeta:", error);
        alert("No se pudo leer la carpeta: " + error.message);
      }
    }
  } else {
    // ---- Camino B: fallback clásico ----
    inputCarpeta.click();
  }
});

inputCarpeta.addEventListener("change", (event) => {
  const archivos = Array.from(event.target.files);
  agregarArchivos(archivos);
  inputCarpeta.value = "";
});

/**
 * Recorre un directorio y sus subdirectorios.
 * Un FileSystemDirectoryHandle es como un "mapa" de la carpeta;
 * para leerlo hay que pedir sus entradas una por una,
 * por eso usamos await y un bucle for...of.
 */
async function recorrerDirectorio(directorio, salida, ruta = "") {
  // for await ... of: itera sobre un iterable asíncrono
  // (cada entrada puede tardar en resolverse).
  for await (const entrada of directorio.values()) {
    const nuevaRuta = ruta + entrada.name;
    if (entrada.kind === "directory") {
      // Es una subcarpeta -> la recorremos también (recursión).
      await recorrerDirectorio(entrada, salida, nuevaRuta + "/");
    } else {
      // Es un archivo -> lo convertimos a File y lo agregamos.
      const archivo = await entrada.getFile();
      // Guardamos la ruta como "nombre" por si querés verla.
      Object.defineProperty(archivo, "rutaCompleta", { value: nuevaRuta });
      salida.push(archivo);
    }
  }
}

/* ------------------------------------------------------------
 * 5) AGREGAR ARCHIVOS + OBJECT URLs
 * ------------------------------------------------------------
 * agregarArchivos() filtra solo imágenes y crea una "Object URL".
 *
 * ¿Qué es un Object URL?
 *  Es un enlace temporal tipo "blob:http://localhost:3000/uuid"
 *  que apunta a los bytes del archivo EN MEMORIA. El navegador
 *  sabe mostrar <img src="blob:..."> igual que con una URL web.
 *  Importante: hay que "revocarlo" (URL.revokeObjectURL) cuando
 *  ya no lo usamos, si no la memoria se fuga y la pestaña
 *  se pone pesada.
 * ------------------------------------------------------------ */
function agregarArchivos(archivos) {
  // filter: nos quedamos sólo con tipos image/*
  const imagenes = archivos.filter(f => f.type.startsWith("image/"));

  if (imagenes.length === 0) {
    alert("No se encontraron imágenes en la selección.");
    return;
  }

  for (const archivo of imagenes) {
    fotos.push({
      nombre: archivo.rutaCompleta || archivo.name,
      url: URL.createObjectURL(archivo), // crea el enlace temporal
    });
  }

  // Mostramos la cuadrícula y escondemos el mensaje vacío.
  vacio.hidden = fotos.length > 0;
  btnLimpiar.hidden = fotos.length === 0;
  dibujarGrid();
}

/* ------------------------------------------------------------
 * 6) DIBUJAR LA CUADRÍCULA
 * ------------------------------------------------------------ */
function dibujarGrid() {
  // Primero limpiamos lo que hubiera (para no duplicar).
  // replaceChildren() es más rápido que innerHTML = "".
  grid.replaceChildren();

  fotos.forEach((foto, i) => {
    // document.createElement crea un elemento <img> en memoria.
    const img = document.createElement("img");
    img.src = foto.url;
    img.alt = foto.nombre;
    img.loading = "lazy"; // el navegador carga la miniatura
                          // sólo cuando está cerca de la pantalla
    img.title = foto.nombre; // texto al pasar el mouse

    // addEventListener("click", ...): cuando tocás la miniatura,
    // abrimos el lightbox en esa posición (índice i).
    img.addEventListener("click", () => abrirLightbox(i));

    grid.appendChild(img); // lo agregamos al documento
  });
}

// Botón "Limpiar": libera las Object URLs y vacía el estado.
btnLimpiar.addEventListener("click", () => {
  for (const foto of fotos) URL.revokeObjectURL(foto.url);
  fotos = [];
  grid.replaceChildren();
  vacio.hidden = false;
  btnLimpiar.hidden = true;
});

/* ------------------------------------------------------------
 * 7) LIGHTBOX: vista ampliada y navegación con teclado
 * ------------------------------------------------------------ */
function abrirLightbox(indice) {
  indiceActual = indice;
  actualizarLightbox();
  lightbox.hidden = false; // lo mostramos (quito el [hidden])
}

function actualizarLightbox() {
  const foto = fotos[indiceActual];
  if (!foto) return;
  imgGrande.src = foto.url;
  imgGrande.alt = foto.nombre;
  // Template string: `...${valor}...` inserta valores en texto.
  contador.textContent = `${indiceActual + 1} / ${fotos.length}`;
}

function cerrarLightbox() {
  lightbox.hidden = true;
  imgGrande.src = ""; // soltamos la imagen grande de memoria
}

function navegar(paso) {
  // % (módulo) = "resto de la división". Sirve para "dar vueltas":
  // si pasamos del final, volvemos al principio, y viceversa.
  indiceActual = (indiceActual + paso + fotos.length) % fotos.length;
  actualizarLightbox();
}

btnCerrar.addEventListener("click", cerrarLightbox);
btnAnterior.addEventListener("click", () => navegar(-1));
btnSiguiente.addEventListener("click", () => navegar(1));

// Cerrar si tocamos fuera de la imagen (en el fondo negro).
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) cerrarLightbox();
});

/**
 * Navegación con teclado.
 * addEventListener("keydown", ...) captura teclas.
 * event.key dice cuál se apretó.
 */
document.addEventListener("keydown", (event) => {
  if (lightbox.hidden) return; // si el lightbox está cerrado, nada
  switch (event.key) {
    case "Escape":   cerrarLightbox();   break;
    case "ArrowLeft":  navegar(-1);      break;
    case "ArrowRight": navegar(1);       break;
  }
});

/* ------------------------------------------------------------
 * 8) SERVICE WORKER (instalable como app)
 * ------------------------------------------------------------
 * Un Service Worker es un script que corre en segundo plano
 * del navegador, con un rol: cachear los archivos de la app
 * para que abra sin internet (y para que Chrome la ofrezca
 * "Instalar"). NO tiene acceso a tus fotos ni a tu disco:
 * sólo guarda los archivos de la interfaz (html/css/js).
 *
 * Se registra sólo si estamos en http(s) o localhost — si
 * abrís index.html con doble clic (file://), este bloque
 * falla silenciosamente y la app igual funciona.
 * ------------------------------------------------------------ */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js")
      .then(() => console.log("Service Worker registrado ✔"))
      .catch(err => console.log("Sin Service Worker:", err));
  });
}
