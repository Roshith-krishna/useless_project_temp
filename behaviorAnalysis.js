/**
 * Scrollopsy - Behavioral Analysis Layer (Stage 5)
 * 
 * Analyzes raw YouTube Shorts viewing events to derive user behavioral signals.
 * Does NOT compute an "interest score" or infer topic preferences.
 * Uses conservative sequence analysis to distinguish looping from genuine revisits.
 */

// Behavioral Thresholds
const THRESHOLDS = {
  INSTANT_SKIP_MS: 2000,      // Viewing under 2.0s is considered an instant skip
  NEAR_COMPLETE_RATE: 0.85,   // Completion rate >= 85% is considered a near-complete view
};

/**
 * Analyzes a session and its viewing events to generate behavioral metrics.
 * 
 * @param {Object} session - The session object containing `views` array.
 * @returns {Object} Structured behavioral analysis object.
 */
function analyzeSessionBehavior(session) {
  if (!session) {
    return createEmptyAnalysis(null);
  }

  const rawEvents = session.views || session.shorts || [];
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return createEmptyAnalysis(session.id);
  }

  // 1. Session Duration Calculation
  const sessionStartTime = session.startedAt ? new Date(session.startedAt).getTime() : null;
  const sessionEndTime = session.endedAt
    ? new Date(session.endedAt).getTime()
    : (rawEvents.length > 0 && rawEvents[rawEvents.length - 1].endedAt
        ? new Date(rawEvents[rawEvents.length - 1].endedAt).getTime()
        : Date.now());

  const totalSessionDurationMs = (sessionStartTime && sessionEndTime && sessionEndTime >= sessionStartTime)
    ? (sessionEndTime - sessionStartTime)
    : rawEvents.reduce((acc, ev) => acc + (ev.watchDurationMs || 0), 0);

  const totalSessionDurationSeconds = Math.round((totalSessionDurationMs / 1000) * 10) / 10;

  // 2. Identify Stints & Conservative Revisit Sequencing
  // Collapse adjacent identical video visits (e.g. from tab visibility toggles) into distinct stints:
  // e.g., [A, A, B, A] -> Stints: Stint 0 (A), Stint 1 (B), Stint 2 (A)
  // Revisit occurs when a video appears in a non-consecutive stint (A -> B -> A).
  const stints = []; // Array of { videoId, eventIndices: [] }

  rawEvents.forEach((ev, idx) => {
    const vId = ev.videoId || ev.id;
    if (!vId) return;

    if (stints.length === 0 || stints[stints.length - 1].videoId !== vId) {
      stints.push({
        videoId: vId,
        stintIndex: stints.length,
        eventIndices: [idx]
      });
    } else {
      stints[stints.length - 1].eventIndices.push(idx);
    }
  });

  // Track stint counts per video
  const videoStintCounts = {}; // { videoId: totalStintCount }
  const videoFirstStintIndex = {}; // { videoId: firstStintIndex }

  stints.forEach((stint) => {
    const vId = stint.videoId;
    if (!videoStintCounts[vId]) {
      videoStintCounts[vId] = 0;
      videoFirstStintIndex[vId] = stint.stintIndex;
    }
    videoStintCounts[vId] += 1;
  });

  // Map each event index to its stint information
  const eventStintMeta = {};
  stints.forEach((stint) => {
    const isRevisitStint = stint.stintIndex > videoFirstStintIndex[stint.videoId];
    stint.eventIndices.forEach((evIdx) => {
      eventStintMeta[evIdx] = {
        stintIndex: stint.stintIndex,
        isRevisit: isRevisitStint
      };
    });
  });

  // 3. Process Individual Viewing Events
  let instantSkipCount = 0;
  let nearCompleteCount = 0;
  let totalWatchDurationMs = 0;
  let completionRateSum = 0;
  let completionRateCount = 0;
  let totalRewatchTimeMs = 0;

  const analyzedEvents = rawEvents.map((ev, idx) => {
    const watchDurationMs = typeof ev.watchDurationMs === "number" ? ev.watchDurationMs : 0;
    const videoDurationMs = typeof ev.videoDurationMs === "number" ? ev.videoDurationMs : null;
    
    // Calculate or preserve completion rate
    let completionRate = ev.completionRate;
    if (completionRate == null && videoDurationMs && videoDurationMs > 0) {
      completionRate = Math.round((watchDurationMs / videoDurationMs) * 1000) / 1000;
    }

    const isInstantSkip = watchDurationMs < THRESHOLDS.INSTANT_SKIP_MS;
    const isNearComplete = completionRate !== null && completionRate >= THRESHOLDS.NEAR_COMPLETE_RATE;
    const stintInfo = eventStintMeta[idx] || { stintIndex: 0, isRevisit: false };
    const isRevisit = stintInfo.isRevisit;

    if (isInstantSkip) instantSkipCount++;
    if (isNearComplete) nearCompleteCount++;
    if (isRevisit) totalRewatchTimeMs += watchDurationMs;

    totalWatchDurationMs += watchDurationMs;

    if (completionRate !== null && !isNaN(completionRate)) {
      completionRateSum += completionRate;
      completionRateCount++;
    }

    return {
      id: ev.id,
      videoId: ev.videoId || ev.id,
      url: ev.url,
      title: ev.title || "YouTube Short",
      startedAt: ev.startedAt,
      endedAt: ev.endedAt,
      watchDurationMs: watchDurationMs,
      videoDurationMs: videoDurationMs,
      completionRate: completionRate,
      isInstantSkip: isInstantSkip,
      isNearComplete: isNearComplete,
      isRevisit: isRevisit,
      stintIndex: stintInfo.stintIndex
    };
  });

  // 4. Per-Video Behavioral Aggregations
  const byVideo = {};
  analyzedEvents.forEach((ev) => {
    const vId = ev.videoId;
    if (!byVideo[vId]) {
      const totalStints = videoStintCounts[vId] || 1;
      const revisitCount = Math.max(0, totalStints - 1);

      byVideo[vId] = {
        videoId: vId,
        title: ev.title,
        url: ev.url,
        videoDurationMs: ev.videoDurationMs,
        totalWatchTimeForVideo: 0,
        revisitCount: revisitCount,
        hasRevisit: revisitCount > 0,
        viewCount: 0,
        instantSkipCount: 0,
        nearCompleteCount: 0,
        highestCompletionRate: null,
        viewEventIds: []
      };
    }

    const vRecord = byVideo[vId];
    vRecord.totalWatchTimeForVideo += ev.watchDurationMs;
    vRecord.viewCount += 1;
    vRecord.viewEventIds.push(ev.id);

    if (ev.isInstantSkip) vRecord.instantSkipCount += 1;
    if (ev.isNearComplete) vRecord.nearCompleteCount += 1;
    if (ev.videoDurationMs && !vRecord.videoDurationMs) {
      vRecord.videoDurationMs = ev.videoDurationMs;
    }

    if (ev.completionRate !== null) {
      if (vRecord.highestCompletionRate === null || ev.completionRate > vRecord.highestCompletionRate) {
        vRecord.highestCompletionRate = ev.completionRate;
      }
    }
  });

  // Final per-video derived properties
  Object.values(byVideo).forEach((v) => {
    v.averageWatchDurationMs = v.viewCount > 0 ? Math.round(v.totalWatchTimeForVideo / v.viewCount) : 0;
    v.totalWatchTimeSeconds = Math.round((v.totalWatchTimeForVideo / 1000) * 10) / 10;
  });

  // 5. Session-Level Summaries
  const totalShortsViewed = analyzedEvents.length;
  const uniqueShortsViewed = Object.keys(byVideo).length;
  const totalRevisitCount = Object.values(byVideo).reduce((acc, v) => acc + v.revisitCount, 0);

  const averageWatchDurationMs = totalShortsViewed > 0
    ? Math.round(totalWatchDurationMs / totalShortsViewed)
    : 0;
  const averageWatchDurationSeconds = Math.round((averageWatchDurationMs / 1000) * 10) / 10;

  const averageCompletionRate = completionRateCount > 0
    ? Math.round((completionRateSum / completionRateCount) * 1000) / 1000
    : null;

  return {
    sessionId: session.id,
    analyzedAt: new Date().toISOString(),
    summary: {
      totalSessionDurationMs: totalSessionDurationMs,
      totalSessionDurationSeconds: totalSessionDurationSeconds,
      totalShortsViewed: totalShortsViewed,
      uniqueShortsViewed: uniqueShortsViewed,
      averageWatchDurationMs: averageWatchDurationMs,
      averageWatchDurationSeconds: averageWatchDurationSeconds,
      averageCompletionRate: averageCompletionRate,
      instantSkipCount: instantSkipCount,
      nearCompleteCount: nearCompleteCount,
      revisitCount: totalRevisitCount,
      totalRewatchTimeMs: totalRewatchTimeMs,
      totalRewatchTimeSeconds: Math.round((totalRewatchTimeMs / 1000) * 10) / 10
    },
    byVideo: byVideo,
    events: analyzedEvents
  };
}

/**
 * Creates an empty analysis structure when no data is available.
 */
function createEmptyAnalysis(sessionId) {
  return {
    sessionId: sessionId || "none",
    analyzedAt: new Date().toISOString(),
    summary: {
      totalSessionDurationMs: 0,
      totalSessionDurationSeconds: 0,
      totalShortsViewed: 0,
      uniqueShortsViewed: 0,
      averageWatchDurationMs: 0,
      averageWatchDurationSeconds: 0,
      averageCompletionRate: null,
      instantSkipCount: 0,
      nearCompleteCount: 0,
      revisitCount: 0,
      totalRewatchTimeMs: 0,
      totalRewatchTimeSeconds: 0
    },
    byVideo: {},
    events: []
  };
}

// Module export for Node.js / tests, and window global for Chrome Extension
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    analyzeSessionBehavior,
    createEmptyAnalysis,
    THRESHOLDS
  };
}

if (typeof window !== "undefined") {
  window.ScrollopsyAnalysis = {
    analyzeSessionBehavior,
    createEmptyAnalysis,
    THRESHOLDS
  };
}
