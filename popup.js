// Scrollopsy - Popup Debug Inspector (Stage 3)
document.addEventListener("DOMContentLoaded", () => {
  const sessionIdEl = document.getElementById("session-id-val");
  const sessionCountEl = document.getElementById("session-count-val");
  const refreshBtn = document.getElementById("refresh-btn");
  const toggleJsonBtn = document.getElementById("toggle-json-btn");
  const clearSessionBtn = document.getElementById("clear-session-btn");
  const jsonViewer = document.getElementById("json-viewer");

  let currentSessionData = null;

  function loadStoredSession() {
    chrome.storage.local.get(["currentSession"], (result) => {
      currentSessionData = result.currentSession;

      if (currentSessionData) {
        sessionIdEl.textContent = currentSessionData.id || "Unknown";
        const count = currentSessionData.shorts ? currentSessionData.shorts.length : 0;
        sessionCountEl.textContent = count;
        jsonViewer.textContent = JSON.stringify(currentSessionData, null, 2);
      } else {
        sessionIdEl.textContent = "None (not started)";
        sessionCountEl.textContent = "0";
        jsonViewer.textContent = "// No session currently in storage.\n// Open YouTube Shorts to record a session.";
      }
    });
  }

  // Refresh button
  refreshBtn.addEventListener("click", () => {
    loadStoredSession();
  });

  // Toggle JSON inspection view
  toggleJsonBtn.addEventListener("click", () => {
    if (jsonViewer.classList.contains("hidden")) {
      jsonViewer.classList.remove("hidden");
      toggleJsonBtn.textContent = "Hide Session JSON";
    } else {
      jsonViewer.classList.add("hidden");
      toggleJsonBtn.textContent = "View Session JSON";
    }
  });

  // Clear session storage
  clearSessionBtn.addEventListener("click", () => {
    if (confirm("Clear the currently stored session data?")) {
      chrome.storage.local.remove(["currentSession"], () => {
        loadStoredSession();
      });
    }
  });

  // Listen for real-time storage changes while popup is open
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.currentSession) {
      loadStoredSession();
    }
  });

  // Initial load
  loadStoredSession();
});
