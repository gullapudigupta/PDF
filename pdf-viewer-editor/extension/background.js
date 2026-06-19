console.log('PDF Viewer & Editor - Background Service Worker');

function handleDownloadRequest(message, sendResponse) {
  if (!message || message.type !== 'EXT_DOWNLOAD_PDF') {
    return false;
  }

  if (!message.dataUrl || !message.fileName) {
    sendResponse({ success: false, error: 'Invalid download payload' });
    return true;
  }

  chrome.downloads.download(
    {
      url: message.dataUrl,
      filename: message.fileName,
      saveAs: true,
    },
    (downloadId) => {
      const error = chrome.runtime.lastError;
      if (error) {
        sendResponse({ success: false, error: error.message });
        return;
      }

      sendResponse({ success: true, filePath: message.fileName, downloadId });
    }
  );

  return true;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

if (chrome.action?.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked', tab);
  });
} else if (chrome.browserAction?.onClicked) {
  chrome.browserAction.onClicked.addListener((tab) => {
    console.log('Extension icon clicked', tab);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return handleDownloadRequest(message, sendResponse);
});
