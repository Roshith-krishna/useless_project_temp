// Scrollopsy - YouTube Shorts Tracker: Viewing Events Engine (Stage 4.1)
console.log(
  "%c[SCROLLOPSY]%c Stage 4.1 Viewing Events Engine Active.",
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
 * 2. HTML5 Video Element Duration:
 *    videoDurationMs is read from the active HTML5 <video> element's duration property once metadata
 *    loads. If YouTube delays loading metadata or buffers, videoDurationMs may resolve upon event close.
 * 3. Background Tab & CPU Throttling:
 *    Chromium suspends or throttles JavaScript execution in backgrounded tabs. Visibility
 *    change listeners ('visibilitychange') close the active viewing event immediately when the tab is hidden
 *    to prevent recording inflated background idle time.
 * 4. Page Teardown / Unload Constraints:
 *    When a tab is closed or the user navigates away, 'pagehide' / 'beforeunload' events are fired.
 *    Chrome storage writes during process termination execute on a best-effort basis.
 * 5. Wall-Clock Jitter:
 *    startedAt and endedAt use client system clock ISO strings, while watchDurationMs is calculated
 *    via Date.now() millisecond differences.
 */

// Tracking State
let activeVideoId = null;
let activeUrl = null;
let lastEvaluatedUrl = null;
let isOnShortsPage = false;

// Active Viewing Event State
let currentTiming = null;
let activeContentCollector = null;

// In-memory active session (Single Source of Truth to eliminate storage race conditions)
let activeSession = null;
let isSessionLoading = false;
let sessionInitCallbacks = [];

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
 * Extracts the video duration in milliseconds from the active YouTube Short <video> element.
 */
function getActiveVideoDurationMs() {
  try {
    // 1. Active reel renderer video
    const activeReelVideo = document.querySelector("ytd-reel-video-renderer[is-active] video");
    if (activeReelVideo && !isNaN(activeReelVideo.duration) && isFinite(activeReelVideo.duration) && activeReelVideo.duration > 0) {
      return Math.round(activeReelVideo.duration * 1000);
    }

    // 2. Shorts player video container
    const shortsVideo = document.querySelector("#shorts-player video, ytd-shorts video");
    if (shortsVideo && !isNaN(shortsVideo.duration) && isFinite(shortsVideo.duration) && shortsVideo.duration > 0) {
      return Math.round(shortsVideo.duration * 1000);
    }

    // 3. Fallback: inspect visible video elements
    const videos = Array.from(document.querySelectorAll("video"));
    for (const v of videos) {
      if (!isNaN(v.duration) && isFinite(v.duration) && v.duration > 0 && v.offsetHeight > 150) {
        return Math.round(v.duration * 1000);
      }
    }

    // 4. Any video element with valid duration
    for (const v of videos) {
      if (!isNaN(v.duration) && isFinite(v.duration) && v.duration > 0) {
        return Math.round(v.duration * 1000);
      }
    }
  } catch (e) {
    // Ignore DOM query errors
  }
  return null;
}

/**
 * Central logger for Scrollopsy events.
 */
function logScrollopsy(tag, message, details = null) {
  const prefixStyle = "color: #ff4b4b; font-weight: bold;";
  let tagStyle = "color: #00e676; font-weight: bold;";

  if (tag === "VIEW START") {
    tagStyle = "color: #06d6a0; font-weight: bold;";
  } else if (tag === "VIEW END") {
    tagStyle = "color: #ef476f; font-weight: bold;";
  } else if (tag === "WATCH DURATION") {
    tagStyle = "color: #ffd166; font-weight: bold;";
  } else if (tag === "COMPLETION") {
    tagStyle = "color: #4cc9f0; font-weight: bold;";
  } else if (tag === "DUPLICATE IGNORED") {
    tagStyle = "color: #ffb703; font-weight: bold;";
  } else if (tag === "NAVIGATION DETECTED") {
    tagStyle = "color: #b388ff; font-weight: bold;";
  } else if (tag === "SESSION RECORDED" || tag === "SESSION CREATED") {
    tagStyle = "color: #a78bfa; font-weight: bold;";
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
 * Ensures in-memory activeSession is loaded from storage or created.
 */
function ensureActiveSession(callback) {
  if (activeSession && activeSession.endedAt === null) {
    if (callback) callback(activeSession);
    return;
  }

  if (callback) {
    sessionInitCallbacks.push(callback);
  }

  if (isSessionLoading) return;
  isSessionLoading = true;

  chrome.storage.local.get(["currentSession"], (result) => {
    isSessionLoading = false;
    let session = result.currentSession;

    if (!session || session.endedAt !== null) {
      session = {
        id: "session_" + Date.now(),
        startedAt: new Date().toISOString(),
        endedAt: null,
        views: []
      };
      logScrollopsy(
        "SESSION CREATED",
        `Automatically created active session [${session.id}]`,
        session
      );
    }

    if (!Array.isArray(session.views)) {
      session.views = Array.isArray(session.shorts) ? session.shorts : [];
    }

    // Reference alias for backward compatibility
    session.shorts = session.views;

    activeSession = session;
    persistSession();

    const callbacks = sessionInitCallbacks;
    sessionInitCallbacks = [];
    callbacks.forEach((cb) => cb(activeSession));
  });
}

/**
 * Persists the in-memory activeSession to chrome.storage.local atomically.
 */
function persistSession(callback) {
  if (!activeSession) return;
  // Ensure backward compatibility alias
  activeSession.shorts = activeSession.views;

  // Derive behavioral analysis and pattern detection layers
  if (typeof analyzeSessionBehavior === "function") {
    const behavior = analyzeSessionBehavior(activeSession);
    if (typeof aggregateTopicEngagement === "function") {
      behavior.topicEngagement = aggregateTopicEngagement(activeSession.views);
      if (typeof detectScrollingPatterns === "function") {
        behavior.patterns = detectScrollingPatterns(activeSession.views, behavior.topicEngagement);
      }
    }
    activeSession.behaviorAnalysis = behavior;
  }

  chrome.storage.local.set({ currentSession: activeSession }, () => {
    if (chrome.runtime.lastError) {
      console.error("[SCROLLOPSY] Storage persist error:", chrome.runtime.lastError);
    }
    if (callback) callback();
  });
}

/**
 * Closes the currently active viewing event.
 * Calculates watchDurationMs, resolves videoDurationMs, and calculates completionRate.
 */
function closeActiveViewingEvent(reason = "navigation") {
  if (!currentTiming) return null;

  const endTimeMs = Date.now();
  const watchDurationMs = Math.max(0, endTimeMs - currentTiming.startTimeMs);
  const endedAt = new Date(endTimeMs).toISOString();
  const closedVideoId = currentTiming.videoId;
  const viewId = currentTiming.viewId;

  // Resolve video duration if it wasn't yet loaded at event start
  let videoDurationMs = currentTiming.videoDurationMs || getActiveVideoDurationMs();

  // Calculate completion rate when videoDurationMs is available
  const completionRate =
    videoDurationMs && videoDurationMs > 0
      ? Math.round((watchDurationMs / videoDurationMs) * 1000) / 1000
      : null;

  logScrollopsy(
    "VIEW END",
    `Ended viewing Short [${closedVideoId}] (reason: ${reason})`,
    {
      id: viewId,
      videoId: closedVideoId,
      startedAt: currentTiming.startedAt,
      endedAt: endedAt
    }
  );

  logScrollopsy(
    "WATCH DURATION",
    `Short [${closedVideoId}] watch duration: ${(watchDurationMs / 1000).toFixed(1)}s (${watchDurationMs}ms)`,
    {
      id: viewId,
      videoId: closedVideoId,
      watchDurationMs: watchDurationMs
    }
  );

  logScrollopsy(
    "COMPLETION",
    `Completion rate for Short [${closedVideoId}]: ${
      completionRate !== null ? (completionRate * 100).toFixed(1) + "%" : "N/A"
    } (videoDuration: ${videoDurationMs ? (videoDurationMs / 1000).toFixed(1) + "s" : "unknown"})`,
    {
      id: viewId,
      videoId: closedVideoId,
      watchDurationMs: watchDurationMs,
      videoDurationMs: videoDurationMs,
      completionRate: completionRate
    }
  );

  // Finalize content understanding & semantics
  let contentData = null;
  if (activeContentCollector) {
    contentData = activeContentCollector.finalize();
    activeContentCollector = null;
  } else if (typeof extractRenderedShortMetadata === "function") {
    contentData = extractRenderedShortMetadata(closedVideoId);
  }

  let semantics = null;
  if (contentData && typeof analyzeSemanticsLocally === "function") {
    semantics = analyzeSemanticsLocally(contentData);
  }

  // Synchronously update in-memory activeSession.views to eliminate storage race conditions
  if (activeSession && Array.isArray(activeSession.views)) {
    for (let i = activeSession.views.length - 1; i >= 0; i--) {
      if (activeSession.views[i].id === viewId && !activeSession.views[i].endedAt) {
        activeSession.views[i].endedAt = endedAt;
        activeSession.views[i].watchDurationMs = watchDurationMs;
        activeSession.views[i].videoDurationMs = videoDurationMs;
        activeSession.views[i].completionRate = completionRate;
        if (contentData) activeSession.views[i].content = contentData;
        if (semantics) activeSession.views[i].semantics = semantics;
        break;
      }
    }
  }



  const closedData = {
    id: viewId,
    videoId: closedVideoId,
    startedAt: currentTiming.startedAt,
    endedAt: endedAt,
    watchDurationMs: watchDurationMs,
    videoDurationMs: videoDurationMs,
    completionRate: completionRate,
    content: contentData,
    semantics: semantics
  };

  currentTiming = null;
  return closedData;
}

/**
 * Starts a new viewing event for a detected Short and appends it to activeSession.
 */
function startNewViewingEvent(videoId, url, triggerReason = "navigation") {
  ensureActiveSession(() => {
    // 1. If a previous viewing event was active, close it synchronously first
    let closedPreviousEvent = null;
    if (currentTiming) {
      closedPreviousEvent = closeActiveViewingEvent("switched_to_new_short");
    }

    // Initialize content collector for this new viewing event
    if (typeof ViewingContentCollector === "function") {
      activeContentCollector = new ViewingContentCollector(videoId);
    }

    const startTimeMs = Date.now();
    const startedAt = new Date(startTimeMs).toISOString();
    const title = document.title || "YouTube Short";
    const viewId = "view_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    const videoDurationMs = getActiveVideoDurationMs();

    currentTiming = {
      viewId: viewId,
      videoId: videoId,
      url: url,
      title: title,
      startTimeMs: startTimeMs,
      startedAt: startedAt,
      videoDurationMs: videoDurationMs
    };

    const initialContent = typeof extractRenderedShortMetadata === "function"
      ? extractRenderedShortMetadata(videoId)
      : null;
    const initialSemantics = initialContent && typeof analyzeSemanticsLocally === "function"
      ? analyzeSemanticsLocally(initialContent)
      : null;

    const newViewEvent = {
      id: viewId,
      videoId: videoId,
      url: url,
      title: title,
      startedAt: startedAt,
      endedAt: null,
      watchDurationMs: null,
      videoDurationMs: videoDurationMs,
      completionRate: null,
      content: initialContent,
      semantics: initialSemantics
    };

    logScrollopsy(
      "VIEW START",
      `Started viewing Short [${videoId}] (Event ID: ${viewId}, trigger: ${triggerReason})`,
      newViewEvent
    );

    // 2. Append new viewing event to in-memory session
    activeSession.views.push(newViewEvent);

    // 3. Atomically persist both closed event and newly opened event to storage
    persistSession(() => {
      logScrollopsy(
        "SESSION RECORDED",
        `Saved session to local storage. Total views: ${activeSession.views.length}`,
        {
          closedPrevious: closedPreviousEvent,
          activeView: newViewEvent
        }
      );
    });

    // 4. Late title and video duration resolution (metadata might finish buffering right after navigation)
    setTimeout(() => {
      let needsPersist = false;
      if (currentTiming && currentTiming.viewId === viewId) {
        if (document.title && document.title !== "YouTube" && document.title !== currentTiming.title) {
          currentTiming.title = document.title;
          newViewEvent.title = document.title;
          needsPersist = true;
        }
        if (!currentTiming.videoDurationMs) {
          const resolvedDuration = getActiveVideoDurationMs();
          if (resolvedDuration) {
            currentTiming.videoDurationMs = resolvedDuration;
            newViewEvent.videoDurationMs = resolvedDuration;
            needsPersist = true;
          }
        }
        if (needsPersist) {
          persistSession();
        }
      }
    }, 600);
  });
}

/**
 * Evaluates current location and processes Shorts navigation state.
 * @param {string} source - Origin of evaluation ('event' or 'poll')
 */
function handleNavigation(source = "check") {
  const currentUrl = window.location.href;
  const isShort = window.location.pathname.startsWith("/shorts/");

  if (isShort) {
    const videoId = extractShortId(currentUrl);
    if (!videoId) return;

    if (!isOnShortsPage) {
      // First entry into Shorts section or returning to Shorts from non-Shorts page
      isOnShortsPage = true;
      activeVideoId = videoId;
      activeUrl = currentUrl;
      lastEvaluatedUrl = currentUrl;

      logScrollopsy(
        "NAVIGATION DETECTED",
        `Entered YouTube Shorts section [Video ID: ${videoId}]`
      );

      try {
        chrome.runtime.sendMessage({
          type: "SHORTS_SESSION_ACTIVE",
          videoId: videoId,
          url: currentUrl
        });
      } catch (e) {}

      if (document.visibilityState !== "hidden") {
        startNewViewingEvent(videoId, currentUrl, "entry");
      }
    } else if (videoId !== activeVideoId) {
      // Navigated to a DIFFERENT Short (scrolled up/down or clicked)
      const prevId = activeVideoId;
      activeVideoId = videoId;
      activeUrl = currentUrl;
      lastEvaluatedUrl = currentUrl;

      logScrollopsy(
        "NAVIGATION DETECTED",
        `Switched Short: [${prevId || "none"}] ➔ [${videoId}]`
      );

      try {
        chrome.runtime.sendMessage({
          type: "SHORTS_SESSION_ACTIVE",
          videoId: videoId,
          url: currentUrl
        });
      } catch (e) {}

      if (document.visibilityState !== "hidden") {
        startNewViewingEvent(videoId, currentUrl, "scroll");
      }
    } else if (activeVideoId === videoId) {
      // Same Short ID encountered again
      if (currentUrl !== lastEvaluatedUrl) {
        lastEvaluatedUrl = currentUrl;
        logScrollopsy(
          "DUPLICATE IGNORED",
          `Same Short ID [${videoId}] (URL variation: ${currentUrl})`
        );
      } else if (source === "event") {
        logScrollopsy(
          "DUPLICATE IGNORED",
          `Already actively viewing Short ID [${videoId}] (ignored redundant navigation event)`
        );
      }
    }
  } else if (isOnShortsPage) {
    // Navigated away from YouTube Shorts to standard YouTube page
    logScrollopsy(
      "NAVIGATION DETECTED",
      `Left YouTube Shorts. Current URL: ${currentUrl}`
    );
    closeActiveViewingEvent("left_shorts");
    persistSession(() => {
      try {
        chrome.runtime.sendMessage({ type: "SHORTS_NAVIGATED_AWAY" });
      } catch (e) {}
    });
    activeSession = null;
    isOnShortsPage = false;
    activeVideoId = null;
    activeUrl = null;
    lastEvaluatedUrl = null;
  }
}

// Initial evaluation on script load
handleNavigation("event");

// YouTube SPA navigation events
window.addEventListener("yt-navigate-finish", () => handleNavigation("event"));
window.addEventListener("popstate", () => handleNavigation("event"));

// Periodic fallback polling for SPA transitions
setInterval(() => handleNavigation("poll"), 300);

// Tab visibility handling: close viewing event when hidden, start new viewing event when visible
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    if (currentTiming) {
      closeActiveViewingEvent("tab_hidden");
      persistSession();
    }
  } else if (document.visibilityState === "visible") {
    if (window.location.pathname.startsWith("/shorts/")) {
      const videoId = extractShortId(window.location.href);
      if (videoId && !currentTiming) {
        startNewViewingEvent(videoId, window.location.href, "tab_visible");
      }
    }
  }
});

// Page unload / teardown handling
window.addEventListener("pagehide", () => {
  if (currentTiming) {
    closeActiveViewingEvent("pagehide");
    persistSession();
    try {
      chrome.runtime.sendMessage({ type: "SHORTS_CLOSING" });
    } catch (e) {}
  }
});

window.addEventListener("beforeunload", () => {
  if (currentTiming) {
    closeActiveViewingEvent("beforeunload");
    persistSession();
    try {
      chrome.runtime.sendMessage({ type: "SHORTS_CLOSING" });
    } catch (e) {}
  }
});
