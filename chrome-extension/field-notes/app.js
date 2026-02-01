let mediaRecorders = {
  line: null,
  substation: null
};

let recordedChunks = {
  line: [],
  substation: []
};

function esc(s) {
  return (s ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function bullets(items) {
  if (!Array.isArray(items) || items.length === 0) return "<div class='tiny muted'>TBD</div>";
  return "<ul class='list'>" + items.map(x => `<li>${esc(x)}</li>`).join("") + "</ul>";
}

function steps(items) {
  if (!Array.isArray(items) || items.length === 0) return "<div class='tiny muted'>TBD</div>";
  return "<ol class='list'>" + items.map(x => `<li>${esc(x)}</li>`).join("") + "</ol>";
}

function getActiveTabKey() {
  return document.querySelector(".tab.active")?.dataset?.tab || "line";
}

function setActiveTab(tabKey) {
  document.querySelectorAll(".tab").forEach(btn => {
    const isActive = btn.dataset.tab === tabKey;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  document.querySelectorAll("[data-panel]").forEach(panel => {
    const isMatch = panel.dataset.panel === tabKey;
    panel.hidden = !isMatch;
  });
}

function storageKey(tabKey) {
  return `grid_field_notes_${tabKey}`;
}

function loadNotes(tabKey) {
  const el = document.getElementById(`notes-${tabKey}`);
  if (!el) return;
  el.value = localStorage.getItem(storageKey(tabKey)) || "";
}

function saveNotes(tabKey) {
  const el = document.getElementById(`notes-${tabKey}`);
  if (!el) return;
  localStorage.setItem(storageKey(tabKey), el.value);
}

function clearNotes(tabKey) {
  const el = document.getElementById(`notes-${tabKey}`);
  if (!el) return;
  el.value = "";
  localStorage.removeItem(storageKey(tabKey));
}

async function startRecording(tabKey) {
  const recBtn = document.getElementById(`rec-${tabKey}`);
  const stopBtn = document.getElementById(`stop-${tabKey}`);
  const play = document.getElementById(`play-${tabKey}`);
  const downloads = document.getElementById(`downloads-${tabKey}`);

  if (!recBtn || !stopBtn || !play || !downloads) return;

  recordedChunks[tabKey] = [];

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mr = new MediaRecorder(stream);

  mediaRecorders[tabKey] = mr;

  mr.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks[tabKey].push(e.data);
  };

  mr.onstop = () => {
    // Stop tracks so mic releases
    stream.getTracks().forEach(t => t.stop());

    const blob = new Blob(recordedChunks[tabKey], { type: "audio/webm" });
    const url = URL.createObjectURL(blob);

    play.hidden = false;
    play.src = url;

    const ts = new Date();
    const name = `${tabKey}_recording_${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,"0")}-${String(ts.getDate()).padStart(2,"0")}_${String(ts.getHours()).padStart(2,"0")}${String(ts.getMinutes()).padStart(2,"0")}.webm`;

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.textContent = `Download: ${name}`;
    downloads.prepend(a);
  };

  mr.start();

  recBtn.disabled = true;
  stopBtn.disabled = false;
  recBtn.textContent = "Recording…";
}

function stopRecording(tabKey) {
  const recBtn = document.getElementById(`rec-${tabKey}`);
  const stopBtn = document.getElementById(`stop-${tabKey}`);

  const mr = mediaRecorders[tabKey];
  if (!mr) return;

  mr.stop();
  mediaRecorders[tabKey] = null;

  if (recBtn) {
    recBtn.disabled = false;
    recBtn.textContent = "Start Recording";
  }
  if (stopBtn) stopBtn.disabled = true;
}

function copyTextToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

/* ---------------------------
   Job Card (from extension storage)
---------------------------- */

async function loadLatestJobCard() {
  const view = document.getElementById("jobcard-view");
  if (!view) return;

  const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

  if (!hasChromeStorage) {
    view.innerHTML = `<div class="muted">Open this page via the extension to view the latest Job Card.</div>`;
    return;
  }

  const { last_job_card, last_job_card_saved_at } = await chrome.storage.local.get([
    "last_job_card",
    "last_job_card_saved_at"
  ]);

  if (!last_job_card) {
    view.innerHTML = `<div class="muted">No job card saved yet. Generate one from the extension popup.</div>`;
    return;
  }

  const jc = last_job_card;
  const savedAt = last_job_card_saved_at ? new Date(last_job_card_saved_at) : null;

  const savedLine = savedAt
    ? `<p class="tiny muted">Saved: ${savedAt.toLocaleString()}</p>`
    : "";

  const srcLine = jc.source_url
    ? `<a href="${esc(jc.source_url)}" target="_blank" rel="noreferrer">${esc(jc.source_title || "Source link")}</a>`
    : esc(jc.source_title || "Source");

  const ytLine = jc.youtube_link
    ? `<a href="${esc(jc.youtube_link)}" target="_blank" rel="noreferrer">${esc(jc.youtube_link)}</a>`
    : "TBD";

  view.innerHTML = `
    <div class="panel">
      <h3>${esc(jc.task_name || "Untitled Task")}</h3>
      <p class="tiny muted">From: ${srcLine}</p>
      ${savedLine}

      <h4 class="mt">When to use</h4>
      <p>${esc(jc.when_to_use || "TBD")}</p>

      <h4 class="mt">Tools / PPE</h4>
      ${bullets(jc.tools_ppe)}

      <h4 class="mt">Steps</h4>
      ${steps(jc.steps)}

      <h4 class="mt">Safety notes</h4>
      ${bullets(jc.safety_notes)}

      <h4 class="mt">Common mistakes</h4>
      ${bullets(jc.common_mistakes)}

      <h4 class="mt">Acceptance checks</h4>
      ${bullets(jc.acceptance_checks)}

      <h4 class="mt">Video</h4>
      <p>${ytLine}</p>

      <p class="tiny muted">Training aid • Needs review • Local-only</p>
    </div>
  `;

  // Wire buttons
  const toNotes = document.getElementById("jobcard-to-notes");
  const copyJson = document.getElementById("jobcard-copy-json");
  const clear = document.getElementById("jobcard-clear");

  if (toNotes) {
    toNotes.onclick = () => {
      const tabKey = getActiveTabKey();
      const textarea = document.getElementById(`notes-${tabKey}`);
      if (!textarea) return;

      const summary =
`JOB CARD: ${jc.task_name || ""}
When to use: ${jc.when_to_use || ""}

Tools/PPE:
- ${(jc.tools_ppe || []).join("\n- ")}

Steps:
${(jc.steps || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}

Safety:
- ${(jc.safety_notes || []).join("\n- ")}

Mistakes:
- ${(jc.common_mistakes || []).join("\n- ")}

Acceptance:
- ${(jc.acceptance_checks || []).join("\n- ")}

Video: ${jc.youtube_link || ""}

Source: ${jc.source_url || ""}`;

      textarea.value = (textarea.value ? textarea.value + "\n\n" : "") + summary;
    };
  }

  if (copyJson) {
    copyJson.onclick = async () => {
      await copyTextToClipboard(JSON.stringify(jc, null, 2));
    };
  }

  if (clear) {
    clear.onclick = async () => {
      await chrome.storage.local.remove(["last_job_card", "last_job_card_saved_at"]);
      view.innerHTML = `<div class="muted">Cleared. Generate a new job card from the extension popup.</div>`;
    };
  }
}

/* ---------------------------
   Boot
---------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabKey = btn.dataset.tab;
      setActiveTab(tabKey);
      loadNotes(tabKey);
    });
  });

  // Default tab load
  setActiveTab("line");
  loadNotes("line");
  loadNotes("substation");

  // Notes save/clear buttons
  document.querySelectorAll("[data-save]").forEach(btn => {
    btn.addEventListener("click", () => saveNotes(btn.dataset.save));
  });

  document.querySelectorAll("[data-clear]").forEach(btn => {
    btn.addEventListener("click", () => clearNotes(btn.dataset.clear));
  });

  // Recording (line/substation)
  const recLine = document.getElementById("rec-line");
  const stopLine = document.getElementById("stop-line");
  const recSub = document.getElementById("rec-substation");
  const stopSub = document.getElementById("stop-substation");

  if (recLine) recLine.addEventListener("click", () => startRecording("line"));
  if (stopLine) stopLine.addEventListener("click", () => stopRecording("line"));
  if (recSub) recSub.addEventListener("click", () => startRecording("substation"));
  if (stopSub) stopSub.addEventListener("click", () => stopRecording("substation"));

  // Template copy
  document.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const kind = btn.dataset.copy;
      const el = document.getElementById(`tpl-${kind}`);
      if (!el) return;
      await copyTextToClipboard(el.textContent.trim());
    });
  });

  // Wipe local notes
  const wipe = document.getElementById("wipe-all");
  if (wipe) {
    wipe.addEventListener("click", () => {
      ["line", "substation"].forEach(k => localStorage.removeItem(storageKey(k)));
      loadNotes(getActiveTabKey());
    });
  }

  // Load job card
  loadLatestJobCard();
});
