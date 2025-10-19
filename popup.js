let selectedGoogleFont = null;
let googleFonts = [];
let apiKey = '';
let isAlgoritmika = false;

// Проверка текущего домена
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0].url;
  isAlgoritmika = url && url.match(/https?:\/\/[^\/]*algoritmika\.org/);
  
  if (!isAlgoritmika) {
    // Показываем сообщение о неподдерживаемом домене
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('wrong-domain').style.display = 'flex';
  } else {
    // Инициализация обычного функционала
    initializeApp();
    // Проверка наличия обновления
    checkForUpdates();
  }
});

// Проверка наличия обновления
function checkForUpdates() {
  chrome.storage.local.get(['updateAvailable', 'newVersion', 'changelog'], (result) => {
    if (result.updateAvailable) {
      showUpdateNotification(result.newVersion, result.changelog);
    }
  });
}

function showUpdateNotification(version, changelog) {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <h2>→ Обновление ${version}</h2>
      <pre class="changelog">${changelog}</pre>
      <button class="update-button">↓ Скачать с GitHub</button>
      <button class="close-update">✕</button>
    </div>
  `;
  
  notification.querySelector('.update-button').addEventListener('click', () => {
    // Открываем GitHub репозиторий
    chrome.runtime.sendMessage({action: 'openGitHub'});
    // Убираем бейдж
    chrome.action.setBadgeText({ text: "" });
    notification.remove();
    window.close();
  });
  
  notification.querySelector('.close-update').addEventListener('click', () => {
    notification.remove();
    // Не убираем бейдж, чтобы пользователь знал об обновлении
  });
  
  document.body.appendChild(notification);
}

function initializeApp() {
  // Загрузка API ключа
  fetch('.apitkn')
    .then(r => r.text())
    .then(key => {
      apiKey = key.trim();
      loadGoogleFonts();
    })
    .catch(() => console.error('API key not found'));

  // Переключение вкладок
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

  // Загрузка состояния переключателя
  chrome.storage.local.get(['enabled'], (result) => {
    document.getElementById('toggle-switch').checked = result.enabled || false;
  });

  // Сохранение состояния переключателя
  document.getElementById('toggle-switch').addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ enabled });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle', enabled }, (response) => {
        // Игнорируем ошибки если контент скрипт не загружен
        if (chrome.runtime.lastError) {
          console.log('Content script not loaded');
        }
      });
    });
  });

  // Обработка загрузки файла - автоприменение
  document.getElementById('font-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
      const fontData = event.target.result;
      const fontName = file.name.split('.')[0];
      
      chrome.storage.local.set({
        fontType: 'file',
        fontData: fontData,
        fontName: fontName
      });
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'applyFont',
          type: 'file',
          data: fontData,
          name: fontName
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Content script not loaded');
          }
        });
        
        // Перезагрузка страницы после применения
        setTimeout(() => {
          chrome.tabs.reload(tabs[0].id);
          window.close();
        }, 100);
      });
    };
    reader.readAsDataURL(file);
  });

  // Поиск шрифтов
  document.getElementById('search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = googleFonts.filter(f => 
      f.family.toLowerCase().includes(query)
    );
    displayFonts(filtered);
  });
}

// Загрузка Google Fonts
async function loadGoogleFonts() {
  if (!apiKey) return;
  
  try {
    const response = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`);
    const data = await response.json();
    googleFonts = data.items || [];
    
    displayFonts(googleFonts);
  } catch (error) {
    console.error('Error loading fonts:', error);
    document.querySelector('.loading').textContent = 'Ошибка загрузки';
  }
}

// Отображение шрифтов
function displayFonts(fonts) {
  const listEl = document.getElementById('fonts-list');
  listEl.innerHTML = '';
  
  fonts.slice(0, 50).forEach(font => {
    const item = document.createElement('div');
    item.className = 'font-item';
    item.textContent = font.family;
    item.dataset.font = font.family;
    
    // Загружаем и применяем шрифт для превью
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css?family=${font.family.replace(/ /g, '+')}`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    item.style.fontFamily = `'${font.family}', sans-serif`;
    
    item.addEventListener('click', () => {
      document.querySelectorAll('.font-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      selectedGoogleFont = font.family;
      
      // Автоприменение при выборе
      applyGoogleFont();
    });
    
    listEl.appendChild(item);
  });
}

// Применение Google Font
function applyGoogleFont() {
  if (!selectedGoogleFont) return;
  
  chrome.storage.local.set({
    fontType: 'google',
    fontName: selectedGoogleFont
  });
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'applyFont',
      type: 'google',
      name: selectedGoogleFont
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not loaded');
      }
    });
    
    // Перезагрузка страницы после применения
    setTimeout(() => {
      chrome.tabs.reload(tabs[0].id);
      window.close();
    }, 100);
  });
}