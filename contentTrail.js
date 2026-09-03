/**
 * Scrollopsy - Interactive Content Trail / Train Visualizer (Phase 11)
 * 
 * Visualizes the chronological attention journey as a dynamic, interactive content trail.
 * - Node size scales with engagement score / watch duration.
 * - Nodes share color palettes by semantic topic cluster.
 * - Arced backward loops illustrate revisits (A -> B -> A).
 * - Rabbit holes display as glowing, branched clusters.
 * - Interactive: Hover/click reveals detailed forensic inspection tooltip.
 */

// Topic Color Palette for Visual Consistency
const TOPIC_PALETTE = {
  "Formula 1": { border: "#ff1801", fill: "rgba(255, 24, 1, 0.25)", text: "#ff8b80", emoji: "🏎️" },
  "Motorsport": { border: "#e10600", fill: "rgba(225, 6, 0, 0.25)", text: "#ff7670", emoji: "🏁" },
  "Basketball": { border: "#ff7700", fill: "rgba(255, 119, 0, 0.25)", text: "#ffb070", emoji: "🏀" },
  "Sports": { border: "#ff9900", fill: "rgba(255, 153, 0, 0.25)", text: "#ffc270", emoji: "🏅" },
  "Food": { border: "#ffb703", fill: "rgba(255, 183, 3, 0.25)", text: "#ffe082", emoji: "🍛" },
  "Cooking": { border: "#fb8500", fill: "rgba(251, 133, 0, 0.25)", text: "#ffc570", emoji: "🍳" },
  "Animals": { border: "#06d6a0", fill: "rgba(6, 214, 160, 0.25)", text: "#80ffd9", emoji: "🐱" },
  "Pets": { border: "#118ab2", fill: "rgba(17, 138, 178, 0.25)", text: "#7ce3ff", emoji: "🐶" },
  "Science": { border: "#4cc9f0", fill: "rgba(76, 201, 240, 0.25)", text: "#a6ebff", emoji: "🌌" },
  "Physics": { border: "#4361ee", fill: "rgba(67, 97, 238, 0.25)", text: "#9fb0ff", emoji: "⚛️" },
  "Technology": { border: "#7209b7", fill: "rgba(114, 9, 183, 0.25)", text: "#d18cff", emoji: "💻" },
  "Software": { border: "#560bad", fill: "rgba(86, 11, 173, 0.25)", text: "#b97bff", emoji: "⚙️" },
  "Gaming": { border: "#b5179e", fill: "rgba(181, 23, 158, 0.25)", text: "#f279e0", emoji: "🎮" },
  "Finance": { border: "#2a9d8f", fill: "rgba(42, 157, 143, 0.25)", text: "#84e6d9", emoji: "📈" },
  "Crypto": { border: "#e76f51", fill: "rgba(231, 111, 81, 0.25)", text: "#ffab94", emoji: "🪙" },
  "Comedy": { border: "#ffd166", fill: "rgba(255, 209, 102, 0.25)", text: "#fff0a3", emoji: "😂" },
  "Memes": { border: "#f72585", fill: "rgba(247, 37, 133, 0.25)", text: "#ff82ba", emoji: "💀" },
  "Music": { border: "#9d4edd", fill: "rgba(157, 78, 221, 0.25)", text: "#dcb0ff", emoji: "🎵" },
  "Fitness": { border: "#00f5d4", fill: "rgba(0, 245, 212, 0.25)", text: "#85ffed", emoji: "💪" },
  "Default": { border: "#8b92b0", fill: "rgba(139, 146, 176, 0.2)", text: "#cbd1ea", emoji: "🎬" }
};

function getTopicTheme(topicName) {
  if (!topicName) return TOPIC_PALETTE.Default;
  for (const key of Object.keys(TOPIC_PALETTE)) {
    if (topicName.toLowerCase().includes(key.toLowerCase())) {
      return TOPIC_PALETTE[key];
    }
  }
  return TOPIC_PALETTE.Default;
}

class ContentTrailVisualizer {
  constructor(canvasElement, tooltipElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.tooltip = tooltipElement;
    this.nodes = [];
    this.revisitArcs = [];
    this.hoveredNode = null;
    this.selectedNode = null;
    this.animFrame = null;

    this.setupListeners();
  }

  setupListeners() {
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("mouseleave", () => this.handleMouseLeave());
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
    window.addEventListener("resize", () => this.render());
  }

