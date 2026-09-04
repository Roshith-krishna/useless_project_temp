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
    chrome.storage.local.get(["currentSession", "lastAutopsySession"], (result) => {
      currentSessionData = result.currentSession;
      const isArchived = !currentSessionData && !!result.lastAutopsySession;
      const displaySession = currentSessionData || result.lastAutopsySession;

      const events = displaySession && (displaySession.views || displaySession.shorts);

      if (displaySession && Array.isArray(events) && events.length > 0) {
        sessionIdEl.textContent = isArchived 
          ? `${displaySession.id} (Archived)` 
          : (displaySession.id || "Unknown");

        // Generate or fetch behavioral analysis
        let analysis = displaySession.behaviorAnalysis;
        if (!analysis && typeof analyzeSessionBehavior === "function") {
          analysis = analyzeSessionBehavior(displaySession);
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
          status: isArchived ? "Archived (Active storage auto-cleared for next session)" : "Active Session",
          session: displaySession,
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

  // Confirmed clear (clears both active and archived sessions)
  confirmYesBtn.addEventListener("click", () => {
    chrome.storage.local.remove(["currentSession", "lastAutopsySession"], () => {
      confirmClearBoxEl.classList.add("hidden");
      defaultActionsEl.classList.remove("hidden");
      loadStoredSession();
    });
  });

  // Open Doomscroll Autopsy full-page report
  const openAutopsyBtn = document.getElementById("open-autopsy-btn");
  if (openAutopsyBtn) {
    openAutopsyBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("report.html") });
    });
  }



  // Listen for real-time storage changes while popup is open
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && (changes.currentSession || changes.lastAutopsySession)) {
      loadStoredSession();
    }
  });

  // Initial load
  loadStoredSession();
});
