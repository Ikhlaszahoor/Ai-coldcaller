// ════════════════════════════════════════
// STATE - App ka sara data yahan store hoga
// ════════════════════════════════════════
const state = {
  calls: [],           // Logged calls array
  prospects: [],       // CSV se uploaded prospects
  currentScript: "",   // Generated script text
  timer: {
    running: false,
    seconds: 0,
    interval: null,
  },
};

// ════════════════════════════════════════
// TAB NAVIGATION
// ════════════════════════════════════════
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    // Sab tabs hide karo
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));

    // Selected tab show karo
    document.getElementById(`tab-${tab}`).classList.add("active");
    btn.classList.add("active");
  });
});

// ════════════════════════════════════════
// SCRIPT GENERATION
// Backend se AI script fetch karo
// ════════════════════════════════════════
async function generateScript() {
  const name     = document.getElementById("c-name").value.trim();
  const company  = document.getElementById("c-company").value.trim();
  const role     = document.getElementById("c-role").value.trim();
  const industry = document.getElementById("c-industry").value;
  const offering = document.getElementById("c-offering").value.trim();

  // Basic validation
  if (!name || !offering) {
    showScriptMessage("Please fill in Prospect Name and Offering fields.", "error");
    return;
  }

  const btn = document.getElementById("gen-btn");
  const output = document.getElementById("script-output");

  // Loading state
  btn.disabled = true;
  btn.innerHTML = `<div class="typing-loader"><span></span><span></span><span></span></div>`;
  output.innerHTML = `<div class="typing-loader"><span></span><span></span><span></span></div>`;
  document.getElementById("script-actions").style.display = "none";
  document.getElementById("call-panel").style.display = "none";

  try {
    const res = await fetch("/api/generate-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company, role, industry, offering }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Server error");

    // Script show karo
    state.currentScript = data.script;
    output.style.fontFamily = "'JetBrains Mono', monospace";
    output.textContent = data.script;

    // Action buttons aur call panel show karo
    document.getElementById("script-actions").style.display = "flex";
    document.getElementById("call-panel").style.display = "flex";

  } catch (err) {
    showScriptMessage(`Error: ${err.message}`, "error");
  } finally {
    // Button restore karo
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate Script`;
  }
}

// Script area mein message show karo (error ya info)
function showScriptMessage(msg, type) {
  const output = document.getElementById("script-output");
  const color = type === "error" ? "var(--red)" : "var(--text-secondary)";
  output.innerHTML = `<div class="script-placeholder"><p style="color:${color}">${msg}</p></div>`;
}

// Script copy karo clipboard pe
function copyScript() {
  if (!state.currentScript) return;
  navigator.clipboard.writeText(state.currentScript).catch(() => {});

  const btn = event.target.closest("button");
  const orig = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => (btn.textContent = orig), 1500);
}

// Script print karo
function printScript() {
  if (!state.currentScript) return;
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>Cold Call Script</title>
    <style>body{font-family:monospace;padding:2rem;font-size:14px;line-height:1.8;white-space:pre-wrap;}</style>
    </head><body>${state.currentScript}</body></html>
  `);
  win.print();
}

// ════════════════════════════════════════
// CALL TIMER
// Call duration track karo
// ════════════════════════════════════════
function toggleTimer() {
  const btn = document.getElementById("timer-btn");
  const endBtn = document.getElementById("end-btn");
  const dot = document.getElementById("timer-dot");

  if (!state.timer.running) {
    // Timer start karo
    state.timer.running = true;
    state.timer.seconds = 0;
    dot.classList.add("recording");
    btn.textContent = "Pause";
    endBtn.style.display = "inline-flex";

    state.timer.interval = setInterval(() => {
      state.timer.seconds++;
      updateTimerDisplay();
    }, 1000);
  } else {
    // Timer pause karo
    state.timer.running = false;
    clearInterval(state.timer.interval);
    dot.classList.remove("recording");
    btn.textContent = "Resume";
  }
}

// Timer display update karo (MM:SS format)
function updateTimerDisplay() {
  const mins = Math.floor(state.timer.seconds / 60).toString().padStart(2, "0");
  const secs = (state.timer.seconds % 60).toString().padStart(2, "0");
  document.getElementById("timer-text").textContent = `${mins}:${secs}`;
}

