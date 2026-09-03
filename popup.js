// Scrollopsy - Popup Behavioral Inspector (Stage 5)
document.addEventListener("DOMContentLoaded", () => {
  const sessionIdEl = document.getElementById("session-id-val");
  const sessionCountEl = document.getElementById("session-count-val");
  const uniqueCountEl = document.getElementById("unique-count-val");
  const revisitCountEl = document.getElementById("revisit-count-val");
  const skipCountEl = document.getElementById("skip-count-val");
  const nearCompleteEl = document.getElementById("near-complete-val");
  const avgDurationEl = document.getElementById("avg-duration-val");

  const refreshBtn = document.getElementById("refresh-btn");
  const toggleJsonBtn = document.getElementById("toggle-json-btn");
  const clearSessionBtn = document.getElementById("clear-session-btn");
  const jsonViewer = document.getElementById("json-viewer");

  const defaultActionsEl = document.getElementById("default-actions");
  const confirmClearBoxEl = document.getElementById("confirm-clear-box");
  const confirmYesBtn = document.getElementById("confirm-yes-btn");
  const confirmCancelBtn = document.getElementById("confirm-cancel-btn");

  let currentSessionData = null;

  function loadStoredSession() {
    chrome.storage.local.get(["currentSession"], (result) => {
      currentSessionData = result.currentSession;

      const events = currentSessionData && (currentSessionData.views || currentSessionData.shorts);

      if (currentSessionData && Array.isArray(events) && events.length > 0) {
        sessionIdEl.textContent = currentSessionData.id || "Unknown";

        // Generate or fetch behavioral analysis
        let analysis = currentSessionData.behaviorAnalysis;
        if (!analysis && typeof analyzeSessionBehavior === "function") {
          analysis = analyzeSessionBehavior(currentSessionData);
        }

        if (analysis && analysis.summary) {
          sessionCountEl.textContent = analysis.summary.totalShortsViewed;
          uniqueCountEl.textContent = analysis.summary.uniqueShortsViewed;
          revisitCountEl.textContent = analysis.summary.revisitCount;
          skipCountEl.textContent = analysis.summary.instantSkipCount;
          nearCompleteEl.textContent = analysis.summary.nearCompleteCount;
          avgDurationEl.textContent = `${analysis.summary.averageWatchDurationSeconds}s`;
        } else {
          sessionCountEl.textContent = events.length;
          const uniqueIds = new Set(events.map((e) => e.videoId || e.id));
          uniqueCountEl.textContent = uniqueIds.size;
          revisitCountEl.textContent = Math.max(0, events.length - uniqueIds.size);
        }

        // Display the complete data including the behavioral analysis object
        const displayData = {
          session: currentSessionData,
          behaviorAnalysis: analysis || null
        };

        jsonViewer.textContent = JSON.stringify(displayData, null, 2);
      } else {
        sessionIdEl.textContent = "None (not started)";
        sessionCountEl.textContent = "0";
        if (uniqueCountEl) uniqueCountEl.textContent = "0";
        if (revisitCountEl) revisitCountEl.textContent = "0";
        if (skipCountEl) skipCountEl.textContent = "0";
        if (nearCompleteEl) nearCompleteEl.textContent = "0";
        if (avgDurationEl) avgDurationEl.textContent = "0s";

        jsonViewer.textContent =
          "// No session currently in storage.\n// Open YouTube Shorts to record a session.";
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

  // Show inline confirmation on "Clear Storage"
  clearSessionBtn.addEventListener("click", () => {
    defaultActionsEl.classList.add("hidden");
    confirmClearBoxEl.classList.remove("hidden");
  });

  // Cancel clear
  confirmCancelBtn.addEventListener("click", () => {
    confirmClearBoxEl.classList.add("hidden");
    defaultActionsEl.classList.remove("hidden");
  });

  // Confirmed clear
  confirmYesBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["currentSession"], () => {
      confirmClearBoxEl.classList.add("hidden");
      defaultActionsEl.classList.remove("hidden");
      loadStoredSession();
    });
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
