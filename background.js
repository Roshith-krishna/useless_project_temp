// Scrollopsy - Service Worker (Background Script)
console.log("[Scrollopsy] Service worker initialized.");

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[Scrollopsy] Extension installed / updated. Reason:", details.reason);
});