  loadData(views, patterns = []) {
    this.views = views || [];
    this.patterns = patterns || [];
    this.layoutNodes();
    this.render();
  }

  layoutNodes() {
    if (!this.views || this.views.length === 0) return;

    // Set canvas dimensions
    const container = this.canvas.parentElement;
    const width = container ? container.clientWidth : 900;
    const height = 480;
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.nodes = [];
    this.revisitArcs = [];

    const paddingX = 70;
    const availableWidth = width - paddingX * 2;
    const count = this.views.length;
    const stepX = count > 1 ? availableWidth / (count - 1) : 0;
    const centerY = height / 2;

    // Track previously visited video IDs to calculate revisit arcs
    const videoFirstNodeIndex = {};

    this.views.forEach((ev, index) => {
      const vId = ev.videoId || ev.id;
      const primaryTopic = ev.semantics?.topics?.[0] || "Other";
      const theme = getTopicTheme(primaryTopic);

      // Node radius based on watch duration & completion rate (min 16, max 38)
      const watchSec = (ev.watchDurationMs || 0) / 1000;
      const compRate = ev.completionRate || 0;
      let radius = 16;

      if (ev.isInstantSkip || watchSec < 2) {
        radius = 12; // Diminutive instant skip dot
      } else if (compRate >= 1.0 || watchSec >= 30) {
        radius = 34; // Large high-engagement hub
      } else if (compRate >= 0.7 || watchSec >= 15) {
        radius = 26; // Medium-large view
      } else {
        radius = 20; // Moderate view
      }

      // Sine wave undulating trail path
      const yOffset = Math.sin((index / Math.max(1, count)) * Math.PI * 3) * 60;
      const x = count === 1 ? width / 2 : paddingX + index * stepX;
      const y = centerY + yOffset;

      const node = {
        index: index,
        x: x,
        y: y,
        radius: radius,
        view: ev,
        topic: primaryTopic,
        theme: theme,
        isInstantSkip: ev.isInstantSkip || watchSec < 2,
        isRevisit: ev.isRevisit,
        pulseOffset: Math.random() * Math.PI * 2
      };

      this.nodes.push(node);

      // Revisit arc check (A -> ... -> A)
      if (videoFirstNodeIndex[vId] !== undefined) {
        const sourceIndex = videoFirstNodeIndex[vId];
        this.revisitArcs.push({
          sourceIndex: sourceIndex,
          targetIndex: index,
          videoId: vId,
          topic: primaryTopic
        });
      } else {
        videoFirstNodeIndex[vId] = index;
      }
    });
  }

