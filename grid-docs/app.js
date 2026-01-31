function setActiveTab(name) {
  document.querySelectorAll(".tab").forEach(btn => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll("[data-panel]").forEach(panel => {
    panel.hidden = panel.dataset.panel !== name;
  });
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
});

// Notes persistence
function notesKey(section) {
  return `grid_notes_${section}`;
}

function loadNotes(section) {
  const el = document.getElementById(`notes-${section}`);
  const saved = localStorage.getItem(notesKey(section));
  if (el && saved !== null) el.value = saved;
}

function saveNotes(section) {
  const el = document.getElementById(`notes-${section}`);
  if (!el) return;
  localStorage.setItem(notesKey(section), el.value);
}

function clearNotes(section) {
  const el = document.getElementById(`notes-${section}`);
  if (!el) return;
  el.value = "";
  localStorage.removeItem(notesKey(section));
}

document.querySelectorAll("[data-save]").forEach(btn => {
  btn.addEventListener("click", () => saveNotes(btn.dataset.save));
});

document.querySelectorAll("[data-clear]").forEach(btn => {
  btn.addEventListener("click", () => clearNotes(btn.dataset.clear));
});

loadNotes("line");
loadNotes("substation");

// Copy template
document.querySelectorAll("[data-copy]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const pre = btn.closest(".panel").querySelector("pre");
    if (!pre) return;
    try {
      await navigator.clipboard.writeText(pre.innerText);
      btn.textContent = "Copied!";
      setTimeout(() => btn.textContent = "Copy Template", 1000);
    } catch {
      alert("Clipboard blocked by browser permissions.");
    }
  });
});

// Wipe all local notes
document.getElementById("wipe-all").addEventListener("click", () => {
  localStorage.removeItem(notesKey("line"));
  localStorage.removeItem(notesKey("substation"));
  loadNotes("line");
  loadNotes("substation");
});

// Recorder (browser mic)
async function setupRecorder(section) {
  const recBtn = document.getElementById(`rec-${section}`);
  const stopBtn = document.getElementById(`stop-${section}`);
  const audioEl = document.getElementById(`play-${section}`);
  const downloadsEl = document.getElementById(`downloads-${section}`);

  let mediaRecorder = null;
  let chunks = [];

  recBtn.addEventListener("click", async () => {
    chunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);

      audioEl.hidden = false;
      audioEl.src = url;

      const ts = new Date().toISOString().replaceAll(":", "-");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${section}-note-${ts}.webm`;
      a.textContent = `Download recording (${section}) • ${ts}`;
      downloadsEl.prepend(a);

      // stop mic tracks
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    recBtn.disabled = true;
    stopBtn.disabled = false;
    recBtn.textContent = "Recording…";
  });

  stopBtn.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    stopBtn.disabled = true;
    recBtn.disabled = false;
    recBtn.textContent = "Start Recording";
  });
}

setupRecorder("line");
setupRecorder("substation");

// Default tab
setActiveTab("line");
