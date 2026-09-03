// Scrollopsy - YouTube Shorts Content Script
console.log("%c[Scrollopsy]%c Content script loaded on YouTube.", "color: #ff4b4b; font-weight: bold;", "color: #8b92b0;");

let currentShortUrl = null;

/**
 * Checks if the current page is a YouTube Short and logs metadata when a new Short is detected.
 */
function checkShortsUrl() {
  const url = window.location.href;
  const isShort = window.location.pathname.startsWith("/shorts/");

  if (isShort && url !== currentShortUrl) {
    currentShortUrl = url;
    
    const metadata = {
      url: url,
      title: document.title || "YouTube Short",
      timestamp: new Date().toISOString()
    };

    console.log(
      `%c[Scrollopsy]%c 🎬 YouTube Short Detected!`,
      "color: #ff4b4b; font-weight: bold;",
      "color: #00e676; font-weight: bold;",
      metadata
    );

    // If document.title is still initial/generic, update title after page metadata resolves
    if (!document.title || document.title === "YouTube") {
      setTimeout(() => {
        if (window.location.href === url && document.title && document.title !== metadata.title) {
          metadata.title = document.title;
          console.log(
            `%c[Scrollopsy]%c 🏷️ Title Updated: "${document.title}"`,
            "color: #ff4b4b; font-weight: bold;",
            "color: #8b92b0;"
          );
        }
      }, 500);
    }
  } else if (!isShort && currentShortUrl !== null) {
    // Reset tracker if user navigates away from Shorts
    currentShortUrl = null;
  }
}

// Initial check on load
checkShortsUrl();

// Listen to YouTube navigation events
window.addEventListener("yt-navigate-finish", checkShortsUrl);
window.addEventListener("popstate", checkShortsUrl);

// Fallback polling for SPA scroll transitions where replaceState is used without DOM events
setInterval(checkShortsUrl, 300);
