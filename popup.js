document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const statusLabel = document.getElementById('statusLabel');

  // Cargar estado actual de la extensión
  chrome.storage.local.get({ isEnabled: true }, (result) => {
    toggleSwitch.checked = result.isEnabled;
    updateLabel(result.isEnabled);
  });

  // Escuchar cambios en el interruptor
  toggleSwitch.addEventListener('change', () => {
    const isEnabled = toggleSwitch.checked;
    chrome.storage.local.set({ isEnabled: isEnabled }, () => {
      updateLabel(isEnabled);
    });
  });

  function updateLabel(isEnabled) {
    if (isEnabled) {
      statusLabel.textContent = "Activado";
      statusLabel.className = "status-text status-on";
    } else {
      statusLabel.textContent = "Desactivado";
      statusLabel.className = "status-text status-off";
    }
  }
});
