/**
 * Scrollopsy - Content Understanding Layer (Phase 6)
 * 
 * Extracts rendered page metadata and targeted visual context from active YouTube Shorts.
 * Non-intrusive: Does NOT download or stream complete video, only takes up to 3 tiny snapshots
 * for sustained views and skips visual capture for instant skips.
 */

const CONTENT_THRESHOLDS = {
  MIN_WATCH_FOR_EARLY_SNAP_MS: 1500,  // First snapshot after 1.5s
  MIN_WATCH_FOR_MID_SNAP_MS: 5000,    // Second snapshot after 5.0s
  MIN_WATCH_FOR_LATE_SNAP_MS: 10000,  // Third snapshot after 10.0s
  SNAPSHOT_WIDTH: 160,                // Tiny thumbnail width to prevent storage bloat
  SNAPSHOT_JPEG_QUALITY: 0.6          // Compressed JPEG
};

/**
 * Extracts rendered textual metadata for the currently active YouTube Short.
 * @param {string} videoId - Current Short video ID
 * @returns {Object} Extracted rendered text metadata
 */
function extractRenderedShortMetadata(videoId) {
  const result = {
    videoId: videoId || "unknown",
    title: "",
    description: "",
    channel: "",
    hashtags: [],
    visibleText: ""
  };

  try {
    // 1. Identify active Short renderer or active player container
    const activeRenderer = document.querySelector("ytd-reel-video-renderer[is-active]") || document.querySelector("ytd-reel-video-renderer");
    const container = activeRenderer || document;

    // 2. Title extraction
    const titleEl = container.querySelector("#title, h2.title, .ytd-reel-player-header-renderer .title, #overlay-title");
    result.title = (titleEl ? titleEl.textContent : document.title || "").trim();
    // Clean up generic "YouTube" title if possible
    if (result.title.endsWith(" - YouTube")) {
      result.title = result.title.replace(/ - YouTube$/, "").trim();
    }

    // 3. Channel name extraction
    const channelEl = container.querySelector(
      "#channel-name, ytd-channel-name a, .ytd-reel-player-header-renderer a.ytd-channel-name, #text.ytd-channel-name"
    );
    result.channel = channelEl ? channelEl.textContent.trim() : "";

    // 4. Description extraction
    const descEl = container.querySelector(
      "#description, .ytd-reel-player-overlay-renderer #description, #snippet, yt-formatted-string.ytd-text-inline-expander"
    );
    result.description = descEl ? descEl.textContent.trim() : "";

    // 5. Hashtags extraction (from chips, title, and description)
    const hashtagSet = new Set();
    // From rendered chip links
    const hashtagLinks = container.querySelectorAll('a[href*="/hashtag/"]');
    hashtagLinks.forEach((link) => {
      const tag = link.textContent.trim();
      if (tag) hashtagSet.add(tag.startsWith("#") ? tag : `#${tag}`);
    });

    // Regex extract from title & description
    const fullText = `${result.title} ${result.description}`;
    const regexTags = fullText.match(/#[\w\u0590-\u05ff]+/g) || [];
    regexTags.forEach((tag) => hashtagSet.add(tag));
    result.hashtags = Array.from(hashtagSet);

    // 6. Visible captions & other on-screen text
    const captionEl = document.querySelector(".ytp-caption-segment, .caption-window, .ytp-caption-window-rollup");
    const captions = captionEl ? captionEl.textContent.trim() : "";

    // Audio/Music title
    const soundEl = container.querySelector(
      "#sound-metadata, .yt-spec-button-shape-next__button-text-content, #audio-scrubber"
    );
    const soundTitle = soundEl ? soundEl.textContent.trim() : "";

    // Combine contextual visible text
    const contextParts = [];
    if (captions) contextParts.push(`Captions: "${captions}"`);
    if (soundTitle) contextParts.push(`Sound: "${soundTitle}"`);
    result.visibleText = contextParts.join(" | ");

  } catch (err) {
    console.warn("[SCROLLOPSY] Metadata extraction partial error:", err);
  }

  return result;
}

/**
 * Captures a single low-resolution thumbnail snapshot from the active HTML5 <video> element.
 * Safe & non-intrusive: returns null on CORS, DRM, or missing video without throwing.
 * @returns {string|null} base64 JPEG data URL or null
 */
function captureVideoSnapshot() {
  try {
    // Locate the active video element
    const video = document.querySelector("ytd-reel-video-renderer[is-active] video") ||
                  document.querySelector("#shorts-player video") ||
                  document.querySelector("video");

    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement("canvas");
    const targetWidth = CONTENT_THRESHOLDS.SNAPSHOT_WIDTH;
    const aspectRatio = video.videoHeight / video.videoWidth;
    const targetHeight = Math.round(targetWidth * aspectRatio) || 284;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", CONTENT_THRESHOLDS.SNAPSHOT_JPEG_QUALITY);
  } catch (err) {
    // CORS or security restriction on video element - fail gracefully
    return null;
  }
}

/**
 * Active Content Collector to manage snapshots over the lifecycle of a viewing event.
 */
class ViewingContentCollector {
  constructor(videoId, initialMetadata) {
    this.videoId = videoId;
    this.metadata = initialMetadata || extractRenderedShortMetadata(videoId);
    this.snapshots = [];
    this.capturedAt = [];
    this.startTime = Date.now();
    this.timers = [];

    // Schedule up to 3 non-intrusive snapshots for sustained views
    this.scheduleSnapshots();
  }

  scheduleSnapshots() {
    // Early snapshot (1.5s)
    this.timers.push(
      setTimeout(() => this.attemptSnapshot("early"), CONTENT_THRESHOLDS.MIN_WATCH_FOR_EARLY_SNAP_MS)
    );
    // Mid snapshot (5.0s)
    this.timers.push(
      setTimeout(() => this.attemptSnapshot("mid"), CONTENT_THRESHOLDS.MIN_WATCH_FOR_MID_SNAP_MS)
    );
    // Late snapshot (10.0s)
    this.timers.push(
      setTimeout(() => this.attemptSnapshot("late"), CONTENT_THRESHOLDS.MIN_WATCH_FOR_LATE_SNAP_MS)
    );
  }

  attemptSnapshot(phase) {
    if (this.snapshots.length >= 3) return;
    const snap = captureVideoSnapshot();
    if (snap) {
      this.snapshots.push(snap);
      this.capturedAt.push(Date.now() - this.startTime);
    }
  }

  finalize() {
    // Clear any pending timers
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];

    // Refresh rendered text in case elements (title, captions, description) loaded late
    const latestText = extractRenderedShortMetadata(this.videoId);
    if (latestText.title && (!this.metadata.title || this.metadata.title === "YouTube")) {
      this.metadata.title = latestText.title;
    }
    if (latestText.description && !this.metadata.description) {
      this.metadata.description = latestText.description;
    }
    if (latestText.channel && !this.metadata.channel) {
      this.metadata.channel = latestText.channel;
    }
    if (latestText.hashtags && latestText.hashtags.length > 0) {
      this.metadata.hashtags = latestText.hashtags;
    }
    if (latestText.visibleText) {
      this.metadata.visibleText = latestText.visibleText;
    }

    return {
      videoId: this.videoId,
      title: this.metadata.title || "YouTube Short",
      description: this.metadata.description || "",
      channel: this.metadata.channel || "Unknown Channel",
      hashtags: this.metadata.hashtags || [],
      visibleText: this.metadata.visibleText || "",
      visualContext: {
        snapshotCount: this.snapshots.length,
        snapshots: this.snapshots,
        capturedAt: this.capturedAt
      }
    };
  }
}

// Module export for Node/testing and window global for Chrome Extension
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    extractRenderedShortMetadata,
    captureVideoSnapshot,
    ViewingContentCollector,
    CONTENT_THRESHOLDS
  };
}

if (typeof window !== "undefined") {
  window.ScrollopsyContent = {
    extractRenderedShortMetadata,
    captureVideoSnapshot,
    ViewingContentCollector,
    CONTENT_THRESHOLDS
  };
}
