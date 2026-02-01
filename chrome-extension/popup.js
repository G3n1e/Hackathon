function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg;
}

function esc(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function listHTML(items, ordered = false) {
  if (!Array.isArray(items) || items.length === 0) return "<div class='pill'>TBD</div>";
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>` + items.map(x => `<li>${esc(x)}</li>`).join("") + `</${tag}>`;
}

function renderCard(job) {
  const card = document.getElementById("card");
  if (!card) return;

  const title = job?.task_name || "Untitled Task";
  const srcTitle = job?.source_title || "Source";
  const srcUrl = job?.source_url || "";
  const when = job?.when_to_use || "";
  const yt = job?.youtube_link || "";

  const srcLine = srcUrl
    ? `<a href="${esc(srcUrl)}" target="_blank" rel="noreferrer">${esc(srcTitle)}</a>`
    : esc(srcTitle);

  const ytLine = yt
    ? `<a href="${esc(yt)}" target="_blank" rel="noreferrer">${esc(yt)}</a>`
    : "TBD";

  card.innerHTML = `
    <div class="title">${esc(title)}</div>
    <div class="meta">From: ${srcLine}</div>

    <div class="pillrow">
      <div class="pill">Training aid</div>
      <div class="pill">Needs review</div>
      <div class="pill">Local-only</div>
    </div>

    <div class="section">
      <h3>When to use</h3>
      <div>${esc(when) || "TBD"}</div>
    </div>

    <div class="section">
      <h3>Tools / PPE</h3>
      ${listHTML(job?.tools_ppe, false)}
    </div>

    <div class="section">
      <h3>Steps</h3>
      ${listHTML(job?.steps, true)}
    </div>

    <div class="section">
      <h3>Safety notes</h3>
      ${listHTML(job?.safety_notes, false)}
    </div>

    <div class="section">
      <h3>Common mistakes</h3>
      ${listHTML(job?.common_mistakes, false)}
    </div>

    <div class="section">
      <h3>Acceptance checks</h3>
      ${listHTML(job?.acceptance_checks, false)}
    </div>

    <div class="section">
      <h3>Video link</h3>
      <div>${ytLine}</div>
    </div>
  `;
}

async function getPageText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const sel = window.getSelection?.().toString?.().trim?.();
      if (sel && sel.length > 80) return sel;

      const text = document.body?.innerText || "";
      return text.slice(0, 12000);
    }
  });

  return { tab, text: result || "" };
}

async function openHub() {
  const url = chrome.runtime.getURL("field-notes/index.html");
  await chrome.tabs.create({ url });
}

document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generate");
  const copyBtn = document.getElementById("copy");
  const toggleBtn = document.getElementById("toggleJson");
  const openHubBtn = document.getElementById("openHub");
  const clearSavedBtn = document.getElementById("clearSaved");
  const out = document.getElementById("out");
  const yt = document.getElementById("yt");

  if (!generateBtn || !copyBtn || !toggleBtn || !openHubBtn || !clearSavedBtn || !out || !yt) {
    setStatus("Popup HTML IDs missing.");
    return;
  }

  // Load any previously saved job card to show immediately
  chrome.storage.local.get(["last_job_card"], ({ last_job_card }) => {
    if (last_job_card) {
      renderCard(last_job_card);
      out.textContent = JSON.stringify(last_job_card, null, 2);
    }
  });

  toggleBtn.addEventListener("click", () => {
    const isHidden = out.style.display === "none" || !out.style.display;
    out.style.display = isHidden ? "block" : "none";
    toggleBtn.textContent = isHidden ? "Hide JSON" : "View JSON";
  });

  openHubBtn.addEventListener("click", async () => {
    await openHub();
  });

  clearSavedBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(["last_job_card", "last_job_card_saved_at"]);
    setStatus("Cleared saved job card.");
    out.textContent = "Idle…";
    out.style.display = "none";
    toggleBtn.textContent = "View JSON";
    renderCard({
      task_name: "No job card yet",
      source_title: "",
      source_url: "",
      when_to_use: "Click “Create Job Card (Local)” on a webpage.",
      tools_ppe: [],
      steps: [],
      safety_notes: [],
      common_mistakes: [],
      acceptance_checks: [],
      youtube_link: ""
    });
  });

  generateBtn.addEventListener("click", async () => {
    try {
      setStatus("Reading page…");

      const { tab, text } = await getPageText();

      setStatus("Calling local service (Ollama)…");
      const resp = await fetch("http://127.0.0.1:8787/jobcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: tab.title, url: tab.url, text })
      });

      const data = await resp.json();

      const ytLink = yt.value.trim();
      if (ytLink && data?.job_card) data.job_card.youtube_link = ytLink;

      window._jobcard = data.job_card;

      // Save for Field Notes hub
      await chrome.storage.local.set({
        last_job_card: data.job_card,
        last_job_card_saved_at: Date.now()
      });

      // Update popup UI
      renderCard(data.job_card);
      out.textContent = JSON.stringify(data.job_card, null, 2);
      setStatus(data.warning ? data.warning : "Done. Opening Field Notes…");

      // Open the hub
      await openHub();
    } catch (e) {
      setStatus(`Error: ${e?.message || e}`);
    }
  });

  copyBtn.addEventListener("click", async () => {
    if (!window._jobcard) {
      const saved = await chrome.storage.local.get(["last_job_card"]);
      if (saved?.last_job_card) window._jobcard = saved.last_job_card;
    }
    if (!window._jobcard) return;

    await navigator.clipboard.writeText(JSON.stringify(window._jobcard, null, 2));
    setStatus("Copied.");
  });

  // Start with JSON hidden
  out.style.display = "none";
});
