const openButton = document.getElementById('openPdf');
const status = document.getElementById('status');

openButton.addEventListener('click', async () => {
  const extensionApi = globalThis.browser ?? globalThis.chrome;
  if (!extensionApi?.runtime?.getURL || !extensionApi?.tabs?.create) {
    status.textContent = 'The browser extension API is unavailable.';
    return;
  }

  try {
    await extensionApi.tabs.create({
      url: extensionApi.runtime.getURL('viewer/index.html'),
    });
    window.close();
  } catch (error) {
    status.textContent = `Unable to open the PDF editor: ${error instanceof Error ? error.message : String(error)}`;
  }
});
