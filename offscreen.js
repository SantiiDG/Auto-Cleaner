// offscreen.js

import init, { clean_pdf } from './gulagcleaner.js';

let wasmReady = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'process_pdf') {
        processAndDownload(message.url, message.filename);
    }
});

async function processAndDownload(url, originalFilename) {
    try {
        if (!wasmReady) {
            await init(); // Inicia el motor WebAssembly
            wasmReady = true;
        }

        // 1. Descargamos el archivo original directamente a la memoria de la extensión
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} - No se pudo descargar el archivo fuente.`);
        const arrayBuffer = await response.arrayBuffer();
        
        // 2. Ejecutar la limpieza del motor de GulagCleaner
        const pdfBytes = new Uint8Array(arrayBuffer);
        const cleanedBytes = clean_pdf(pdfBytes, false); 
        
        // 3. Crear un nuevo archivo descargable
        const blob = new Blob([cleanedBytes], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        
        // 4. Modificar el nombre original añadiendo _CLEANED
        const nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
        const newFilename = `${nameWithoutExt}_CLEANED.pdf`;
        
        // 5. El documento offscreen no tiene acceso a chrome.downloads
        // Pasamos la URL generada al Service Worker (background.js) para que lo descargue
        chrome.runtime.sendMessage({
            action: 'download_pdf',
            objectUrl: objectUrl,
            filename: newFilename
        });

        // 6. Liberar la URL de memoria tras 30 segundos (evita fuga de memoria)
        setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);

    } catch (error) {
        console.error("Error crítico procesando el PDF:", error);
        // Notificar al background para que avise al usuario
        chrome.runtime.sendMessage({
            action: 'process_error',
            filename: originalFilename,
            error: error.message
        });
    }
}
