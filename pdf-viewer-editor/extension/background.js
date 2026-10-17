const extensionApi = globalThis.browser ?? globalThis.chrome;
const viewerMenuId = 'open-pdf-editor';
const usesPromiseApi = globalThis.browser !== undefined;

function openPdfEditor() {
  return extensionApi.tabs.create({
    url: extensionApi.runtime.getURL('viewer/index.html'),
  });
}

function handleDownloadRequest(message, sendResponse) {
  if (!message || !['EXT_DOWNLOAD_PDF', 'EXT_DOWNLOAD_FILE'].includes(message.type)) {
    return false;
  }

  if (!message.dataUrl || !message.fileName) {
    sendResponse({ success: false, error: 'Invalid download payload' });
    return true;
  }
  const mimeType = message.mimeType || 'application/pdf';
  if (!['application/pdf', 'application/json', 'image/png', 'image/jpeg', 'image/svg+xml'].includes(mimeType) ||
    (message.type === 'EXT_DOWNLOAD_PDF' && mimeType !== 'application/pdf')) {
    sendResponse({ success: false, error: 'Unsupported download file type' });
    return true;
  }

  const options = {
    url: message.dataUrl,
    filename: message.fileName,
    saveAs: true,
  };
  if (usesPromiseApi) {
    extensionApi.downloads.download(options).then(
      downloadId => sendResponse({ success: true, filePath: message.fileName, downloadId }),
      error => sendResponse({ success: false, error: String(error) })
    );
  } else {
    extensionApi.downloads.download(options, downloadId => {
      const error = extensionApi.runtime.lastError;
      if (error) {
        sendResponse({ success: false, error: error.message });
        return;
      }

      sendResponse({ success: true, filePath: message.fileName, downloadId });
    });
  }

  return true;
}

async function installContextMenu() {
  const menu = {
    id: viewerMenuId,
    title: 'Open PDF Viewer & Editor',
    contexts: ['page'],
  };
  if (usesPromiseApi) {
    await extensionApi.contextMenus.removeAll();
    await extensionApi.contextMenus.create(menu);
    return;
  }

  await new Promise((resolve, reject) => {
    extensionApi.contextMenus.removeAll(() => {
      const error = extensionApi.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
  await new Promise((resolve, reject) => {
    extensionApi.contextMenus.create(menu, () => {
      const error = extensionApi.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

extensionApi.runtime.onInstalled.addListener(() => {
  void installContextMenu().catch(error =>
    console.error(`Unable to install PDF editor context menu: ${error instanceof Error ? error.message : String(error)}`)
  );
});

extensionApi.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId !== viewerMenuId) return;
  void openPdfEditor().catch(error => console.error(`Unable to open PDF editor: ${error}`));
});

extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  return handleDownloadRequest(message, sendResponse);
});
