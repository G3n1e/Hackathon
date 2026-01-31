import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const MODEL = "llama3:8b"; // change if you want

function safeSlice(str, n) {
  return (str || "").toString().trim().slice(0, n);
}

async function callOllama(prompt) {
  const resp = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.2
      }
    })
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Ollama error ${resp.status}: ${t}`);
  }

  const data = await resp.json();
  return data.response || "";
}

function buildPrompt({ title, url, text }) {
  return `
You are helping capture knowledge for training: experienced tradespeople -> new journeymen.
This output is a TRAINING AID. It must be practical, short, and safety-first.
Write like a calm senior tradesperson giving a quick job card. No corporate tone.

Return ONLY valid JSON. No markdown. No extra text.

Schema (exact keys):
{
  "task_name": string,
  "source_title": string,
  "source_url": string,
  "when_to_use": string,
  "tools_ppe": string[],
  "steps": string[],
  "common_mistakes": string[],
  "safety_notes": string[],
  "acceptance_checks": string[],
  "youtube_link": string,
  "needs_review": boolean
}

Rules:
- steps: 6–10 items, each <= 14 words, start with a verb.
- safety_notes: 3–6 items, no fluff.
- common_mistakes: 3–6 items.
- acceptance_checks: 3–6 items.
- If unsure about tools/PPE, put "TBD (site-specific)".
- youtube_link: "https://www.youtube.com/watch?v=VIDEO_ID_TBD"
- needs_review: always true

Source:
Title: ${safeSlice(title, 200)}
URL: ${safeSlice(url, 500)}
Text:
${safeSlice(text, 8000)}
`;
}


function tryParseJson(text) {
  // Try raw parse
  try {
    return JSON.parse(text);
  } catch {}

  // Try extracting first {...} block
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return null;
}

function validateJobCard(obj, fallback) {
  // Minimal validation + fallback filling
  if (!obj || typeof obj !== "object") return fallback;

  const out = { ...fallback, ...obj };

  // Ensure arrays
  for (const k of ["tools_ppe", "steps", "common_mistakes", "safety_notes", "acceptance_checks"]) {
    if (!Array.isArray(out[k])) out[k] = fallback[k];
    out[k] = out[k].map(x => (x || "").toString()).filter(Boolean);
  }

  // Ensure strings
  for (const k of ["task_name", "source_title", "source_url", "when_to_use", "youtube_link"]) {
    out[k] = (out[k] || "").toString();
    if (!out[k]) out[k] = fallback[k];
  }

  // Basic trimming
  out.task_name = out.task_name.slice(0, 120);
  out.source_title = out.source_title.slice(0, 200);
  out.source_url = out.source_url.slice(0, 600);

  return out;
}

app.post("/jobcard", async (req, res) => {
  const { title, url, text } = req.body || {};

  const fallback = {
    task_name: title || "Untitled Task",
    source_title: title || "Unknown Source",
    source_url: url || "",
    when_to_use: "Before performing this task, or when reviewing the procedure on-site.",
    tools_ppe: ["TBD"],
    steps: ["Review the procedure and confirm the work area is safe."],
    common_mistakes: ["Skipping checks because the task feels routine."],
    safety_notes: ["Follow site safety rules and stop if conditions differ."],
    acceptance_checks: ["Work completed to spec and documented."],
    youtube_link: "https://www.youtube.com/watch?v=VIDEO_ID_TBD"
  };

  try {
    const prompt = buildPrompt({ title, url, text });
    const responseText = await callOllama(prompt);

    const parsed = tryParseJson(responseText);
    const job_card = validateJobCard(parsed, fallback);

    res.json({ job_card });
  } catch (e) {
    res.status(200).json({
      job_card: fallback,
      warning: `Used fallback (local model call failed): ${e.message}`
    });
  }
});

app.listen(8787, "127.0.0.1", () => {
  console.log("Job Card service: http://127.0.0.1:8787");
  console.log("Using Ollama at: http://127.0.0.1:11434");
});