  render() {
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    if (this.nodes.length === 0) {
      this.renderEmptyState(width, height);
      return;
    }

    // 1. Draw connecting timeline baseline between sequential nodes
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(139, 146, 176, 0.25)";
    ctx.setLineDash([4, 4]);

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (i === 0) {
        ctx.moveTo(node.x, node.y);
      } else {
        const prev = this.nodes[i - 1];
        const cpX = (prev.x + node.x) / 2;
        ctx.quadraticCurveTo(cpX, prev.y, node.x, node.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 2. Draw Revisit Arcs (curving backward loops)
    this.revisitArcs.forEach((arc) => {
      const source = this.nodes[arc.sourceIndex];
      const target = this.nodes[arc.targetIndex];
      if (!source || !target) return;

      ctx.beginPath();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = source.theme.border;
      ctx.shadowColor = source.theme.border;
      ctx.shadowBlur = 10;

      // Arc height arches upward above the nodes
      const midX = (source.x + target.x) / 2;
      const distance = Math.abs(target.x - source.x);
      const arcControlY = Math.min(source.y, target.y) - Math.min(120, distance * 0.4);

      ctx.moveTo(source.x, source.y - source.radius);
      ctx.quadraticCurveTo(midX, arcControlY, target.x, target.y - target.radius);
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw revisit loop badge in center of arc
      ctx.fillStyle = source.theme.border;
      ctx.beginPath();
      ctx.arc(midX, arcControlY + 14, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("↻", midX, arcControlY + 14);
    });

    // 3. Draw Nodes
    this.nodes.forEach((node, idx) => {
      const isHovered = this.hoveredNode === node;
      const isSelected = this.selectedNode === node;

      // Outer glow for sustained/engaging nodes
      if (node.radius >= 26 || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = node.theme.fill;
        ctx.fill();
      }

      // Base Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.isInstantSkip ? "rgba(30, 33, 48, 0.85)" : node.theme.fill;
      ctx.fill();

      ctx.lineWidth = isHovered || isSelected ? 3.5 : (node.isInstantSkip ? 1.5 : 2.5);
      ctx.strokeStyle = isHovered ? "#ffffff" : node.theme.border;
      ctx.stroke();

      // Node Emoji / Content Glyph
      ctx.font = `${Math.max(10, Math.round(node.radius * 0.9))}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.theme.emoji, node.x, node.y);

      // Chronological step pill below node
      ctx.fillStyle = "#161824";
      const stepLabel = `#${idx + 1}`;
      ctx.font = "bold 10px monospace";
      const textMetrics = ctx.measureText(stepLabel);
      const pillW = textMetrics.width + 10;
      const pillH = 16;
      const pillY = node.y + node.radius + 6;

      ctx.beginPath();
      ctx.roundRect(node.x - pillW / 2, pillY, pillW, pillH, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = node.theme.text;
      ctx.fillText(stepLabel, node.x, pillY + pillH / 2);
    });
  }

  renderEmptyState(width, height) {
    const ctx = this.ctx;
    ctx.fillStyle = "#8b92b0";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("No Shorts viewing events recorded in active session.", width / 2, height / 2);
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let hitNode = null;
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dist = Math.hypot(mouseX - node.x, mouseY - node.y);
      if (dist <= node.radius + 8) {
        hitNode = node;
        break;
      }
    }

    if (hitNode !== this.hoveredNode) {
      this.hoveredNode = hitNode;
      this.render();
      if (hitNode) {
        this.showTooltip(hitNode, e.clientX, e.clientY);
      } else {
        this.hideTooltip();
      }
    } else if (hitNode) {
      this.positionTooltip(e.clientX, e.clientY);
    }
  }

  handleMouseLeave() {
    this.hoveredNode = null;
    this.hideTooltip();
    this.render();
  }

  handleClick(e) {
    if (this.hoveredNode) {
      this.selectedNode = this.hoveredNode;
      this.render();
      if (typeof this.onNodeClick === "function") {
        this.onNodeClick(this.hoveredNode.view);
      }
    }
  }

  showTooltip(node, clientX, clientY) {
    if (!this.tooltip) return;
    const ev = node.view;
    const watchSec = ((ev.watchDurationMs || 0) / 1000).toFixed(1);
    const videoSec = ev.videoDurationMs ? `${(ev.videoDurationMs / 1000).toFixed(1)}s` : "Unknown";
    const compPercent = ev.completionRate !== null ? `${Math.round(ev.completionRate * 100)}%` : "N/A";
    const snapshot = ev.content?.visualContext?.snapshots?.[0];

    let html = `
      <div class="trail-tt-header" style="border-left: 3px solid ${node.theme.border};">
        <div class="trail-tt-badge">${node.theme.emoji} ${node.topic} &bull; Step #${node.index + 1}</div>
        <div class="trail-tt-title">${this.escapeHtml(ev.title || "YouTube Short")}</div>
      </div>
      <div class="trail-tt-stats">
        <div class="trail-tt-stat"><span>Watch:</span> <strong>${watchSec}s</strong></div>
        <div class="trail-tt-stat"><span>Length:</span> <strong>${videoSec}</strong></div>
        <div class="trail-tt-stat"><span>Completion:</span> <strong>${compPercent}</strong></div>
        ${node.isRevisit ? '<div class="trail-tt-stat highlight"><strong>🔄 Revisit</strong></div>' : ''}
        ${node.isInstantSkip ? '<div class="trail-tt-stat danger"><strong>⚡ Instant Skip</strong></div>' : ''}
      </div>
    `;

    if (snapshot) {
      html += `<div class="trail-tt-thumb"><img src="${snapshot}" alt="Thumbnail" /></div>`;
    }

    this.tooltip.innerHTML = html;
    this.tooltip.classList.remove("hidden");
    this.positionTooltip(clientX, clientY);
  }

  positionTooltip(clientX, clientY) {
    if (!this.tooltip) return;
    const offset = 16;
    let x = clientX + offset;
    let y = clientY + offset;

    const ttWidth = 260;
    const ttHeight = 160;

    if (x + ttWidth > window.innerWidth) x = clientX - ttWidth - offset;
    if (y + ttHeight > window.innerHeight) y = clientY - ttHeight - offset;

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.add("hidden");
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

if (typeof window !== "undefined") {
  window.ContentTrailVisualizer = ContentTrailVisualizer;
  window.TOPIC_PALETTE = TOPIC_PALETTE;
}
