chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Open the popup window on installation
    const url = chrome.runtime.getURL('popup.html');
    await chrome.tabs.create({ url });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === 'storeSecret') {
    chrome.storage.local.set({ encryptedSecret: request.encryptedSecret }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error', error: chrome.runtime.lastError });
      } else {
        sendResponse({ status: 'success' });
      }
    });
    return true;
  }

  else if (request.action === 'getSecret') {
    chrome.storage.local.get('encryptedSecret', (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error', error: chrome.runtime.lastError });
      } else {
        sendResponse({ status: 'success', encryptedSecret: result.encryptedSecret });
      }
    });
    return true;
  }

  else if (request.action === 'storePassword') {
    chrome.storage.local.set({ storedPassword: request.password }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error' });
      } else {
        sendResponse({ status: 'success' });
      }
    });
    return true;
  }

  else if (request.action === 'getPassword') {
    chrome.storage.local.get('storedPassword', (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ status: 'error' });
      } else {
        sendResponse({ status: 'success', password: result.storedPassword });
      }
    });
    return true;
  }

  else if (request.action === 'logout') {
    chrome.storage.local.remove('storedPassword');
  }
});