// Call end karo - outcome buttons visible hain already
function endCall() {
  clearInterval(state.timer.interval);
  state.timer.running = false;
  document.getElementById("timer-dot").classList.remove("recording");
  document.getElementById("timer-btn").textContent = "Start Call";
  document.getElementById("end-btn").style.display = "none";
}

// ════════════════════════════════════════
// CALL LOGGING
// Outcome log karo aur dashboard update karo
// ════════════════════════════════════════
function logOutcome(outcome) {
  const name    = document.getElementById("c-name").value.trim() || "Unknown";
  const company = document.getElementById("c-company").value.trim() || "—";
  const notes   = document.getElementById("call-notes").value.trim();
  const duration = formatDuration(state.timer.seconds);

  // Call object banao
  const call = {
    id: Date.now(),
    name,
    company,
    outcome,
    duration,
    notes,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: new Date().toLocaleDateString(),
  };

  // State mein add karo
  state.calls.unshift(call);

  // Dashboard update karo
  updateDashboard();

  // Table mein add karo
  addCallToTable(call);

  // Timer reset karo
  endCall();
  state.timer.seconds = 0;
  updateTimerDisplay();
  document.getElementById("call-notes").value = "";

  // Visual feedback
  showOutcomeFeedback(outcome);
}

// Outcome ke baad brief feedback show karo
function showOutcomeFeedback(outcome) {
  const colors = { interested: "var(--green)", callback: "var(--amber)", "not interested": "var(--red)" };
  const msgs   = { interested: "Marked as Interested!", callback: "Callback scheduled!", "not interested": "Logged as Not Interested" };

  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; padding:12px 20px;
    background:var(--bg-card); border:1px solid ${colors[outcome]};
    color:${colors[outcome]}; border-radius:8px; font-size:13px; font-weight:500;
    z-index:999; animation:fadeIn 0.2s ease;
  `;
  toast.textContent = msgs[outcome];
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// Dashboard stats update karo
function updateDashboard() {
  const total      = state.calls.length;
  const interested = state.calls.filter((c) => c.outcome === "interested").length;
  const callbacks  = state.calls.filter((c) => c.outcome === "callback").length;
  const rate       = total > 0 ? Math.round((interested / total) * 100) : 0;

  document.getElementById("ds-total").textContent      = total;
  document.getElementById("ds-interested").textContent = interested;
  document.getElementById("ds-callback").textContent   = callbacks;
  document.getElementById("ds-rate").textContent       = `${rate}%`;
}

// Table mein nayi row add karo
function addCallToTable(call) {
  const tbody = document.getElementById("call-log-tbody");

  // Empty row remove karo agar pehla call hai
  if (tbody.querySelector(".empty-row")) {
    tbody.innerHTML = "";
  }

  const pillClass = { interested: "pill-green", callback: "pill-amber", "not interested": "pill-red" };

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${escapeHtml(call.name)}</td>
    <td>${escapeHtml(call.company)}</td>
    <td>${call.time}</td>
    <td>${call.duration}</td>
    <td><span class="pill ${pillClass[call.outcome]}">${capitalize(call.outcome)}</span></td>
    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary)">
      ${escapeHtml(call.notes) || "—"}
    </td>
  `;
  tbody.prepend(tr);
}

