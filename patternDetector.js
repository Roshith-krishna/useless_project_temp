/**
 * Scrollopsy - Behavioral + Semantic Engagement & Pattern Detection (Phases 8 & 9)
 * 
 * Combines behavioral metrics with semantic topics to compute transparent
 * Engagement Signals and detect scrolling patterns (Rabbit Hole, Curiosity Spike,
 * Topic Gravity, Instant Rejection, Binge, Revisit).
 * Strictly analyzes scrolling behavior without medical or psychological claims.
 */

/**
 * Calculates a transparent Engagement Signal (0 - 100) for a topic cluster based on observed metrics.
 * 
 * Score Formula:
 * - Completion Component (max 35 pts): based on avg completion rate (1.0 = 35 pts)
 * - Watch Time Component (max 30 pts): based on cumulative time (300s = 30 pts)
 * - Exposure Component (max 15 pts): based on number of Shorts viewed in topic (5 shorts = 15 pts)
 * - Revisit & Streak Component (max 20 pts): based on revisits and consecutive streaks
 * - Instant Skip Penalty (subtracts up to 20 pts): reduces score if rapidly swiped away
 */
function calculateEngagementSignal(topicMetrics) {
  const {
    averageCompletionRate = 0,
    totalWatchTimeMs = 0,
    shortsCount = 0,
    revisitCount = 0,
    maxStreak = 0,
    instantSkipCount = 0
  } = topicMetrics;

  // 1. Completion component (0 - 35)
  const compRatio = Math.min(1.2, averageCompletionRate || 0);
  const completionScore = Math.min(35, Math.round((compRatio / 1.0) * 35));

  // 2. Watch time component (0 - 30) - 5 minutes (300,000 ms) yields full 30 pts
  const timeSeconds = totalWatchTimeMs / 1000;
  const timeScore = Math.min(30, Math.round((timeSeconds / 300) * 30));

  // 3. Exposure component (0 - 15) - 5 shorts yields full 15 pts
  const exposureScore = Math.min(15, shortsCount * 3);

  // 4. Revisit & Streak component (0 - 20)
  const streakScore = Math.min(10, maxStreak * 3);
  const revisitScore = Math.min(10, revisitCount * 5);

  // 5. Skip penalty (0 - 20)
  const skipPenalty = Math.min(20, instantSkipCount * 5);

  const rawScore = completionScore + timeScore + exposureScore + streakScore + revisitScore - skipPenalty;
  const finalScore = Math.max(5, Math.min(100, Math.round(rawScore)));

  return {
    score: finalScore,
    breakdown: {
      completionScore,
      timeScore,
      exposureScore,
      streakScore,
      revisitScore,
      skipPenalty
    }
  };
}

/**
 * Aggregates behavioral signals by semantic topic.
 * @param {Array} events - List of viewing events with semantic metadata attached
 * @returns {Object} Topic clusters with engagement metrics
 */
