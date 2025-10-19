const GITHUB_USER = 'tfilipp';
const GITHUB_REPO = 'AlgoEverything';
const GITHUB_BRANCH = 'main';
const VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/version.json`;
const REPO_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}`;
const CHECK_INTERVAL = 1000 * 60 * 60; // Проверять раз в час

// Проверка обновлений
async function checkUpdates() {
  try {
    // Получаем текущую версию из манифеста
    const manifest = chrome.runtime.getManifest();
    const currentVersion = manifest.version;
    
    // Получаем информацию о последней версии с GitHub
    const response = await fetch(VERSION_URL);
    
    if (!response.ok) {
      console.error('Failed to fetch version info:', response.status);
      return;
    }
    
    const data = await response.json();
    
    // Сравниваем версии
    if (compareVersions(data.version, currentVersion) > 0) {
      // Сохраняем информацию об обновлении
      chrome.storage.local.set({
        updateAvailable: true,
        newVersion: data.version,
        changelog: data.changelog || 'Доступно обновление'
      });
      
      // Показываем значок обновления
      chrome.action.setBadgeText({ text: "↑" });
      chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });
    } else {
      // Убираем информацию об обновлении если версия актуальная
      chrome.storage.local.remove(['updateAvailable', 'newVersion', 'changelog']);
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Сравнение версий (0.1 < 0.2, 0.1.1 < 0.2.0, etc)
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

// Проверяем обновления при установке/обновлении расширения
chrome.runtime.onInstalled.addListener(() => {
  checkUpdates();
});

// Проверяем при запуске браузера
chrome.runtime.onStartup.addListener(() => {
  checkUpdates();
});

// Проверяем периодически
setInterval(checkUpdates, CHECK_INTERVAL);

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openGitHub') {
    chrome.tabs.create({ url: REPO_URL });
  }
});