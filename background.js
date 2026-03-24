// === ESTADO DE LA EXTENSIÓN ===
let isExtensionEnabled = true;

chrome.storage.local.get({ isEnabled: true }, (result) => {
  isExtensionEnabled = result.isEnabled;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.isEnabled !== undefined) {
    isExtensionEnabled = changes.isEnabled.newValue;
  }
});

// Diccionario temporal para guardar los nombres de los blobs (indexado por downloadId)
const pendingDownloads = {};

// === UTILIDAD: Notificaciones al usuario ===
function notify(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: title,
    message: message
  });
}

// === INTERCEPTOR DE DESCARGAS ===
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  // Si la extensión está desactivada, ignoramos todas las descargas
  if (!isExtensionEnabled) {
    suggest();
    return;
  }

  // 1. Si es nuestro PDF ya limpio, forzamos su nombre usando el downloadId
  if (pendingDownloads[item.id]) {
    suggest({ filename: pendingDownloads[item.id] });
    delete pendingDownloads[item.id];
    return;
  }

  // Obtenemos solo el nombre base del archivo
  const baseName = item.filename.split(/[/\\]/).pop().toLowerCase();
  
  // Condición: Es PDF, empieza por wuolah y NO contiene "cleaned" (anti-bucle infinito)
  if (baseName.endsWith('.pdf') && baseName.startsWith('wuolah') && !baseName.includes('cleaned')) {
    
    // Guardamos la URL final ANTES de cancelar (puede expirar tras la cancelación)
    const downloadUrl = item.finalUrl || item.url;

    // Cancelamos la descarga original controlada por Chrome
    chrome.downloads.cancel(item.id, async () => {
      console.log("Descarga original cancelada. Pasando a GulagCleaner...");
      notify('Procesando PDF', `Limpiando ${baseName}...`);
      
      // Iniciamos el entorno para procesar archivos locales
      await setupOffscreenDocument('offscreen.html');
      
      // Enviamos la orden de proceso junto a la URL de descarga original
      chrome.runtime.sendMessage({
        action: 'process_pdf',
        url: downloadUrl,
        filename: baseName
      });
    });
    
    return true; // Indicamos que hemos interceptado la lógica asíncrona
  }
  
  suggest(); // Deja continuar las descargas normales
});

// === GESTIÓN DEL DOCUMENTO OFFSCREEN ===
let creating; 
async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) return;

  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ['BLOBS'],
      justification: 'Procesar grandes archivos PDF mediante WASM y generar una nueva descarga',
    });
    await creating;
    creating = null;
  }
}

// === RECEPTOR DE MENSAJES DESDE OFFSCREEN ===
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download_pdf') {
    // Iniciamos la descarga del PDF limpio
    chrome.downloads.download({
      url: message.objectUrl,
      filename: message.filename,
      saveAs: false
    }, (downloadId) => {
      if (downloadId) {
        // Guardamos el nombre deseado indexado por downloadId (evita race conditions)
        pendingDownloads[downloadId] = message.filename;
        notify('PDF Limpio ✅', `${message.filename} descargado correctamente.`);
      }
    });
  }

  if (message.action === 'process_error') {
    notify('Error ❌', `No se pudo limpiar ${message.filename}: ${message.error}`);
  }
});