function aggregateTopicEngagement(events) {
  if (!Array.isArray(events) || events.length === 0) return {};

  const topicClusters = {};

  // Track topic streaks for consecutive views
  let currentTopicStreak = "";
  let currentStreakLen = 0;

  events.forEach((ev) => {
    const semantics = ev.semantics || {};
    const primaryTopics = Array.isArray(semantics.topics) && semantics.topics.length > 0
      ? semantics.topics
      : ["Uncategorized"];

    const primaryTopic = primaryTopics[0];

    // Check consecutive view streak
    if (primaryTopic === currentTopicStreak) {
      currentStreakLen++;
    } else {
      currentTopicStreak = primaryTopic;
      currentStreakLen = 1;
    }

    primaryTopics.forEach((topic) => {
      if (!topicClusters[topic]) {
        topicClusters[topic] = {
          topic: topic,
          shortsCount: 0,
          uniqueVideoIds: new Set(),
          totalWatchTimeMs: 0,
          completionRates: [],
          instantSkipCount: 0,
          nearCompleteCount: 0,
          fullCompletionCount: 0,
          revisitCount: 0,
          maxStreak: 1,
          videoIds: []
        };
      }

      const cluster = topicClusters[topic];
      const vId = ev.videoId || ev.id;

      cluster.shortsCount += 1;
      cluster.uniqueVideoIds.add(vId);
      cluster.videoIds.push(vId);
      cluster.totalWatchTimeMs += ev.watchDurationMs || 0;

      if (typeof ev.completionRate === "number") {
        cluster.completionRates.push(ev.completionRate);
        if (ev.completionRate >= 0.85) cluster.nearCompleteCount += 1;
        if (ev.completionRate >= 1.0) cluster.fullCompletionCount += 1;
      }

      if (ev.isInstantSkip || (ev.watchDurationMs && ev.watchDurationMs < 2000)) {
        cluster.instantSkipCount += 1;
      }

      if (ev.isRevisit) {
        cluster.revisitCount += 1;
      }

      if (topic === currentTopicStreak && currentStreakLen > cluster.maxStreak) {
        cluster.maxStreak = currentStreakLen;
      }
    });
  });

  // Calculate averages and engagement signals
  const result = {};
  Object.keys(topicClusters).forEach((topic) => {
    const c = topicClusters[topic];
    const avgComp = c.completionRates.length > 0
      ? c.completionRates.reduce((a, b) => a + b, 0) / c.completionRates.length
      : null;

    const engagement = calculateEngagementSignal({
      averageCompletionRate: avgComp,
      totalWatchTimeMs: c.totalWatchTimeMs,
      shortsCount: c.shortsCount,
      revisitCount: c.revisitCount,
      maxStreak: c.maxStreak,
      instantSkipCount: c.instantSkipCount
    });

    result[topic] = {
      topic: topic,
      shortsCount: c.shortsCount,
      uniqueShortsCount: c.uniqueVideoIds.size,
      totalWatchTimeMs: c.totalWatchTimeMs,
      totalWatchTimeSeconds: Math.round((c.totalWatchTimeMs / 1000) * 10) / 10,
      averageCompletionRate: avgComp ? Math.round(avgComp * 1000) / 1000 : null,
      instantSkipCount: c.instantSkipCount,
      nearCompleteCount: c.nearCompleteCount,
      fullCompletionCount: c.fullCompletionCount,
      revisitCount: c.revisitCount,
      maxStreak: c.maxStreak,
      engagementSignal: engagement.score,
      engagementBreakdown: engagement.breakdown
    };
  });

  return result;
}

/**
 * Detects scrolling behavioral patterns across the session (Phase 9).
 * Patterns: RABBIT HOLE, CURIOSITY SPIKE, INSTANT REJECTION, REVISIT, TOPIC GRAVITY, BINGE.
 * @param {Array} events - Chronological viewing events
 * @param {Object} topicEngagement - Output from aggregateTopicEngagement
 * @returns {Array<Object>} List of detected patterns with forensic evidence
 */
