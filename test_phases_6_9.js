const { analyzeSemanticsLocally, TOPIC_TAXONOMY } = require("./semanticEngine.js");
const { calculateEngagementSignal, aggregateTopicEngagement, detectScrollingPatterns } = require("./patternDetector.js");

console.log("=== Testing Phase 7: Semantic Classification ===");
const sampleContentF1 = {
  videoId: "f1_video_1",
  title: "Ferrari Pit Stop Disaster at Monaco GP! #f1 #ferrari",
  channel: "F1 Insights",
  description: "Analyzing the tyre strategy undercut that cost the race victory.",
  hashtags: ["#f1", "#ferrari", "#monaco"],
  visibleText: "Sound: Formula 1 Official Theme"
};

const f1Fingerprint = analyzeSemanticsLocally(sampleContentF1);
console.log("F1 Fingerprint:", JSON.stringify(f1Fingerprint, null, 2));

const sampleContentTrickShot = {
  videoId: "bball_1",
  title: "Bro really thought 💀",
  channel: "TrickShotCrew",
  description: "Crazy basketball trick shot compilation off the roof #basketball #trickshots",
  hashtags: ["#basketball", "#trickshots", "#nba"],
  visibleText: "Captions: He made it on the final try!"
};

const trickShotFingerprint = analyzeSemanticsLocally(sampleContentTrickShot);
console.log("Trick Shot Fingerprint:", JSON.stringify(trickShotFingerprint, null, 2));

console.log("\n=== Testing Phase 8 & 9: Engagement & Patterns ===");
// Create a fake doomscrolling session:
// F1 (long view) -> F1 (long view) -> F1 (long view) [Rabbit hole / Binge]
// -> Cooking (Instant skip)
// -> Quantum Physics (100% completion) [Curiosity Spike]
// -> F1 (Revisit / Topic Gravity)
const events = [
  {
    id: "e1",
    videoId: "f1_1",
    title: "Ferrari Pit Stop Analysis",
    watchDurationMs: 65000,
    videoDurationMs: 70000,
    completionRate: 0.93,
    isInstantSkip: false,
    isRevisit: false,
    semantics: f1Fingerprint
  },
  {
    id: "e2",
    videoId: "f1_2",
    title: "Red Bull Tyre Strategy Masterclass",
    watchDurationMs: 75000,
    videoDurationMs: 80000,
    completionRate: 0.94,
    isInstantSkip: false,
    isRevisit: false,
    semantics: f1Fingerprint
  },
  {
    id: "e3",
    videoId: "f1_3",
    title: "Monaco GP Overtakes",
    watchDurationMs: 50000,
    videoDurationMs: 60000,
    completionRate: 0.83,
    isInstantSkip: false,
    isRevisit: false,
    semantics: f1Fingerprint
  },
  {
    id: "e4",
    videoId: "cook_1",
    title: "Fast 10s Snack Recipe",
    watchDurationMs: 1200, // Instant skip!
    videoDurationMs: 30000,
    completionRate: 0.04,
    isInstantSkip: true,
    isRevisit: false,
    semantics: {
      topics: ["Food & Cooking"],
      contentType: "culinary"
    }
  },
  {
    id: "e5",
    videoId: "quantum_1",
    title: "What Happens Inside a Black Hole?",
    watchDurationMs: 45000,
    videoDurationMs: 45000,
    completionRate: 1.0,
    isInstantSkip: false,
    isRevisit: false,
    semantics: {
      topics: ["Science & Physics"],
      contentType: "educational"
    }
  },
  {
    id: "e6",
    videoId: "f1_1", // Revisit to F1_1 & Topic Gravity
    title: "Ferrari Pit Stop Analysis",
    watchDurationMs: 60000,
    videoDurationMs: 70000,
    completionRate: 0.86,
    isInstantSkip: false,
    isRevisit: true,
    visitNumber: 2,
    semantics: f1Fingerprint
  }
];

const topicEngagement = aggregateTopicEngagement(events);
console.log("\n--- Topic Engagement Aggregations ---");
console.log(JSON.stringify(topicEngagement, null, 2));

const patterns = detectScrollingPatterns(events, topicEngagement);
console.log("\n--- Detected Patterns ---");
console.log(JSON.stringify(patterns, null, 2));

console.log("\nAll Phase 6-9 algorithmic tests executed successfully.");
