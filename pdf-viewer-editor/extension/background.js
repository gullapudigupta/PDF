console.log('PDF Viewer & Editor - Background Service Worker');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked', tab);
});