function detectScrollingPatterns(events, topicEngagement) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const patterns = [];

  // Extract chronological topic sequence
  const topicSequence = events.map((e) => {
    const topics = e.semantics?.topics;
    return Array.isArray(topics) && topics.length > 0 ? topics[0] : "Other";
  });

  // 1. RABBIT HOLE: Multiple semantically related Shorts with sustained engagement (>= 3 shorts, >= 70% avg completion)
  Object.values(topicEngagement).forEach((t) => {
    if (t.shortsCount >= 3 && t.averageCompletionRate >= 0.70) {
      patterns.push({
        type: "RABBIT_HOLE",
        badge: "RABBIT HOLE DETECTED",
        topic: t.topic,
        headline: `🐇 Deep Dive into "${t.topic}"`,
        description: `Encountered ${t.shortsCount} related Shorts with ${(t.averageCompletionRate * 100).toFixed(0)}% average completion over ${t.totalWatchTimeSeconds}s.`,
        metric: `${t.shortsCount} Shorts • ${(t.averageCompletionRate * 100).toFixed(0)}% completion`,
        strength: Math.min(100, Math.round(t.engagementSignal))
      });
    }
  });

  // 2. CURIOSITY SPIKE: Strong engagement (>= 90% completion or revisits) on a topic seen only briefly (1-2 shorts)
  Object.values(topicEngagement).forEach((t) => {
    if (t.shortsCount <= 2 && (t.averageCompletionRate >= 0.90 || t.revisitCount > 0)) {
      patterns.push({
        type: "CURIOSITY_SPIKE",
        badge: "CURIOSITY SPIKE",
        topic: t.topic,
        headline: `⚡ Curiosity Spike: "${t.topic}"`,
        description: `Watched briefly (${t.shortsCount} Short${t.shortsCount > 1 ? "s" : ""}) but with unusually focused engagement (${(t.averageCompletionRate * 100).toFixed(0)}% completion).`,
        metric: `${(t.averageCompletionRate * 100).toFixed(0)}% completion`,
        strength: Math.round((t.averageCompletionRate || 0.9) * 90)
      });
    }
  });

  // 3. INSTANT REJECTION: Repeated fast skipping (avg completion < 20% or >= 60% instant skips on >= 2 shorts)
  Object.values(topicEngagement).forEach((t) => {
    if (t.shortsCount >= 2 && (t.averageCompletionRate < 0.20 || (t.instantSkipCount / t.shortsCount) >= 0.6)) {
      patterns.push({
        type: "INSTANT_REJECTION",
        badge: "LOW ENGAGEMENT SIGNAL",
        topic: t.topic,
        headline: `🚫 Rejected: "${t.topic}"`,
        description: `Rapidly dismissed ${t.instantSkipCount} of ${t.shortsCount} Shorts in under 2 seconds. Average completion: ${t.averageCompletionRate ? (t.averageCompletionRate * 100).toFixed(0) : "0"}%.`,
        metric: `${t.instantSkipCount} instant skips`,
        strength: 20
      });
    }
  });

  // 4. TOPIC GRAVITY: Repeatedly returns to a topic even after intervening unrelated content
  // Pattern: Topic appears at least 3 times with at least 2 separate intervening topic departures
  Object.keys(topicEngagement).forEach((topic) => {
    let departures = 0;
    let inTopic = false;
    let topicAppearances = 0;

    for (let i = 0; i < topicSequence.length; i++) {
      if (topicSequence[i] === topic) {
        if (!inTopic) {
          topicAppearances++;
          inTopic = true;
        }
      } else {
        if (inTopic) {
          departures++;
          inTopic = false;
        }
      }
    }

    if (topicAppearances >= 3 && departures >= 2) {
      patterns.push({
        type: "TOPIC_GRAVITY",
        badge: "TOPIC GRAVITY DETECTED",
        topic: topic,
        headline: `🧲 Gravity Well: "${topic}"`,
        description: `"${topic}" kept pulling you back across ${topicAppearances} distinct occasions despite scrolling through other content.`,
        metric: `${topicAppearances} re-entries`,
        strength: 85
      });
    }
  });

  // 5. BINGE: Substantial continuous watch time on a topic cluster (>= 3 consecutive Shorts and >= 3 min watch time)
  Object.values(topicEngagement).forEach((t) => {
    if (t.maxStreak >= 3 && t.totalWatchTimeMs >= 180000) { // 3 minutes
      patterns.push({
        type: "BINGE",
        badge: `${t.topic.toUpperCase()} BINGE`,
        topic: t.topic,
        headline: `🍿 Sustained Binge: "${t.topic}"`,
        description: `Continuous focus streak of ${t.maxStreak} consecutive Shorts accumulating ${(t.totalWatchTimeMs / 60000).toFixed(1)} minutes.`,
        metric: `${(t.totalWatchTimeMs / 60000).toFixed(1)} minutes`,
        strength: 95
      });
    }
  });

  // 6. REVISIT: Direct non-consecutive return to an individual video (A -> B -> A)
  events.forEach((ev, idx) => {
    if (ev.isRevisit) {
      patterns.push({
        type: "REVISIT",
        badge: "REVISIT DETECTED",
        topic: ev.semantics?.topics?.[0] || "Short",
        headline: `🔄 Rewatched: "${ev.title || ev.videoId}"`,
        description: `Encountered Short [${ev.videoId}] again after viewing other videos.`,
        metric: `Visit #${ev.visitNumber || 2}`,
        strength: 80
      });
    }
  });

  return patterns;
}

// Module export for Node/testing and window global for Chrome Extension
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    calculateEngagementSignal,
    aggregateTopicEngagement,
    detectScrollingPatterns
  };
}

if (typeof window !== "undefined") {
  window.ScrollopsyPatterns = {
    calculateEngagementSignal,
    aggregateTopicEngagement,
    detectScrollingPatterns
  };
}
