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

  const title = job.task_name || "Untitled Task";
  const srcTitle = job.source_title || "Source";
  const srcUrl = job.source_url || "";
  const when = job.when_to_use || "";
  const yt = job.youtube_link || "";

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
      ${listHTML(job.tools_ppe, false)}
    </div>

    <div class="section">
      <h3>Steps</h3>
      ${listHTML(job.steps, true)}
    </div>

    <div class="section">
      <h3>Safety notes</h3>
      ${listHTML(job.safety_notes, false)}
    </div>

    <div class="section">
      <h3>Common mistakes</h3>
      ${listHTML(job.common_mistakes, false)}
    </div>

    <div class="section">
      <h3>Acceptance checks</h3>
      ${listHTML(job.acceptance_checks, false)}
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

document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generate");
  const copyBtn = document.getElementById("copy");
  const toggleBtn = document.getElementById("toggleJson");
  const out = document.getElementById("out");
  const yt = document.getElementById("yt");

  if (!generateBtn || !copyBtn || !toggleBtn || !out || !yt) {
    setStatus("Popup HTML IDs missing.");
    return;
  }

  toggleBtn.addEventListener("click", () => {
    const isHidden = out.style.display === "none" || !out.style.display;
    out.style.display = isHidden ? "block" : "none";
    toggleBtn.textContent = isHidden ? "Hide JSON" : "View JSON";
  });

  generateBtn.addEventListener("click", async () => {
    try {
      setStatus("Reading page…");

      const { tab, text } = await getPageText();

      setStatus("Calling local service (Ollama)…");
      const resp = await fetch("http://127.0.0.1:8787/jobcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tab.title,
          url: tab.url,
          text
        })
      });

      const data = await resp.json();

      const ytLink = yt.value.trim();
      if (ytLink && data?.job_card) data.job_card.youtube_link = ytLink;

      window._jobcard = data.job_card;

      renderCard(data.job_card);
      out.textContent = JSON.stringify(data.job_card, null, 2);
      setStatus(data.warning ? data.warning : "Done.");
    } catch (e) {
      setStatus(`Error: ${e?.message || e}`);
    }
  });

  copyBtn.addEventListener("click", async () => {
    if (!window._jobcard) return;
    await navigator.clipboard.writeText(JSON.stringify(window._jobcard, null, 2));
    setStatus("Copied.");
  });

  // Start with JSON hidden
  out.style.display = "none";
});
