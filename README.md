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
You open YouTube Shorts intending to watch one 15-second video, and suddenly it's 2 AM, your thumb has developed repetitive strain injury, and you have no idea how you transitioned from sourdough baking to competitive lawnmower racing.

### The Solution (that nobody asked for)
A digital "autopsy" of your doomscroll. Scrollopsy monitors your Shorts route changes and player state in real time, records your viewing duration down to the millisecond, calculates completion rates, detects when you frantically swipe past content in under 2 seconds, and tracks when you obsessively scroll back to rewatch a Short.

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



