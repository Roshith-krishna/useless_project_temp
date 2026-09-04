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
  const mostRewatchedContent = document.getElementById("most-rewatched-content");
  const mostSkippedContent = document.getElementById("most-skipped-content");
  const retentionGraphEl = document.getElementById("retention-graph");

  const refreshBtn = document.getElementById("refresh-report-btn");
  const closeBtn = document.getElementById("close-report-btn");

  const heatmapEl = document.getElementById("trail-heatmap");
  const tooltipEl = document.getElementById("trail-tooltip");
  const graphTopicColors = ["#78a9b4", "#a89a6a", "#9a86a8", "#789b87", "#ad8179", "#7e91af", "#aa8c68", "#849ba0"];
  const graphTopicColorMap = new Map();

  function getGraphTopicColor(topic) {
    if (!graphTopicColorMap.has(topic)) {
      graphTopicColorMap.set(topic, graphTopicColors[graphTopicColorMap.size % graphTopicColors.length]);
    }
    return graphTopicColorMap.get(topic);
  }

  function renderHeatmap(views) {
    if (!heatmapEl) return;
    heatmapEl.innerHTML = "";
    if (!views || views.length === 0) {
      heatmapEl.innerHTML = '<div class="heatmap-empty">No Shorts viewing events recorded in active session.</div>';
      return;
    }

    const topics = [...new Set(views.map((view) => view.semantics?.topics?.[0] || "Other"))];
    const grid = document.createElement("div");
    grid.className = "heatmap-grid";
    grid.style.setProperty("--event-count", views.length);

    const corner = document.createElement("div");
    corner.className = "heatmap-corner";
    corner.textContent = "TOPIC / ORDER";
    grid.appendChild(corner);

    views.forEach((_, index) => {
      const label = document.createElement("div");
      label.className = "heatmap-step";
      label.textContent = `#${index + 1}`;
      grid.appendChild(label);
    });

    topics.forEach((topic) => {
      const theme = typeof getTopicTheme === "function" ? getTopicTheme(topic) : { border: "#8b92b0", text: "#cbd1ea" };
      const topicLabel = document.createElement("div");
      topicLabel.className = "heatmap-topic";
      topicLabel.style.setProperty("--topic-color", getGraphTopicColor(topic));
      topicLabel.innerHTML = `<span>${theme.emoji || "🎬"}</span><strong>${escapeHtml(topic)}</strong>`;
      grid.appendChild(topicLabel);

      views.forEach((view, index) => {
        const cell = document.createElement("button");
        const viewTopic = view.semantics?.topics?.[0] || "Other";
        const watchSeconds = (view.watchDurationMs || 0) / 1000;
        const completion = Math.max(0, Math.min(1, view.completionRate || 0));
        const intensity = viewTopic === topic ? Math.max(0.18, Math.min(1, completion * 0.65 + Math.min(watchSeconds / 30, 1) * 0.35)) : 0;
        const marker = viewTopic !== topic ? "" : view.isRevisit ? "↻" : view.isInstantSkip || watchSeconds < 2 ? "×" : "";

        cell.className = `heatmap-cell${intensity ? " active" : ""}`;
        cell.type = "button";
        cell.style.setProperty("--cell-color", getGraphTopicColor(topic));
        cell.style.setProperty("--cell-intensity", intensity.toFixed(2));
        cell.setAttribute("aria-label", `Step #${index + 1}, ${viewTopic}, ${Math.round(completion * 100)}% completion`);
        cell.textContent = marker;
        cell.addEventListener("mouseenter", (event) => showHeatmapTooltip(cell, view, viewTopic, index, event));
        cell.addEventListener("mouseleave", hideHeatmapTooltip);
        cell.addEventListener("click", () => cell.classList.toggle("selected"));
        grid.appendChild(cell);
      });
    });

    heatmapEl.appendChild(grid);
  }

  function showHeatmapTooltip(cell, view, topic, index, event) {
    if (!tooltipEl) return;
    const watchSeconds = ((view.watchDurationMs || 0) / 1000).toFixed(1);
    const completion = `${Math.round((view.completionRate || 0) * 100)}%`;
    tooltipEl.innerHTML = `<div class="trail-tt-header"><div class="trail-tt-badge">Step #${index + 1} &bull; ${escapeHtml(topic)}</div><div class="trail-tt-title">${escapeHtml(view.title || "YouTube Short")}</div></div><div class="trail-tt-stats"><div class="trail-tt-stat"><span>Watch:</span> <strong>${watchSeconds}s</strong></div><div class="trail-tt-stat"><span>Completion:</span> <strong>${completion}</strong></div></div>`;
    tooltipEl.classList.remove("hidden");
    tooltipEl.style.left = `${event.clientX + 16}px`;
    tooltipEl.style.top = `${event.clientY + 16}px`;
  }

  function hideHeatmapTooltip() {
    if (tooltipEl) tooltipEl.classList.add("hidden");
  }

  function renderTrajectoryGraphs(views) {
    renderRetentionGraph(views);
  }

  function renderRetentionGraph(views) {
    if (!retentionGraphEl) return;
    if (!views || views.length === 0) {
      retentionGraphEl.innerHTML = '<div class="graph-empty">No retention data recorded.</div>';
      return;
    }

    const width = Math.max(560, views.length * 72);
    const height = 240;
    const pad = { top: 18, right: 18, bottom: 30, left: 34 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const points = views.map((view, index) => {
      const rate = Math.max(0, Math.min(1, view.completionRate || 0));
      return { x: pad.left + (views.length === 1 ? plotWidth / 2 : index * plotWidth / (views.length - 1)), y: pad.top + (1 - rate) * plotHeight, rate };
    });
    const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    const area = `${line} L ${points[points.length - 1].x} ${height - pad.bottom} L ${points[0].x} ${height - pad.bottom} Z`;
    const guides = [0, 0.5, 1].map((value) => {
      const y = pad.top + (1 - value) * plotHeight;
      return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="graph-guide"/><text x="${pad.left - 8}" y="${y + 4}" class="graph-axis-label">${value * 100}%</text>`;
    }).join("");
    const dots = points.map((point, index) => `<circle cx="${point.x}" cy="${point.y}" r="4" class="retention-point"><title>Short #${index + 1}: ${Math.round(point.rate * 100)}% completion</title></circle><text x="${point.x}" y="${height - 9}" class="graph-step-label">#${index + 1}</text>`).join("");
    retentionGraphEl.innerHTML = `<div class="graph-scroll"><svg style="width:${width}px;height:${height}px" viewBox="0 0 ${width} ${height}" role="img" aria-label="Retention rate by Short"><g>${guides}<path d="${area}" class="retention-area"/><path d="${line}" class="retention-line"/>${dots}</g></svg></div>`;
  }

  function loadReport() {
    chrome.storage.local.get(["currentSession", "lastAutopsySession"], (res) => {
      let session = res.currentSession;
      let shouldClearActive = false;

      const currentEvents = session && (session.views || session.shorts);
      if (session && Array.isArray(currentEvents) && currentEvents.length > 0) {
        shouldClearActive = true;
      } else if (res.lastAutopsySession) {
        session = res.lastAutopsySession;
      }

      if (!session) {
        renderEmptyDossier();
        updateStatusBadge("No Recorded Session Found", false);
        return;
      }

      renderDossier(session);

      if (shouldClearActive) {
        // Archive current session for persistent dossier viewing
        chrome.storage.local.set({ lastAutopsySession: session }, () => {
          // Auto-clear active session storage so the next YouTube Shorts visit starts fresh!
          chrome.storage.local.remove(["currentSession"], () => {
            console.log("[Scrollopsy Report] Session storage auto-cleared. Archived to lastAutopsySession.");
            updateStatusBadge("Storage Auto-Cleared • Ready For Next Session", true);
          });
        });
      } else {
        updateStatusBadge("Archived Dossier • Active Storage Clean", true);
      }
    });
  }

  function updateStatusBadge(text, visible) {
    const badge = document.getElementById("session-status-badge");
    if (!badge) return;
    if (visible) {
      badge.textContent = text;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
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
    renderHeatmap(rawEvents);
    renderTrajectoryGraphs(rawEvents);

    // 4. Section 1: STRONGEST ENGAGEMENT
    renderStrongestEngagement(topicEngagement);

    // 5. Section 2: MOST REWATCHED
    renderMostRewatched(byVideo, rawEvents);

    // 6. Section 3: MOST AGGRESSIVELY SKIPPED
    renderMostSkipped(patterns, topicEngagement);
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

  function renderEmptyDossier() {
    statDurationEl.textContent = "0s";
    statTotalShortsEl.textContent = "0";
    statUniqueShortsEl.textContent = "0";
    statRevisitsEl.textContent = "0";
    statTopicsCountEl.textContent = "0";
    statAvgCompletionEl.textContent = "0%";
    renderHeatmap([]);
    renderTrajectoryGraphs([]);
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
