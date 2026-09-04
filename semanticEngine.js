/**
 * Scrollopsy - Semantic Representation Layer (Phase 7)
 * 
 * Generates structured semantic fingerprints for YouTube Shorts using
 * a robust, zero-dependency local taxonomy & keyword NLP engine.
 * Caches fingerprints by videoId.
 */

// Comprehensive Taxonomy for Offline Semantic Classification
const TOPIC_TAXONOMY = [
  {
    category: "Formula 1 & Motorsport",
    keywords: ["f1", "formula 1", "ferrari", "red bull", "mercedes", "verstappen", "hamilton", "leclerc", "pit stop", "tyre", "grand prix", "motorsport", "racing", "qualifying", "monaco", "fia"],
    topics: ["Formula 1", "Motorsport"],
    contentType: "sports analysis"
  },
  {
    category: "Basketball & Sports",
    keywords: ["basketball", "nba", "dunk", "trick shot", "lebron", "curry", "jordan", "hoops", "three pointer", "clutch", "football", "soccer", "fifa", "ronaldo", "messi", "touchdown", "tennis", "cricket", "gymnastics"],
    topics: ["Basketball", "Sports"],
    contentType: "sports entertainment"
  },
  {
    category: "Food & Cooking",
    keywords: ["cooking", "recipe", "food", "chef", "biryani", "steak", "pasta", "street food", "kitchen", "bake", "baking", "cake", "delicious", "burger", "pizza", "spicy", "dessert", "snack"],
    topics: ["Food", "Cooking"],
    contentType: "culinary"
  },
  {
    category: "Animals & Pets",
    keywords: ["cat", "dog", "kitten", "puppy", "pet", "cute animals", "wildlife", "golden retriever", "feline", "doggo", "rescue animal", "bird", "parrot", "lion", "zoo"],
    topics: ["Animals", "Pets"],
    contentType: "wholesome entertainment"
  },
  {
    category: "Science & Physics",
    keywords: ["quantum", "physics", "science", "space", "nasa", "black hole", "relativity", "experiment", "astronomy", "cosmos", "galaxy", "biology", "chemistry", "universe", "time dilation"],
    topics: ["Science", "Physics"],
    contentType: "educational"
  },
  {
    category: "Tech & Software",
    keywords: ["coding", "programming", "javascript", "python", "ai", "machine learning", "software", "developer", "apple", "iphone", "android", "gpu", "nvidia", "gadgets", "linux"],
    topics: ["Technology", "Software"],
    contentType: "tech breakdown"
  },
  {
    category: "Gaming",
    keywords: ["gaming", "gameplay", "minecraft", "gta", "roblox", "fortnite", "valorant", "esports", "playstation", "xbox", "speedrun", "boss fight", "streamer", "twitch"],
    topics: ["Gaming"],
    contentType: "gaming clip"
  },
  {
    category: "Finance & Crypto",
    keywords: ["crypto", "bitcoin", "ethereum", "stocks", "trading", "investing", "money", "rich", "millionaire", "passive income", "real estate", "wall street", "nft"],
    topics: ["Finance", "Crypto"],
    contentType: "finance advice"
  },
  {
    category: "Comedy & Memes",
    keywords: ["comedy", "meme", "funny", "humor", "prank", "skit", "bro thought", "pov", "relatable", "joke", "hilarious", "laugh", "fails", "parody", "satire"],
    topics: ["Comedy", "Memes"],
    contentType: "comedy sketch"
  },
  {
    category: "Music & Audio",
    keywords: ["music", "song", "guitar", "piano", "remix", "beat", "cover", "singing", "hip hop", "rap", "pop", "live performance", "bass", "lyrics", "producer"],
    topics: ["Music", "Audio"],
    contentType: "music performance"
  },
  {
    category: "Fitness & Health",
    keywords: ["workout", "fitness", "gym", "bodybuilding", "calisthenics", "abs", "muscle", "squat", "bench press", "diet", "nutrition", "training", "cardio", "lifting"],
    topics: ["Fitness", "Health"],
    contentType: "fitness instruction"
  }
];

/**
 * Local rule-based semantic analyzer that extracts fingerprints from rendered content metadata.
 * @param {Object} contentObj - Normalized content object from Phase 6
 * @returns {Object} Structured Semantic Fingerprint
 */
