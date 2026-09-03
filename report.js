/**
 * Scrollopsy - Doomscroll Autopsy Report Logic (Phase 10 & 11)
 * 
 * Ingests session data, aggregates behavioral & semantic signals,
 * populates the forensic dossier cards, synthesizes comedic data-driven observations,
 * and renders the interactive Content Trail visualization.
 */

document.addEventListener("DOMContentLoaded", () => {
  const caseIdEl = document.getElementById("case-id");
  const statDurationEl = document.getElementById("stat-duration");
  const statTotalShortsEl = document.getElementById("stat-total-shorts");
  const statUniqueShortsEl = document.getElementById("stat-unique-shorts");
  const statRevisitsEl = document.getElementById("stat-revisits");
  const statTopicsCountEl = document.getElementById("stat-topics-count");
  const statAvgCompletionEl = document.getElementById("stat-avg-completion");

  const strongestEngagementList = document.getElementById("strongest-engagement-list");
  const rabbitHoleContent = document.getElementById("rabbit-hole-content");
  const curiositySpikeContent = document.getElementById("curiosity-spike-content");
  const mostRewatchedContent = document.getElementById("most-rewatched-content");
  const mostSkippedContent = document.getElementById("most-skipped-content");
  const observationsList = document.getElementById("observations-list");

  const refreshBtn = document.getElementById("refresh-report-btn");
  const closeBtn = document.getElementById("close-report-btn");

  const canvasEl = document.getElementById("trail-canvas");
  const tooltipEl = document.getElementById("trail-tooltip");

  let trailVisualizer = null;
  if (canvasEl && typeof ContentTrailVisualizer === "function") {
    trailVisualizer = new ContentTrailVisualizer(canvasEl, tooltipEl);
  }

  function loadReport() {
    chrome.storage.local.get(["currentSession"], (res) => {
      const session = res.currentSession;
      if (!session) {
        renderEmptyDossier();
        return;
      }

      renderDossier(session);
    });
  }

  function renderDossier(session) {
    const rawEvents = session.views || session.shorts || [];

    // Ensure behavioral analysis, topic engagement, and patterns are derived
    let behavior = session.behaviorAnalysis;
    if (!behavior && typeof analyzeSessionBehavior === "function") {
      behavior = analyzeSessionBehavior(session);
    }

    let topicEngagement = behavior?.topicEngagement;
    if (!topicEngagement && typeof aggregateTopicEngagement === "function") {
      topicEngagement = aggregateTopicEngagement(rawEvents);
    }

    let patterns = behavior?.patterns;
    if (!patterns && typeof detectScrollingPatterns === "function") {
      patterns = detectScrollingPatterns(rawEvents, topicEngagement || {});
    }

    const summary = behavior?.summary || {};
    const byVideo = behavior?.byVideo || {};

    // 1. Header & Case Stamp
    const caseHash = (session.id || "0000").slice(-6).toUpperCase();
    caseIdEl.textContent = `OBS-${caseHash}`;

    // 2. Vital Statistics
    const durSec = summary.totalSessionDurationSeconds || 0;
    const mins = Math.floor(durSec / 60);
    const secs = Math.round(durSec % 60);
    statDurationEl.textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    statTotalShortsEl.textContent = summary.totalShortsViewed || rawEvents.length;
    statUniqueShortsEl.textContent = summary.uniqueShortsViewed || new Set(rawEvents.map((v) => v.videoId || v.id)).size;
    statRevisitsEl.textContent = summary.revisitCount || 0;

    const topicKeys = Object.keys(topicEngagement || {});
    statTopicsCountEl.textContent = topicKeys.length;

    const avgComp = summary.averageCompletionRate;
    statAvgCompletionEl.textContent = avgComp !== null ? `${Math.round(avgComp * 100)}%` : "0%";

    // 3. Render Phase 11 Content Trail
    if (trailVisualizer) {
      trailVisualizer.loadData(rawEvents, patterns);
    }

    // 4. Section 1: STRONGEST ENGAGEMENT
    renderStrongestEngagement(topicEngagement);

    // 5. Section 2: BIGGEST RABBIT HOLE
    renderBiggestRabbitHole(patterns, topicEngagement);

    // 6. Section 3: CURIOSITY SPIKE
    renderCuriositySpike(patterns, topicEngagement);

    // 7. Section 4: MOST REWATCHED
    renderMostRewatched(byVideo, rawEvents);

    // 8. Section 5: MOST AGGRESSIVELY SKIPPED
    renderMostSkipped(patterns, topicEngagement);

    // 9. Section 6: DATA-DRIVEN COMEDIC OBSERVATIONS
    renderObservations(summary, topicEngagement, patterns, byVideo, durSec);
  }

  function renderStrongestEngagement(topicEngagement) {
    strongestEngagementList.innerHTML = "";
    if (!topicEngagement || Object.keys(topicEngagement).length === 0) {
      strongestEngagementList.innerHTML = '<div class="empty-placeholder">No semantic topics recorded yet.</div>';
      return;
    }

    const sortedTopics = Object.values(topicEngagement)
      .sort((a, b) => b.engagementSignal - a.engagementSignal)
      .slice(0, 5);

    sortedTopics.forEach((item) => {
      const theme = typeof getTopicTheme === "function" ? getTopicTheme(item.topic) : { emoji: "🎯" };
      const row = document.createElement("div");
      row.className = "engagement-row";
      row.innerHTML = `
        <div class="eng-topic-info">
          <span class="eng-emoji">${theme.emoji}</span>
          <div>
            <div class="eng-name">${escapeHtml(item.topic)}</div>
            <div class="eng-meta">${item.shortsCount} Short${item.shortsCount > 1 ? "s" : ""} &bull; ${item.totalWatchTimeSeconds}s watch &bull; ${item.averageCompletionRate ? Math.round(item.averageCompletionRate * 100) + "% comp" : "N/A"}</div>
          </div>
        </div>
        <div class="eng-bar-wrap">
          <div class="eng-bar-fill" style="width: ${Math.max(8, item.engagementSignal)}%;"></div>
        </div>
        <div class="eng-score">${item.engagementSignal}</div>
      `;
      strongestEngagementList.appendChild(row);
    });
  }

  function renderBiggestRabbitHole(patterns, topicEngagement) {
    const rabbitHole = patterns?.find((p) => p.type === "RABBIT_HOLE");
    if (rabbitHole) {
      const topicData = topicEngagement?.[rabbitHole.topic] || {};
      const theme = typeof getTopicTheme === "function" ? getTopicTheme(rabbitHole.topic) : { emoji: "🐇" };
      rabbitHoleContent.innerHTML = `
        <div class="dossier-card">
          <div class="dossier-headline">${theme.emoji} ${escapeHtml(rabbitHole.topic)}</div>
          <div class="dossier-desc">${escapeHtml(rabbitHole.description)}</div>
          <div class="dossier-badge">${topicData.shortsCount || 3} related Shorts &bull; ${topicData.totalWatchTimeSeconds || 0}s cumulative</div>
        </div>
      `;
    } else {
      rabbitHoleContent.innerHTML = '<div class="empty-placeholder">No deep topic rabbit holes detected. Attention remained dispersed.</div>';
    }
  }

  function renderCuriositySpike(patterns, topicEngagement) {
    const spike = patterns?.find((p) => p.type === "CURIOSITY_SPIKE");
    if (spike) {
      const theme = typeof getTopicTheme === "function" ? getTopicTheme(spike.topic) : { emoji: "⚡" };
      curiositySpikeContent.innerHTML = `
        <div class="dossier-card">
          <div class="dossier-headline">${theme.emoji} ${escapeHtml(spike.topic)}</div>
          <div class="dossier-desc">${escapeHtml(spike.description)}</div>
          <div class="dossier-badge">Peak Focus: ${spike.metric}</div>
        </div>
      `;
    } else {
      curiositySpikeContent.innerHTML = '<div class="empty-placeholder">No sudden high-intensity curiosity spikes detected.</div>';
    }
  }

  function renderMostRewatched(byVideo, rawEvents) {
    const videos = Object.values(byVideo || {});
    const rewatched = videos.filter((v) => v.revisitCount > 0).sort((a, b) => b.revisitCount - a.revisitCount);

    if (rewatched.length > 0) {
      const top = rewatched[0];
      mostRewatchedContent.innerHTML = `
        <div class="dossier-card">
          <div class="dossier-headline">"${escapeHtml(top.title || top.videoId)}"</div>
          <div class="dossier-desc">Replayed across ${top.revisitCount + 1} separate visits. Total cumulative time: ${top.totalWatchTimeSeconds}s.</div>
          <div class="dossier-badge">Replayed ${top.revisitCount + 1} times &bull; ${top.revisitCount} revisit${top.revisitCount > 1 ? "s" : ""}</div>
        </div>
      `;
    } else {
      mostRewatchedContent.innerHTML = '<div class="empty-placeholder">No Shorts were re-encountered in this session.</div>';
    }
  }

  function renderMostSkipped(patterns, topicEngagement) {
    const rejection = patterns?.find((p) => p.type === "INSTANT_REJECTION");
    if (rejection) {
      mostSkippedContent.innerHTML = `
        <div class="dossier-card">
          <div class="dossier-headline">${escapeHtml(rejection.topic)}</div>
          <div class="dossier-desc">${escapeHtml(rejection.description)}</div>
          <div class="dossier-badge">${rejection.metric}</div>
        </div>
      `;
    } else {
      // Find topic with lowest completion
      const sortedBySkip = Object.values(topicEngagement || {})
        .filter((t) => t.instantSkipCount > 0)
        .sort((a, b) => b.instantSkipCount - a.instantSkipCount);

      if (sortedBySkip.length > 0) {
        const topSkip = sortedBySkip[0];
        mostSkippedContent.innerHTML = `
          <div class="dossier-card">
            <div class="dossier-headline">${escapeHtml(topSkip.topic)}</div>
            <div class="dossier-desc">Dismissed ${topSkip.instantSkipCount} times in under 2 seconds. Average completion: ${topSkip.averageCompletionRate ? Math.round(topSkip.averageCompletionRate * 100) : "0"}%.</div>
            <div class="dossier-badge">${topSkip.instantSkipCount} instant skips</div>
          </div>
        `;
      } else {
        mostSkippedContent.innerHTML = '<div class="empty-placeholder">No instant-rejection clusters recorded.</div>';
      }
    }
  }

  function renderObservations(summary, topicEngagement, patterns, byVideo, durSec) {
    observationsList.innerHTML = "";
    const observations = [];

    const totalViews = summary.totalShortsViewed || 0;
    const durMins = Math.round(durSec / 60);

    // Observation 1: Session Duration Irony
    if (durMins >= 10) {
      observations.push({
        quote: `"You came here for one Short. You stayed for ${durMins} minutes."`,
        sub: "MEASURED TIME CONSUMPTION"
      });
    } else if (durMins >= 1) {
      observations.push({
        quote: `"You consumed ${totalViews} Shorts in ${durMins} minute${durMins > 1 ? "s" : ""}. Rapid intake confirmed."`,
        sub: "VELOCITY PROFILE"
      });
    }

    // Observation 2: Top engagement dominance
    const topTopic = Object.values(topicEngagement || {}).sort((a, b) => b.engagementSignal - a.engagementSignal)[0];
    if (topTopic && topTopic.shortsCount >= 3) {
      observations.push({
        quote: `"${topTopic.topic} became a full-time occupation (${topTopic.shortsCount} Shorts, ${topTopic.totalWatchTimeSeconds}s)."`,
        sub: "PRIMARY ATTRACTION FACTOR"
      });
    }

    // Observation 3: Revisit commentary
    const topRewatched = Object.values(byVideo || {}).find((v) => v.revisitCount >= 2);
    if (topRewatched) {
      observations.push({
        quote: `"You revisited '${topRewatched.title.slice(0, 32)}...' ${topRewatched.revisitCount + 1} times. Apparently it mattered."`,
        sub: "OBSESSIVE LOOP DETECTED"
      });
    }

    // Observation 4: Quick rejection commentary
    const rejected = patterns?.find((p) => p.type === "INSTANT_REJECTION");
    if (rejected) {
      observations.push({
        quote: `"${rejected.topic} survived an average of approximately 1.8 seconds before being rejected."`,
        sub: "INSTANT DISMISSAL RATE"
      });
    } else if (summary.instantSkipCount >= 3) {
      observations.push({
        quote: `"You discarded ${summary.instantSkipCount} Shorts in under 2 seconds. Zero patience threshold detected."`,
        sub: "INSTANT SKIP VELOCITY"
      });
    }

    // Observation 5: Gravity commentary
    const gravity = patterns?.find((p) => p.type === "TOPIC_GRAVITY");
    if (gravity) {
      observations.push({
        quote: `"${gravity.topic} kept pulling you back across the session like an inescapable gravitational field."`,
        sub: "ATTENTION GRAVITY WELL"
      });
    }

    // Fallback observation if brief session
    if (observations.length === 0) {
      observations.push({
        quote: `"Session telemetry gathered across ${totalViews} Shorts. Continue scrolling to uncover deeper attention sinks."`,
        sub: "PRELIMINARY DOSSIER"
      });
    }

    observations.forEach((obs) => {
      const bubble = document.createElement("div");
      bubble.className = "observation-bubble";
      bubble.innerHTML = `
        <div class="obs-quote">${escapeHtml(obs.quote)}</div>
        <div class="obs-sub">${escapeHtml(obs.sub)}</div>
      `;
      observationsList.appendChild(bubble);
    });
  }

  function renderEmptyDossier() {
    statDurationEl.textContent = "0s";
    statTotalShortsEl.textContent = "0";
    statUniqueShortsEl.textContent = "0";
    statRevisitsEl.textContent = "0";
    statTopicsCountEl.textContent = "0";
    statAvgCompletionEl.textContent = "0%";
    if (trailVisualizer) trailVisualizer.loadData([]);
  }

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  refreshBtn.addEventListener("click", () => {
    loadReport();
  });

  closeBtn.addEventListener("click", () => {
    window.close();
  });

  // Initial load
  loadReport();
});