// ════════════════════════════════════════
// CSV EXPORT
// Call log ko CSV file mein download karo
// ════════════════════════════════════════
function exportCSV() {
  if (state.calls.length === 0) {
    alert("No calls to export yet.");
    return;
  }

  const headers = ["Name", "Company", "Date", "Time", "Duration", "Outcome", "Notes"];
  const rows = state.calls.map((c) => [
    c.name, c.company, c.date, c.time, c.duration, c.outcome, c.notes.replace(/,/g, ";"),
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `call-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════
// CSV UPLOAD (Prospects)
// Server se parse karwao aur table mein show karo
// ════════════════════════════════════════
async function handleCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById("csv-status");
  statusEl.style.display = "block";
  statusEl.className = "csv-status";
  statusEl.textContent = "Uploading and parsing...";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/parse-csv", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "Parse failed");

    state.prospects = data.prospects;
    renderProspectsTable(data.prospects);

    statusEl.className = "csv-status success";
    statusEl.textContent = `${data.total} prospects loaded successfully.`;
    document.getElementById("prospect-count").textContent = `${data.total} prospects`;

  } catch (err) {
    statusEl.className = "csv-status error";
    statusEl.textContent = `Error: ${err.message}`;
  }

  // Input reset karo taake same file dobara upload ho sake
  event.target.value = "";
}

// Prospects table render karo
function renderProspectsTable(prospects) {
  const tbody = document.getElementById("prospect-tbody");

  if (prospects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No valid prospects found in CSV.</td></tr>`;
    return;
  }

  tbody.innerHTML = prospects.map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.company) || "—"}</td>
      <td>${escapeHtml(p.role) || "—"}</td>
      <td>${escapeHtml(p.industry) || "—"}</td>
      <td>${escapeHtml(p.phone) || "—"}</td>
      <td>
        <button class="btn-ghost btn-sm" onclick="loadProspect(${JSON.stringify(p).split('"').join("&quot;")})">
          Load
        </button>
      </td>
    </tr>
  `).join("");
}

// CSV se prospect ko caller form mein load karo
function loadProspect(prospect) {
  document.getElementById("c-name").value     = prospect.name || "";
  document.getElementById("c-company").value  = prospect.company || "";
  document.getElementById("c-role").value     = prospect.role || "";
  document.getElementById("c-phone").value    = prospect.phone || "";

  // Industry select karo agar match kare
  const industryEl = document.getElementById("c-industry");
  Array.from(industryEl.options).forEach((opt) => {
    if (opt.text.toLowerCase().includes((prospect.industry || "").toLowerCase())) {
      industryEl.value = opt.value;
    }
  });

  // Caller tab pe switch karo
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
  document.querySelector('[data-tab="caller"]').classList.add("active");
  document.getElementById("tab-caller").classList.add("active");

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ════════════════════════════════════════
// OBJECTION HANDLER
// Real-time rebuttal AI se fetch karo
// ════════════════════════════════════════
async function handleObjection() {
  const objection = document.getElementById("obj-input").value.trim();
  const context   = document.getElementById("obj-context").value.trim();

  if (!objection) {
    document.getElementById("obj-result").innerHTML =
      `<div class="script-placeholder"><p style="color:var(--red)">Please enter the objection first.</p></div>`;
    return;
  }

  const btn = document.getElementById("obj-btn");
  const result = document.getElementById("obj-result");

  btn.disabled = true;
  btn.innerHTML = `<div class="typing-loader"><span></span><span></span><span></span></div>`;
  result.innerHTML = `<div class="typing-loader"><span></span><span></span><span></span></div>`;

  try {
    const res = await fetch("/api/handle-objection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objection, context }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Response display karo
    result.innerHTML = `
      <div class="obj-response-card">
        <div class="obj-section rebuttal">
          <div class="obj-section-label">Your Response</div>
          <p>${escapeHtml(data.rebuttal)}</p>
        </div>
        <div class="obj-section followup">
          <div class="obj-section-label">Follow-up Question</div>
          <p>${escapeHtml(data.followUp)}</p>
        </div>
      </div>
    `;

    // History mein add karo
    addToObjHistory(objection, data.rebuttal);

  } catch (err) {
    result.innerHTML = `<div class="script-placeholder"><p style="color:var(--red)">Error: ${err.message}</p></div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> Get Response`;
  }
}

// Objection history mein add karo
function addToObjHistory(objection, rebuttal) {
  const historySection = document.getElementById("obj-history");
  const historyList    = document.getElementById("obj-history-list");

  historySection.style.display = "block";

  const item = document.createElement("div");
  item.className = "obj-history-item";
  item.title = rebuttal;
  item.textContent = `"${objection.slice(0, 60)}${objection.length > 60 ? "..." : ""}"`;

  // Click pe obj-input mein load karo
  item.onclick = () => {
    document.getElementById("obj-input").value = objection;
  };

  historyList.prepend(item);

  // Max 5 history items rakhna
  while (historyList.children.length > 5) {
    historyList.removeChild(historyList.lastChild);
  }
}

// ════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════

// Seconds ko MM:SS format mein convert karo
function formatDuration(seconds) {
  if (seconds === 0) return "—";
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// XSS se bachne ke liye HTML escape karo
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// First letter capitalize karo
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

// CSS fadeIn animation add karo
const style = document.createElement("style");
style.textContent = `@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(style);
