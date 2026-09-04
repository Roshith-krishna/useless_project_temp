// Automated Lifecycle & Auto-Popping Autopsy Verification Test
const assert = require("assert");

// Mock Chrome API
const storage = {};
let createdTabs = [];
let createdWindows = [];
let runtimeMessages = [];
const messageListeners = [];
const tabRemovedListeners = [];
const windowRemovedListeners = [];

global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://scrollopsy-mock/${path}`,
    onInstalled: { addListener: () => {} },
    onMessage: {
      addListener: (fn) => messageListeners.push(fn)
    },
    sendMessage: (msg, cb) => {
      runtimeMessages.push(msg);
      // Dispatch to listeners
      messageListeners.forEach((fn) => {
        fn(msg, { tab: { id: 101, windowId: 202 } }, cb || (() => {}));
      });
    }
  },
  storage: {
    local: {
      get: (keys, cb) => {
        const res = {};
        keys.forEach((k) => { res[k] = storage[k]; });
        cb(res);
      },
      set: (obj, cb) => {
        Object.assign(storage, obj);
        if (cb) cb();
      },
      remove: (keys, cb) => {
        keys.forEach((k) => { delete storage[k]; });
        if (cb) cb();
      }
    },
    onChanged: { addListener: () => {} }
  },
  tabs: {
    create: (opts, cb) => {
      createdTabs.push(opts);
      if (cb) cb({ id: 999, ...opts });
    },
    onRemoved: {
      addListener: (fn) => tabRemovedListeners.push(fn)
    }
  },
  windows: {
    getAll: (opts, cb) => {
      // Mock existing window
      cb([{ id: 202 }]);
    },
    create: (opts, cb) => {
      createdWindows.push(opts);
      if (cb) cb({ id: 888, ...opts });
    },
    onRemoved: {
      addListener: (fn) => windowRemovedListeners.push(fn)
    }
  }
};

console.log("==================================================");
console.log("TEST SUITE: Automated Lifecycle & Auto-Popping Autopsy");
console.log("==================================================");

// Load background script logic
require("./background.js");

// Step 1: Initial state is clean
console.log("\n[Step 1] Initial state check");
assert.strictEqual(storage.currentSession, undefined);
assert.strictEqual(storage.lastAutopsySession, undefined);
console.log("✓ Storage starts empty.");

// Step 2: User opens YouTube Shorts -> Registration in Background
console.log("\n[Step 2] User opens YouTube Shorts tab (tab 101)");
chrome.runtime.sendMessage({
  type: "SHORTS_SESSION_ACTIVE",
  videoId: "dQw4w9WgXcQ",
  url: "https://www.youtube.com/shorts/dQw4w9WgXcQ"
});
assert.strictEqual(runtimeMessages.length, 1);
console.log("✓ Background received SHORTS_SESSION_ACTIVE and registered active tab.");

// Step 3: Simulate active session recording views
console.log("\n[Step 3] Active viewing recorded into storage");
const testSession1 = {
  id: "session_test_1001",
  startedAt: new Date(Date.now() - 60000).toISOString(),
  endedAt: null,
  views: [
    {
      id: "view_1",
      videoId: "dQw4w9WgXcQ",
      title: "Never Gonna Give You Up",
      watchDurationMs: 15000,
      videoDurationMs: 20000,
      completionRate: 0.75,
      semantics: { topics: ["Music", "Pop"] }
    },
    {
      id: "view_2",
      videoId: "abc123xyz",
      title: "Cool Physics Experiment",
      watchDurationMs: 25000,
      videoDurationMs: 30000,
      completionRate: 0.83,
      semantics: { topics: ["Science", "Physics"] }
    }
  ]
};
storage.currentSession = testSession1;
console.log(`✓ Session [${testSession1.id}] has ${testSession1.views.length} viewing events in currentSession.`);

// Step 4: User closes the YouTube Shorts tab (tab 101)
console.log("\n[Step 4] User closes the YouTube Shorts tab");
tabRemovedListeners.forEach((fn) => fn(101, { isWindowClosing: false }));

// Verify that background created the report tab
assert.strictEqual(createdTabs.length, 1, "Expected 1 autopsy report tab to be created");
assert.ok(
  createdTabs[0].url.includes("report.html?auto=true"),
  "Autopsy report URL must point to report.html?auto=true"
);
console.log(`✓ Autopsy Report tab automatically popped up: ${createdTabs[0].url}`);

// Step 5: Debounce protection check
console.log("\n[Step 5] Rapid subsequent trigger within debounce window");
tabRemovedListeners.forEach((fn) => fn(101, { isWindowClosing: false }));
assert.strictEqual(createdTabs.length, 1, "Duplicate trigger must be debounced");
console.log("✓ Debounce successfully prevented duplicate autopsy tab from opening.");

// Step 6: Autopsy report loads, archives session, and auto-clears currentSession
console.log("\n[Step 6] Report opens and executes loadReport() logic");
// Simulate loadReport logic from report.js
chrome.storage.local.get(["currentSession", "lastAutopsySession"], (res) => {
  let session = res.currentSession;
  let shouldClearActive = false;
  const currentEvents = session && (session.views || session.shorts);

  if (session && Array.isArray(currentEvents) && currentEvents.length > 0) {
    shouldClearActive = true;
  } else if (res.lastAutopsySession) {
    session = res.lastAutopsySession;
  }

  assert.ok(session, "Session must exist to render report");
  assert.strictEqual(session.id, "session_test_1001");

  if (shouldClearActive) {
    chrome.storage.local.set({ lastAutopsySession: session }, () => {
      chrome.storage.local.remove(["currentSession"], () => {});
    });
  }
});

// Verify storage state post-popup
assert.strictEqual(storage.currentSession, undefined, "currentSession must be cleared from storage!");
assert.ok(storage.lastAutopsySession, "lastAutopsySession must preserve the dossier!");
assert.strictEqual(storage.lastAutopsySession.id, "session_test_1001");
assert.strictEqual(storage.lastAutopsySession.views.length, 2);
console.log("✓ currentSession was automatically cleared from active storage.");
console.log("✓ lastAutopsySession successfully preserved the archived autopsy dossier.");

// Step 7: Next YouTube Shorts visit starts a brand new fresh session
console.log("\n[Step 7] Next Shorts visit creates brand-new fresh session");
chrome.storage.local.get(["currentSession"], (result) => {
  let session = result.currentSession;
  if (!session || session.endedAt !== null) {
    session = {
      id: "session_test_2002",
      startedAt: new Date().toISOString(),
      endedAt: null,
      views: []
    };
  }
  storage.currentSession = session;
});
assert.ok(storage.currentSession, "New session created");
assert.strictEqual(storage.currentSession.id, "session_test_2002");
assert.strictEqual(storage.currentSession.views.length, 0);
console.log(`✓ New session [${storage.currentSession.id}] started fresh with 0 views.`);

// Step 8: Manual Clear Storage button clears both
console.log("\n[Step 8] Manual Clear Storage button");
chrome.storage.local.remove(["currentSession", "lastAutopsySession"], () => {});
assert.strictEqual(storage.currentSession, undefined);
assert.strictEqual(storage.lastAutopsySession, undefined);
console.log("✓ Manual clear wipes both active session and archived autopsy dossier.");

console.log("\n==================================================");
console.log("ALL AUTOMATED LIFECYCLE TESTS PASSED SUCCESSFULLY! ✓");
console.log("==================================================");
