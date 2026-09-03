// Scrollopsy - YouTube Shorts Tracker with Time Tracking (Stage 4)
console.log(
  "%c[SCROLLOPSY]%c Stage 4 YouTube Shorts Tracker Active (Time Tracking Enabled).",
  "color: #ff4b4b; font-weight: bold;",
  "color: #00e676; font-weight: bold;"
);

/**
 * TIMING ACCURACY & MEASUREMENT LIMITATIONS:
 * -----------------------------------------
 * 1. Screen / Route Attention Proxy:
 *    Scrollopsy records the wall-clock time that a Short's URL is actively rendered
 *    while the browser tab is in the 'visible' state. This is an active screen presence proxy
 *    and does NOT guarantee the user's actual cognitive attention (e.g. user looking away from
 *    screen, video paused, or video buffering).
 * 2. Background Tab & CPU Throttling:
 *    Modern Chromium browsers aggressively suspend or throttle JavaScript timers and rendering
 *    for backgrounded tabs or minimized windows. We explicitly mitigate inflated durations
 *    by listening to the Page Visibility API ('visibilitychange') and closing the active Short
 *    observation immediately when the tab is hidden.
 * 3. Page Teardown / Unload Constraints:
 *    When a tab is closed or the user navigates away, 'pagehide' / 'beforeunload' events are fired.
 *    Because Chrome Manifest V3 service workers and asynchronous chrome.storage calls may not be
 *    guaranteed to finish during rapid process destruction, duration metrics calculated at unload
 *    are dispatched on a best-effort basis.
 * 4. Wall-Clock Jitter:
 *    Timestamps (startedAt, endedAt) are based on client system clock (new Date().toISOString()),
 *    while durations are calculated via Date.now() millisecond differences.
 */

let activeShortId = null;
let activeUrl = null;
let isOnShortsPage = false;

// Active Short Timing State
let currentTiming = null;

/**
 * Extracts unique Short ID from a YouTube Shorts URL.
 * e.g., https://www.youtube.com/shorts/abc123XYZ -> "abc123XYZ"
 */
