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
    
    console.log('Current version:', currentVersion);
    
    // Получаем информацию о последней версии с GitHub
    const response = await fetch(VERSION_URL);
    
    if (response.status === 404) {
      console.log('Version file not found on GitHub yet');
      chrome.storage.local.remove(['updateAvailable', 'newVersion', 'changelog']);
      chrome.action.setBadgeText({ text: "" });
      return;
    }
    
    if (!response.ok) {
      console.log('Failed to fetch version info:', response.status);
      return;
    }
    
    const data = await response.json();
    console.log('GitHub version:', data.version);
    
    // Проверяем что данные валидны
    if (!data.version) {
      console.log('Invalid version data');
      return;
    }
    
    // Приводим версии к одному формату (строки)
    const cleanCurrentVersion = currentVersion.trim();
    const cleanGitHubVersion = data.version.trim();
    
    // Точное сравнение
    if (cleanCurrentVersion !== cleanGitHubVersion) {
      console.log(`Update available: ${cleanCurrentVersion} → ${cleanGitHubVersion}`);
      
      // Сохраняем информацию об обновлении только если версии действительно разные
      chrome.storage.local.set({
        updateAvailable: true,
        newVersion: cleanGitHubVersion,
        changelog: data.changelog || 'Доступно обновление'
      });
      
      // Показываем значок обновления
      chrome.action.setBadgeText({ text: "↑" });
      chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });
    } else {
      console.log('Version is up to date');
      // Убираем информацию об обновлении если версии совпадают
      chrome.storage.local.remove(['updateAvailable', 'newVersion', 'changelog']);
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    console.log('Update check error:', error.message);
  }
}

// Проверяем обновления при установке/обновлении расширения
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated, checking for updates...');
  checkUpdates();
});

// Проверяем при запуске браузера
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser started, checking for updates...');
  checkUpdates();
});

// Проверяем периодически
setInterval(checkUpdates, CHECK_INTERVAL);

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openGitHub') {
    chrome.tabs.create({ url: REPO_URL });
  }
  
  if (request.action === 'checkUpdateNow') {
    checkUpdates();
  }
  
  if (request.action === 'clearUpdateStatus') {
    chrome.storage.local.remove(['updateAvailable', 'newVersion', 'changelog']);
    chrome.action.setBadgeText({ text: "" });
  }
});