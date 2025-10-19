let currentFontStyle = null;
let enabled = false;

// Загрузка сохраненных настроек
chrome.storage.local.get(['enabled', 'fontType', 'fontData', 'fontName'], (result) => {
  enabled = result.enabled || false;
  
  if (enabled && result.fontType) {
    if (result.fontType === 'file' && result.fontData) {
      applyFileFont(result.fontData, result.fontName);
    } else if (result.fontType === 'google' && result.fontName) {
      applyGoogleFont(result.fontName);
    }
  }
});

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    enabled = request.enabled;
    if (!enabled) {
      removeCustomFont();
    } else {
      chrome.storage.local.get(['fontType', 'fontData', 'fontName'], (result) => {
        if (result.fontType === 'file' && result.fontData) {
          applyFileFont(result.fontData, result.fontName);
        } else if (result.fontType === 'google' && result.fontName) {
          applyGoogleFont(result.fontName);
        }
      });
    }
  } else if (request.action === 'applyFont' && enabled) {
    if (request.type === 'file') {
      applyFileFont(request.data, request.name);
    } else if (request.type === 'google') {
      applyGoogleFont(request.name);
    }
  }
});

function applyFileFont(fontData, fontName) {
  removeCustomFont();
  
  const style = document.createElement('style');
  style.id = 'algo-everything-font';
  style.textContent = `
    @font-face {
      font-family: 'AlgoCustom';
      src: url('${fontData}');
    }
    * {
      font-family: 'AlgoCustom', sans-serif !important;
    }
  `;
  document.head.appendChild(style);
  currentFontStyle = style;
}

function applyGoogleFont(fontName) {
  removeCustomFont();
  
  const link = document.createElement('link');
  link.id = 'algo-everything-font-link';
  link.href = `https://fonts.googleapis.com/css?family=${fontName.replace(/ /g, '+')}`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  
  const style = document.createElement('style');
  style.id = 'algo-everything-font';
  style.textContent = `
    * {
      font-family: '${fontName}', sans-serif !important;
    }
  `;
  document.head.appendChild(style);
  currentFontStyle = style;
}

function removeCustomFont() {
  const existingStyle = document.getElementById('algo-everything-font');
  const existingLink = document.getElementById('algo-everything-font-link');
  
  if (existingStyle) existingStyle.remove();
  if (existingLink) existingLink.remove();
  
  currentFontStyle = null;
}