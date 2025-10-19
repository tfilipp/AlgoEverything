const GITHUB_USER = 'tfilipp';
const GITHUB_REPO = 'AlgoEverything';
const GITHUB_BRANCH = 'main';
const GITHUB_RAW = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/`;
const CHECK_INTERVAL = 1000 * 60 * 60; // Проверять раз в час

// Проверка обновлений
async function checkUpdates() {
  try {
    // Получаем текущую версию
    const manifest = chrome.runtime.getManifest();
    const currentVersion = manifest.version;
    
    // Получаем информацию о последней версии
    const response = await fetch(GITHUB_RAW + 'version.json');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Сравниваем версии
    if (compareVersions(data.version, currentVersion) > 0) {
      // Сохраняем информацию об обновлении
      chrome.storage.local.set({
        updateAvailable: true,
        newVersion: data.version,
        changelog: data.changelog
      });
      
      // Показываем значок обновления
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Сравнение версий
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

// Проверяем обновления при запуске
chrome.runtime.onInstalled.addListener(() => {
  checkUpdates();
});

chrome.runtime.onStartup.addListener(() => {
  checkUpdates();
});

// Проверяем периодически
setInterval(checkUpdates, CHECK_INTERVAL);

// Убираем значок при открытии попапа
chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});