function analyzeSemanticsLocally(contentObj) {
  const title = (contentObj.title || "").toLowerCase();
  const description = (contentObj.description || "").toLowerCase();
  const channel = (contentObj.channel || "").toLowerCase();
  const hashtags = (contentObj.hashtags || []).map((h) => h.toLowerCase().replace(/^#/, ""));
  const visibleText = (contentObj.visibleText || "").toLowerCase();

  const combinedText = `${title} ${description} ${channel} ${hashtags.join(" ")} ${visibleText}`;

  // Match against taxonomy
  let bestMatch = null;
  let maxScore = 0;
  const detectedSubtopics = new Set();
  const detectedKeywords = new Set();

  TOPIC_TAXONOMY.forEach((tax) => {
    let score = 0;
    tax.keywords.forEach((kw) => {
      if (combinedText.includes(kw)) {
        score += kw.includes(" ") ? 3 : 1;
        detectedKeywords.add(kw);
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestMatch = tax;
    }
  });

  // Extract hashtags as subtopics/keywords
  hashtags.forEach((tag) => {
    if (tag.length > 2 && tag !== "shorts" && tag !== "viral" && tag !== "fyp") {
      detectedSubtopics.add(tag);
      detectedKeywords.add(tag);
    }
  });

  // Extract capital words / phrases as potential entities
  const originalTitle = contentObj.title || "";
  const entityMatches = originalTitle.match(/\b[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*\b/g) || [];
  const entities = entityMatches.filter((e) => !["The", "A", "Shorts", "YouTube", "POV"].includes(e));

  let topics = [];
  let contentType = "general entertainment";

  if (bestMatch && maxScore > 0) {
    topics = [...bestMatch.topics];
    contentType = bestMatch.contentType;
  } else if (hashtags.length > 0) {
    // Infer from primary hashtags
    topics = hashtags.slice(0, 3).map((h) => h.charAt(0).toUpperCase() + h.slice(1));
    contentType = "social short";
  } else {
    // Fallback based on title words
    const cleanWords = title.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 4);
    topics = cleanWords.slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    if (topics.length === 0) topics = ["Uncategorized"];
  }

  // Create clean summary
  const summary = contentObj.title && contentObj.title !== "YouTube Short"
    ? `"${contentObj.title}" by ${contentObj.channel || "creator"}`
    : `Short focusing on ${topics.join(" and ")}`;

  return {
    summary: summary,
    topics: Array.from(new Set(topics)),
    subtopics: Array.from(detectedSubtopics).slice(0, 4),
    entities: Array.from(new Set(entities)).slice(0, 4),
    keywords: Array.from(detectedKeywords).slice(0, 6),
    contentType: contentType,
    source: "local-nlp"
  };
}

/**
 * Generates semantic fingerprint using the local taxonomy and keyword analyzer.
 * @param {Object} contentObj - Normalized content object
 * @returns {Object} Semantic fingerprint
 */
function generateSemanticFingerprint(contentObj) {
  return analyzeSemanticsLocally(contentObj);
}

/**
 * Retrieves cached semantic fingerprint or generates and caches a new one.
 * @param {Object} contentObj - Normalized content object
 * @returns {Promise<Object>} Semantic fingerprint
 */
async function getOrComputeSemanticFingerprint(contentObj) {
  if (!contentObj || !contentObj.videoId) {
    return analyzeSemanticsLocally(contentObj || {});
  }

  const cacheKey = `semanticCache_${contentObj.videoId}`;

  return new Promise((resolve) => {
    chrome.storage.local.get([cacheKey], (res) => {
      if (res[cacheKey]) {
        resolve(res[cacheKey]);
        return;
      }

      const fingerprint = analyzeSemanticsLocally(contentObj);

      // Save to cache
      chrome.storage.local.set({ [cacheKey]: fingerprint });
      resolve(fingerprint);
    });
  });
}

// Module export for Node/testing and window global for Chrome Extension
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    analyzeSemanticsLocally,
    generateSemanticFingerprint,
    getOrComputeSemanticFingerprint,
    TOPIC_TAXONOMY
  };
}

if (typeof window !== "undefined") {
  window.ScrollopsySemantic = {
    analyzeSemanticsLocally,
    generateSemanticFingerprint,
    getOrComputeSemanticFingerprint,
    TOPIC_TAXONOMY
  };
}
