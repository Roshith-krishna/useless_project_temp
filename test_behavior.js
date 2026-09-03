const { analyzeSessionBehavior } = require("./behaviorAnalysis.js");

// Test 1: A -> B -> A (Revisit on A)
const fakeSession1 = {
  id: "session_test_1",
  startedAt: "2026-09-04T04:00:00.000Z",
  endedAt: "2026-09-04T04:01:00.000Z",
  views: [
    {
      id: "view_1",
      videoId: "video_A",
      url: "https://www.youtube.com/shorts/video_A",
      title: "Short A",
      startedAt: "2026-09-04T04:00:00.000Z",
      endedAt: "2026-09-04T04:00:15.000Z",
      watchDurationMs: 15000,
      videoDurationMs: 20000,
      completionRate: 0.75
    },
    {
      id: "view_2",
      videoId: "video_B",
      url: "https://www.youtube.com/shorts/video_B",
      title: "Short B",
      startedAt: "2026-09-04T04:00:15.000Z",
      endedAt: "2026-09-04T04:00:16.500Z",
      watchDurationMs: 1500, // Instant skip! (< 2000ms)
      videoDurationMs: 30000,
      completionRate: 0.05
    },
    {
      id: "view_3",
      videoId: "video_A", // Revisit to A!
      url: "https://www.youtube.com/shorts/video_A",
      title: "Short A",
      startedAt: "2026-09-04T04:00:17.000Z",
      endedAt: "2026-09-04T04:00:37.000Z",
      watchDurationMs: 20000, // Near-complete (100% of 20s)
      videoDurationMs: 20000,
      completionRate: 1.0
    }
  ]
};

const result1 = analyzeSessionBehavior(fakeSession1);
console.log("=== Test 1 Summary ===");
console.log(JSON.stringify(result1.summary, null, 2));

console.log("=== Test 1 Video A ===");
console.log(JSON.stringify(result1.byVideo["video_A"], null, 2));

console.log("=== Test 1 Video B ===");
console.log(JSON.stringify(result1.byVideo["video_B"], null, 2));

// Test 2: User staying on A for 60s (Looping, NOT a revisit)
const fakeSession2 = {
  id: "session_test_2",
  startedAt: "2026-09-04T04:00:00.000Z",
  endedAt: "2026-09-04T04:01:00.000Z",
  views: [
    {
      id: "view_loop",
      videoId: "video_A",
      url: "https://www.youtube.com/shorts/video_A",
      title: "Short A Looping",
      startedAt: "2026-09-04T04:00:00.000Z",
      endedAt: "2026-09-04T04:01:00.000Z",
      watchDurationMs: 60000,
      videoDurationMs: 15000,
      completionRate: 4.0
    }
  ]
};

const result2 = analyzeSessionBehavior(fakeSession2);
console.log("=== Test 2 Video A (Long watch, no revisit) ===");
console.log("Revisit count:", result2.byVideo["video_A"].revisitCount);
console.log("Has revisit:", result2.byVideo["video_A"].hasRevisit);
console.log("Total watch time:", result2.byVideo["video_A"].totalWatchTimeForVideo);
console.log("Highest completion rate:", result2.byVideo["video_A"].highestCompletionRate);
console.log("Session revisit count:", result2.summary.revisitCount);
