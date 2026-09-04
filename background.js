// Scrollopsy - Service Worker (Background Script)
// Manages automated session lifecycle and triggers the Doomscroll Autopsy on close.

console.log("[Scrollopsy] Service worker initialized.");

// Map of active Shorts tabs: tabId -> { windowId, lastActiveTime, lastVideoId }
const activeShortsTabs = new Map();

// Debounce state to prevent duplicate report popups
let lastAutopsyTriggerTime = 0;
let lastPoppedSessionId = null;

chrome.runtime.onInstalled.addListener((details) => {
  console.log("[Scrollopsy] Extension installed / updated. Reason:", details.reason);
});

/**
 * Triggers the automatic generation and popup of the Doomscroll Autopsy Report.
 * Reads currentSession from storage, validates that it contains views,
 * and launches report.html with debounce protection.
 */
function triggerAutoAutopsy(sourceTabId = null, reason = "tab_closed") {
  const now = Date.now();
  if (now - lastAutopsyTriggerTime < 2500) {
    console.log(`[Scrollopsy BG] Autopsy trigger debounced (reason: ${reason})`);
    return;
  }

  chrome.storage.local.get(["currentSession"], (res) => {
    const session = res.currentSession;
    const views = session && (session.views || session.shorts);

    if (!session || !Array.isArray(views) || views.length === 0) {
      console.log(`[Scrollopsy BG] No active session views to autopsy (reason: ${reason}).`);
      return;
    }

    if (session.id === lastPoppedSessionId && now - lastAutopsyTriggerTime < 5000) {
      console.log(`[Scrollopsy BG] Autopsy already popped for session ${session.id}.`);
      return;
    }

    lastAutopsyTriggerTime = now;
    lastPoppedSessionId = session.id;

    console.log(
      `%c[SCROLLOPSY BG]%c AUTOPSY TRIGGERED: Session [${session.id}] with ${views.length} views (reason: ${reason})`,
      "color: #ff4b4b; font-weight: bold;",
      "color: #00e676; font-weight: bold;"
    );

    const reportUrl = chrome.runtime.getURL("report.html?auto=true");

    chrome.windows.getAll({ populate: false }, (windows) => {
      if (windows && windows.length > 0) {
        chrome.tabs.create({ url: reportUrl, active: true }, (tab) => {
          console.log("[Scrollopsy BG] Opened autopsy report tab:", tab ? tab.id : "unknown");
        });
      } else {
        chrome.windows.create({ url: reportUrl, focused: true }, (win) => {
          console.log("[Scrollopsy BG] Opened autopsy report window:", win ? win.id : "unknown");
        });
      }
    });
  });
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  const tabId = sender.tab ? sender.tab.id : null;
  const windowId = sender.tab ? sender.tab.windowId : null;

  switch (message.type) {
    case "SHORTS_SESSION_ACTIVE":
      if (tabId) {
        activeShortsTabs.set(tabId, {
          windowId: windowId,
          lastActiveTime: Date.now(),
          videoId: message.videoId || null
        });
        console.log(`[Scrollopsy BG] Active Shorts tab registered: tab ${tabId}`);
      }
      sendResponse({ status: "registered" });
      break;

    case "SHORTS_NAVIGATED_AWAY":
      if (tabId && activeShortsTabs.has(tabId)) {
        activeShortsTabs.delete(tabId);
        console.log(`[Scrollopsy BG] Tab ${tabId} navigated away from Shorts`);
        triggerAutoAutopsy(tabId, "navigated_away");
      }
      sendResponse({ status: "acknowledged" });
      break;

    case "SHORTS_CLOSING":
      if (tabId && activeShortsTabs.has(tabId)) {
        activeShortsTabs.delete(tabId);
        console.log(`[Scrollopsy BG] Tab ${tabId} closing reported by content script`);
        triggerAutoAutopsy(tabId, "page_closing");
      }
      sendResponse({ status: "acknowledged" });
      break;

    case "MANUAL_TRIGGER_AUTOPSY":
      triggerAutoAutopsy(tabId, "manual_request");
      sendResponse({ status: "triggered" });
      break;

    default:
      break;
  }
  return true;
});

// Detect when a browser tab is closed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (activeShortsTabs.has(tabId)) {
    console.log(`[Scrollopsy BG] Shorts tab closed: ${tabId}`);
    activeShortsTabs.delete(tabId);
    triggerAutoAutopsy(tabId, "tab_closed");
  }
});

// Detect when a browser window is closed
chrome.windows.onRemoved.addListener((windowId) => {
  let matched = false;
  for (const [tabId, info] of activeShortsTabs.entries()) {
    if (info.windowId === windowId) {
      activeShortsTabs.delete(tabId);
      matched = true;
    }
  }
  if (matched) {
    console.log(`[Scrollopsy BG] Shorts window closed: ${windowId}`);
    triggerAutoAutopsy(null, "window_closed");
  }
});
