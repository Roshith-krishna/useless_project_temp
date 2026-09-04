<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />



# Scrollopsy 🎯


## Basic Details
### Team Name: NOT NULL


### Team Members
- Member 1: Saivivek MV - College of Engineering Vadakara
- Member 2: Roshith Krishna KM - College of Engineering Vadakara 

### Project Description
Scrollopsy is a Chrome Extension that observes a user's YouTube Shorts scrolling session and creates an entertaining "autopsy" of their attention trajectory. It passively records viewing events, active watch durations, video completion rates, instant skips, and revisits.

### The Problem (that doesn't exist)
People keep telling you to "stop doomscrolling," but honestly? Doomscrolling is great. The real tragedy isn't that you spent 3 hours consuming 180 vertical videos—it's that all that frantic thumb labor, niche rabbit-hole exploration, and micro-content consumption disappears into the void with zero productivity, zero deliverables, and no forensic paper trail to show for your hard work.

### The Solution (that nobody asked for)
We don't discourage your doomscroll—we optimize and certify it. Scrollopsy transforms mindless scrolling into an entertaining, forensic post-mortem dossier. It tracks your exact trajectory down to the millisecond, calculates completion rates, indexes every rabbit hole you fell into, and automatically delivers a comprehensive "Doomscroll Autopsy Report" the moment you close the tab. Now your late-night scrolling has data, receipts, and full retrospective value.

## Technical Details
### Technologies/Components Used
For Software:
- JavaScript (ES6+)
- Chrome Extensions Manifest V3 API (chrome.storage.local, content scripts, background service worker)
- HTML5 & CSS3
- Chrome DevTools


### Implementation

# Installation
1. Clone or download this repository.
2. Open Google Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click **Load unpacked** and select this project directory.

# Run
1. Open [YouTube Shorts](https://www.youtube.com/shorts).
2. Scroll through Shorts normally.
3. Click the **Scrollopsy** extension icon in your browser toolbar to inspect live session stats (Total Views, Unique Shorts, Revisits, Instant Skips, Near Completes, and raw JSON).
4. (Optional) Open DevTools Console (`F12`) on YouTube to view real-time `[SCROLLOPSY]` tracking events (`VIEW START`, `VIEW END`, `WATCH DURATION`, `COMPLETION`).

### Project Documentation
For Software:

# Screenshots
![The main "Doomscroll Autopsy" dashboard interface, featuring a summary of overall session metrics](./screenshots/autopsy_overview.png)
*The main "Doomscroll Autopsy" dashboard interface, featuring a summary of overall session metrics*

![The detailed analysis section of the Scrollopsy dashboard](./screenshots/retention.png)
*The detailed analysis section of the Scrollopsy dashboard*

![The Scrollopsy browser extension popup, displaying the active Session Behavioral Inspector with real-time statistics like total views, instant skips, and average watch duration, alongside the button to launch the full autopsy.](./screenshots/pop_up.png)

*The Scrollopsy browser extension popup, displaying the active Session Behavioral Inspector with real-time statistics like total views, instant skips, and average watch duration, alongside the button to launch the full autopsy.*

---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)



