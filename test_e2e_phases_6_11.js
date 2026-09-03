const { analyzeSemanticsLocally } = require("./semanticEngine.js");
const { analyzeSessionBehavior } = require("./behaviorAnalysis.js");
const { aggregateTopicEngagement, detectScrollingPatterns } = require("./patternDetector.js");

console.log("=== Running End-to-End Simulation of Phases 6 - 11 ===");

// 1. Simulate Session with distinct Shorts
const rawViews = [
  {
    id: "view_101",
    videoId: "f1_monaco",
    url: "https://www.youtube.com/shorts/f1_monaco",
    title: "Ferrari Pit Strategy Failure at Monaco GP #f1 #ferrari",
    startedAt: "2026-09-04T04:40:00.000Z",
    endedAt: "2026-09-04T04:40:35.000Z",
    watchDurationMs: 35000,
    videoDurationMs: 38000,
    completionRate: 0.92,
    content: {
      videoId: "f1_monaco",
      title: "Ferrari Pit Strategy Failure at Monaco GP #f1 #ferrari",
      channel: "F1 Insights",
      hashtags: ["#f1", "#ferrari", "#monaco"],
      visibleText: "Sound: F1 Theme"
    }
  },
  {
    id: "view_102",
    videoId: "f1_tyres",
    url: "https://www.youtube.com/shorts/f1_tyres",
    title: "Red Bull Undercut Explained in 30 Seconds #f1 #redbull",
    startedAt: "2026-09-04T04:40:35.000Z",
    endedAt: "2026-09-04T04:41:05.000Z",
    watchDurationMs: 30000,
    videoDurationMs: 32000,
    completionRate: 0.94,
    content: {
      videoId: "f1_tyres",
      title: "Red Bull Undercut Explained in 30 Seconds #f1 #redbull",
      channel: "F1 Insights",
      hashtags: ["#f1", "#redbull", "#racing"],
      visibleText: "Captions: Verstappen pits on lap 18"
    }
  },
  {
    id: "view_103",
    videoId: "f1_radio",
    url: "https://www.youtube.com/shorts/f1_radio",
    title: "Funniest Team Radios of 2026 #f1",
    startedAt: "2026-09-04T04:41:05.000Z",
    endedAt: "2026-09-04T04:41:30.000Z",
    watchDurationMs: 25000,
    videoDurationMs: 30000,
    completionRate: 0.83,
    content: {
      videoId: "f1_radio",
      title: "Funniest Team Radios of 2026 #f1",
      channel: "PitLaneMemes",
      hashtags: ["#f1", "#comedy"],
      visibleText: "Sound: Team Radio"
    }
  },
  {
    id: "view_104",
    videoId: "crypto_moon",
    url: "https://www.youtube.com/shorts/crypto_moon",
    title: "Buy this 1000x crypto coin before tomorrow! #crypto #bitcoin",
    startedAt: "2026-09-04T04:41:30.000Z",
    endedAt: "2026-09-04T04:41:31.400Z",
    watchDurationMs: 1400, // Instant skip!
    videoDurationMs: 40000,
    completionRate: 0.035,
    content: {
      videoId: "crypto_moon",
      title: "Buy this 1000x crypto coin before tomorrow! #crypto #bitcoin",
      channel: "CryptoGuru",
      hashtags: ["#crypto", "#bitcoin", "#investing"],
      visibleText: "Sound: Alert"
    }
  },
  {
    id: "view_105",
    videoId: "quantum_tunneling",
    url: "https://www.youtube.com/shorts/quantum_tunneling",
    title: "Quantum Tunneling Explained Simply #physics #science",
    startedAt: "2026-09-04T04:41:32.000Z",
    endedAt: "2026-09-04T04:42:17.000Z",
    watchDurationMs: 45000,
    videoDurationMs: 45000,
    completionRate: 1.0, // 100% completion Curiosity Spike!
    content: {
      videoId: "quantum_tunneling",
      title: "Quantum Tunneling Explained Simply #physics #science",
      channel: "VeritasScience",
      hashtags: ["#physics", "#science", "#quantum"],
      visibleText: "Captions: Particles can pass through barriers"
    }
  },
  {
    id: "view_106",
    videoId: "f1_monaco", // REVISIT!
    url: "https://www.youtube.com/shorts/f1_monaco",
    title: "Ferrari Pit Strategy Failure at Monaco GP #f1 #ferrari",
    startedAt: "2026-09-04T04:42:18.000Z",
    endedAt: "2026-09-04T04:42:58.000Z",
    watchDurationMs: 40000,
    videoDurationMs: 38000,
    completionRate: 1.05,
    content: {
      videoId: "f1_monaco",
      title: "Ferrari Pit Strategy Failure at Monaco GP #f1 #ferrari",
      channel: "F1 Insights",
      hashtags: ["#f1", "#ferrari", "#monaco"],
      visibleText: "Sound: F1 Theme"
    }
  }
];

// Phase 7: Run semantic categorization on all views
rawViews.forEach((v) => {
  v.semantics = analyzeSemanticsLocally(v.content);
});

console.log("Phase 7: All 6 views categorized into semantic fingerprints.");
rawViews.forEach((v, i) => {
  console.log(`  [View ${i + 1}] "${v.title.slice(0, 35)}..." -> Topics: [${v.semantics.topics.join(", ")}]`);
});

// Phase 8: Behavioral analysis and topic aggregation
const session = {
  id: "session_simulation_e2e",
  startedAt: "2026-09-04T04:40:00.000Z",
  endedAt: "2026-09-04T04:43:00.000Z",
  views: rawViews
};

const behavior = analyzeSessionBehavior(session);
const topicEngagement = aggregateTopicEngagement(behavior.events);
console.log("\nPhase 8: Topic Engagement Scores:");
Object.values(topicEngagement).forEach((t) => {
  console.log(`  • ${t.topic}: Score ${t.engagementSignal}/100 (${t.shortsCount} Shorts, ${t.totalWatchTimeSeconds}s, ${(t.averageCompletionRate * 100).toFixed(0)}% comp, ${t.revisitCount} revisits)`);
});

// Phase 9: Pattern Detection
const patterns = detectScrollingPatterns(behavior.events, topicEngagement);
console.log(`\nPhase 9: Detected ${patterns.length} Scrolling Patterns:`);
patterns.forEach((p) => {
  console.log(`  [${p.badge}] ${p.headline} -> ${p.metric}`);
});

// Check expected patterns:
const hasRabbitHole = patterns.some((p) => p.type === "RABBIT_HOLE");
const hasCuriositySpike = patterns.some((p) => p.type === "CURIOSITY_SPIKE");
const hasRevisit = patterns.some((p) => p.type === "REVISIT");

console.log("\nPattern verification assertions:");
console.log(`  - Rabbit Hole detected: ${hasRabbitHole ? "PASS" : "FAIL"}`);
console.log(`  - Curiosity Spike detected: ${hasCuriositySpike ? "PASS" : "FAIL"}`);
console.log(`  - Revisit detected: ${hasRevisit ? "PASS" : "FAIL"}`);

if (hasRabbitHole && hasCuriositySpike && hasRevisit) {
  console.log("\n✅ ALL END-TO-END VERIFICATIONS PASSED SUCCESSFULLY!");
} else {
  console.error("\n❌ Assertion failure in pattern detection.");
  process.exit(1);
}