function extractShortId(urlStr) {
  try {
    const urlObj = new URL(urlStr);
    if (urlObj.pathname.startsWith("/shorts/")) {
      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        return parts[1];
      }
    }
  } catch (e) {
    const match = urlStr.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Central logger for Scrollopsy events.
 */
function logScrollopsy(tag, message, details = null) {
  const prefixStyle = "color: #ff4b4b; font-weight: bold;";
  let tagStyle = "color: #00e676; font-weight: bold;";

  if (tag === "DUPLICATE IGNORED") {
    tagStyle = "color: #ffb703; font-weight: bold;";
  } else if (tag === "NAVIGATION DETECTED") {
    tagStyle = "color: #4cc9f0; font-weight: bold;";
  } else if (tag === "SESSION RECORDED" || tag === "SESSION CREATED") {
    tagStyle = "color: #b388ff; font-weight: bold;";
  } else if (tag === "SHORT START") {
    tagStyle = "color: #06d6a0; font-weight: bold;";
  } else if (tag === "SHORT END") {
    tagStyle = "color: #ef476f; font-weight: bold;";
  } else if (tag === "DURATION") {
    tagStyle = "color: #ffd166; font-weight: bold;";
  }

  if (details) {
    console.log(
      `%c[SCROLLOPSY]%c ${tag}%c - ${message}`,
      prefixStyle,
      tagStyle,
      "color: #e0e0e0; font-weight: normal;",
      details
    );
  } else {
    console.log(
      `%c[SCROLLOPSY]%c ${tag}%c - ${message}`,
      prefixStyle,
      tagStyle,
      "color: #e0e0e0; font-weight: normal;"
    );
  }
}

/**
 * Gets the existing active session from chrome.storage.local or creates a new one.
 */
function getOrCreateActiveSession(callback) {
  chrome.storage.local.get(["currentSession"], (result) => {
    let session = result.currentSession;
    if (!session || session.endedAt !== null) {
      session = {
        id: "session_" + Date.now(),
        startedAt: new Date().toISOString(),
        endedAt: null,
        shorts: []
      };
      chrome.storage.local.set({ currentSession: session }, () => {
        logScrollopsy(
          "SESSION CREATED",
          `Automatically created active session [${session.id}]`,
          session
        );
        if (callback) callback(session);
      });
    } else {
      if (callback) callback(session);
    }
  });
}

/**
 * Saves a newly started Short into the active session in local storage.
 */
function recordShortToSession(shortRecord) {
  getOrCreateActiveSession((session) => {
    session.shorts.push(shortRecord);
    chrome.storage.local.set({ currentSession: session }, () => {
      logScrollopsy(
        "SESSION RECORDED",
        `Short [${shortRecord.id}] stored in session [${session.id}] (Total shorts: ${session.shorts.length})`
      );
    });
  });
}

/**
 * Updates a closed Short in chrome.storage.local with its endedAt, durationMs, and durationSeconds.
 */
function updateShortEndedInStorage(shortId, endedAt, durationMs, durationSeconds) {
  chrome.storage.local.get(["currentSession"], (result) => {
    const session = result.currentSession;
    if (session && session.shorts && session.shorts.length > 0) {
      // Find the latest occurrence of this short where endedAt is not yet set
      for (let i = session.shorts.length - 1; i >= 0; i--) {
        if (session.shorts[i].id === shortId && !session.shorts[i].endedAt) {
          session.shorts[i].endedAt = endedAt;
          session.shorts[i].durationMs = durationMs;
          session.shorts[i].durationSeconds = durationSeconds;
          break;
        }
      }
      chrome.storage.local.set({ currentSession: session });
    }
  });
}

/**
 * Updates the title of the active short in session storage if resolved late.
 */
function updateActiveShortTitleInSession(shortId, newTitle) {
  chrome.storage.local.get(["currentSession"], (result) => {
    const session = result.currentSession;
    if (session && session.shorts && session.shorts.length > 0) {
      const lastIndex = session.shorts.length - 1;
      if (session.shorts[lastIndex].id === shortId) {
        session.shorts[lastIndex].title = newTitle;
        chrome.storage.local.set({ currentSession: session });
      }
    }
  });
}

/**
 * Closes the currently active Short timing session.
 * Calculates duration and writes to storage.
 */
function closeActiveShort(reason = "navigation") {
  if (!currentTiming) return;

  const endTimeMs = Date.now();
  const durationMs = Math.max(0, endTimeMs - currentTiming.startTimeMs);
  const durationSeconds = Math.round((durationMs / 1000) * 10) / 10;
  const endedAt = new Date(endTimeMs).toISOString();
  const closedId = currentTiming.shortId;

  logScrollopsy(
    "SHORT END",
    `Closed Short [${closedId}] (reason: ${reason})`,
    {
      id: closedId,
      startedAt: currentTiming.startedAt,
      endedAt: endedAt
    }
  );

  logScrollopsy(
    "DURATION",
    `Short [${closedId}] active for ${durationSeconds}s (${durationMs}ms)`,
    {
      id: closedId,
      durationSeconds: durationSeconds,
      durationMs: durationMs
    }
  );

  updateShortEndedInStorage(closedId, endedAt, durationMs, durationSeconds);

  currentTiming = null;
}

/**
 * Starts timing a newly detected Short.
 */
function startTimingShort(shortId, url, triggerReason = "navigation") {
  // If a previous short was active, close it first
  if (currentTiming) {
    closeActiveShort("switched_to_new_short");
  }

  const startTimeMs = Date.now();
  const startedAt = new Date(startTimeMs).toISOString();
  const title = document.title || "YouTube Short";

  currentTiming = {
    shortId: shortId,
    url: url,
    title: title,
    startTimeMs: startTimeMs,
    startedAt: startedAt
  };

  logScrollopsy(
    "SHORT START",
    `Started timing Short [${shortId}] (trigger: ${triggerReason})`,
    {
      id: shortId,
      url: url,
      title: title,
      startedAt: startedAt
    }
  );

  const initialRecord = {
    id: shortId,
    url: url,
    title: title,
    startedAt: startedAt,
    endedAt: null,
    durationMs: null,
    durationSeconds: null
  };

  recordShortToSession(initialRecord);

  // Late title update handler
  if (!document.title || document.title === "YouTube") {
    setTimeout(() => {
      if (currentTiming && currentTiming.shortId === shortId && document.title && document.title !== currentTiming.title) {
        currentTiming.title = document.title;
        updateActiveShortTitleInSession(shortId, document.title);
        logScrollopsy("NEW SHORT", `Updated title for Short [${shortId}]: "${document.title}"`);
      }
    }, 500);
  }
}

/**
 * Evaluates current location and processes Shorts navigation state.
 * @param {string} source - Origin of evaluation ('event' or 'poll')
 */
function handleNavigation(source = "check") {
  const currentUrl = window.location.href;
  const isShort = window.location.pathname.startsWith("/shorts/");

  if (isShort) {
    const shortId = extractShortId(currentUrl);
    if (!shortId) return;

    if (!isOnShortsPage) {
      isOnShortsPage = true;
      activeShortId = shortId;
      activeUrl = currentUrl;

      logScrollopsy(
        "NAVIGATION DETECTED",
        `Entered YouTube Shorts section [ID: ${shortId}]`
      );

      getOrCreateActiveSession(() => {
        // Only start timing if tab is currently visible
        if (document.visibilityState !== "hidden") {
          startTimingShort(shortId, currentUrl, "entry");
        }
      });
    } else if (shortId !== activeShortId) {
      const prevId = activeShortId;
      activeShortId = shortId;
      activeUrl = currentUrl;

      logScrollopsy(
        "NAVIGATION DETECTED",
        `Switched Short: [${prevId || "none"}] ➔ [${shortId}]`
      );

      if (document.visibilityState !== "hidden") {
        startTimingShort(shortId, currentUrl, "scroll");
      }
    } else if (source === "event" && activeShortId === shortId) {
      logScrollopsy(
        "DUPLICATE IGNORED",
        `Already viewing Short ID [${shortId}] (ignored redundant trigger)`
      );
    }
  } else if (isOnShortsPage) {
    logScrollopsy(
      "NAVIGATION DETECTED",
      `Left YouTube Shorts. Current URL: ${currentUrl}`
    );
    closeActiveShort("left_shorts");
    isOnShortsPage = false;
    activeShortId = null;
    activeUrl = null;
  }
}

// Initial evaluation on script load
handleNavigation("event");

// YouTube SPA navigation events
window.addEventListener("yt-navigate-finish", () => handleNavigation("event"));
window.addEventListener("popstate", () => handleNavigation("event"));

// Periodic fallback polling for SPA transitions
setInterval(() => handleNavigation("poll"), 300);

// Tab visibility handling: pause/close timer when hidden, resume when visible
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (currentTiming) {
      closeActiveShort("tab_hidden");
    }
  } else if (document.visibilityState === "visible") {
    if (window.location.pathname.startsWith("/shorts/")) {
      const shortId = extractShortId(window.location.href);
      if (shortId && !currentTiming) {
        startTimingShort(shortId, window.location.href, "tab_visible");
      }
    }
  }
});

// Page unload / teardown handling
window.addEventListener("pagehide", () => {
  if (currentTiming) {
    closeActiveShort("pagehide");
  }
});

window.addEventListener("beforeunload", () => {
  if (currentTiming) {
    closeActiveShort("beforeunload");
  }
});
