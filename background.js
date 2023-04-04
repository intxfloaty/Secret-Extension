chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Open the popup window on installation
    const url = chrome.runtime.getURL('popup.html');
    await chrome.tabs.create({ url });
  }
});
