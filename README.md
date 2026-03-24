#  Auto-Cleaner PDF 
![Auto-Cleaner PDF Icon](icon128.png)

Una extensión de Google Chrome (Manifest V3) que intercepta automáticamente las descargas de PDFs procedentes de Wuolah, elimina la publicidad incrustada utilizando el motor **GulagCleaner** (ejecutado de forma nativa en el navegador mediante WebAssembly) y guarda el archivo resultante completamente limpio.

## ✨ Características Principales

- 🛡️ **Procesamiento 100% Local**: La limpieza del PDF se hace enteramente en la memoria de tu navegador gracias a **WebAssembly (WASM)**. Tus documentos no se envían a ningún servidor externo, garantizando máxima privacidad y velocidad.
- ⚡ **Automático e Invisible**: Simplemente descarga un documento de Wuolah como lo harías normalmente. La extensión lo intercepta silenciosamente, lo procesa en segundo plano y te entrega la versión limpia.
- 🔔 **Notificaciones de Estado**: Te avisará cuando la limpieza comience y cuando el archivo haya sido descargado con éxito (o si ocurre algún error inesperado).
- 🗂️ **Renombrado Inteligente**: El archivo final se descarga directamente añadiendo el sufijo `_CLEANED` al nombre original, para evitar colisiones y que sepas siempre cuál es la versión buena.

## ⚙️ Arquitectura (Manifest V3)

Desarrollar extensiones en Manifest V3 presenta retos específicos para tareas pesadas y ejecución de código binario. Esta extensión resuelve el problema mediante una arquitectura dividida:

1. **El Interceptor (`background.js`)**: 
   Un *Service Worker* ligero que escucha pasivamente todas las descargas (`chrome.downloads.onDeterminingFilename`). Si detecta un PDF de Wuolah, cancela la descarga nativa controlada por Chrome y delega la tarea creando un entorno Offscreen. También es responsable de crear las notificaciones y guardar el archivo limpio final.

2. **El Procesador (`offscreen.html` & `offscreen.js`)**: 
   Un documento oculto temporal que se levanta solo cuando hace falta. Tiene permisos completos para ejecutar módulos pesados sin tiempos de expiración estrictos. Aquí es donde se inicializa WebAssembly, se descarga el PDF original directamente a la memoria (`ArrayBuffer`), se limpia, y se devuelve como un Blob URL al Service Worker.

3. **El Motor WASM (`gulagcleaner_bg.wasm`)**: 
   El núcleo escrito en **Rust** de GulagCleaner, compilado a WebAssembly. Manipula la estructura del PDF a nivel de bytes de forma extraordinariamente eficiente.

## 🚀 Instalación Rápida (Cargar Descomprimida)

Para probar e instalar la extensión en tu propio navegador:

1. Clona este repositorio o descarga el código fuente y extráelo en una carpeta.
2. Abre Google Chrome y escribe en la barra de direcciones: `chrome://extensions/`
3. Activa el **Modo de desarrollador** (es un interruptor en la esquina superior derecha).
4. Haz clic en el botón **Cargar descomprimida** (*Load unpacked*), arriba a la izquierda.
5. Selecciona la carpeta del proyecto.
6. ¡Listo! Verás el icono de la extensión activarse y funcionará en segundo plano durante tus próximas descargas.

---
*Hecho para limpiar apuntes con la eficiencia de un buen gulag.*
