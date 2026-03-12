# SK-Connect — Local AI Job Card Generator

**2026 SaskHack Hackathon Project**

A Chrome extension that turns any webpage into a safety-first training job card using a local AI model (Ollama). Designed for electrical utility field technicians to document procedures, generate training aids, and record voice notes — entirely offline with no cloud dependencies.

---

## How it Works

1. Browse to any procedure, safety document, or utility portal page in Chrome.
2. Click the **SK-Connect** extension icon.
3. Click **"Create Job Card (Local)"** — the page text is sent to your local Ollama server.
4. A structured job card is generated with steps, PPE, safety notes, and acceptance checks.
5. The **Field Notes hub** opens with the card saved for review, along with voice recording tools.

Everything stays on your machine. No data leaves your computer.

---

## Prerequisites

Install these before running:

| Tool | Download | Notes |
|------|----------|-------|
| **Node.js** (v18+) | https://nodejs.org | For the local job card server |
| **Ollama** | https://ollama.com | Local LLM runner |
| **llama3:8b** model | `ollama pull llama3:8b` | Run after installing Ollama |
| **Chrome** or **Edge** | — | Chromium-based browser required |

---

## Setup

### 1. Pull the AI model

```bash
ollama pull llama3:8b
```

Make sure Ollama is running (it starts automatically on most systems after install, at `http://127.0.0.1:11434`).

### 2. Start the job card server

**Linux / macOS:**
```bash
./start.sh
```

**Windows:**
```
Double-click start.bat
```

Or manually:
```bash
cd server
npm install
npm start
```

The server runs at `http://127.0.0.1:8787`. Keep this terminal open while using the extension.

### 3. Load the Chrome extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `chrome-extension/` folder from this project
5. The ⚡ SK-Connect icon will appear in your toolbar (pin it for easy access)

---

## Usage

### Generating a Job Card

1. Navigate to a webpage with procedure or safety information.
2. *(Optional)* Select specific text to use just that section instead of the full page.
3. Click the **SK-Connect** extension icon.
4. *(Optional)* Paste a YouTube video URL in the input field.
5. Click **"Create Job Card (Local)"**.
6. The card is generated and the **Field Notes hub** opens automatically.

### Field Notes Hub

The hub has four tabs:

- **Power Line** — Text notes + voice recording for power line observations
- **Substation** — Text notes + voice recording for substation documentation
- **General** — Incident log template + safety reminders
- **Card History** — All generated job cards (up to 20), with export and copy tools

### Card History

Every generated card is saved to your Chrome extension storage. From the **Card History** tab you can:
- Expand any card to review the full content
- Copy a card's JSON to clipboard
- Copy a card into your current notes tab
- Export all cards as a single `.json` file

---

## Project Structure

```
sk-connect/
├── chrome-extension/         # Chrome extension (load this folder)
│   ├── manifest.json
│   ├── popup.html / popup.js # Extension popup
│   ├── icons/                # Extension icons (PNG)
│   ├── make-icons.html       # Re-generate icons if needed
│   └── field-notes/          # Field Notes Hub (tab page)
│       ├── index.html
│       ├── app.js
│       └── styles.css
│
├── server/                   # Local Node.js server (must be running)
│   ├── server.js
│   └── package.json
│
├── grid-docs/                # Standalone version of the notes hub
│   └── index.html / app.js / styles.css
│
├── Dummy Scrape Target/      # Test page for validating extension scraping
│   └── dummy_scrape_target.html
│
├── start.sh                  # Linux/macOS startup script
└── start.bat                 # Windows startup script
```

---

## Configuration

**Change the AI model** — Edit `server/server.js` line 9:
```js
const MODEL = "llama3:8b"; // change to any installed Ollama model
```

**Other capable models to try:**
- `mistral:7b` — Fast and capable
- `phi3:mini` — Very fast, good for structured JSON
- `llama3:70b` — Higher quality, requires more RAM

**Change the server port** — Edit line 155 in `server/server.js`:
```js
app.listen(8787, "127.0.0.1", () => { ... });
```
Also update `host_permissions` in `chrome-extension/manifest.json` to match.

---

## Data Storage

| Data | Where stored | How to clear |
|------|-------------|--------------|
| Generated job cards | Chrome extension storage (`chrome.storage.local`) | "Clear History" in Card History tab |
| Text notes | Browser `localStorage` | "Wipe All Local Notes" in General tab |
| Voice recordings | Downloaded to your disk as `.webm` files | Delete files manually |

---

## Troubleshooting

**"Error: Failed to fetch" in the extension popup**
- Make sure the server is running (`./start.sh`)
- Check that Ollama is running: open `http://127.0.0.1:11434` in your browser

**"Ollama error 404" in server console**
- The model isn't downloaded yet. Run: `ollama pull llama3:8b`

**Extension not appearing after loading**
- Make sure you selected the `chrome-extension/` folder (not the root of the project)
- Check `chrome://extensions` for error messages

**Job card generated but content is generic/fallback**
- The LLM may have returned malformed JSON. Try again on the same page.
- Try selecting specific relevant text before clicking "Create Job Card"

**Voice recording not working**
- Click "Allow" when Chrome asks for microphone permission
- Check browser microphone permissions at `chrome://settings/content/microphone`

---

## Safety Notice

This tool is for **documentation and training purposes only**. It is non-operational — it does not provide switching instructions, repair procedures, or authorizations to perform electrical work.

- Treat all conductors as energized unless confirmed otherwise by authorized control
- Maintain required approach distances at all times
- Do not touch downed lines or nearby objects
- Follow your organization's lockout/tagout and switching authority rules
- In emergencies, contact your utility control center / dispatch

---

## Tech Stack

- **Extension:** Chrome Manifest v3, vanilla JS, no build step
- **Server:** Node.js + Express, local Ollama API
- **AI:** Any Ollama-compatible model (default: llama3:8b)
- **Storage:** `chrome.storage.local` + browser `localStorage`
- **Audio:** WebM via `MediaRecorder` API

---

*Built at 2026 SaskHack Hackathon. Local AI, no cloud.*
