/* ═══════════════════════════════════════════════════════════════════════════
   C Buddy — app.js  (Vercel edition)
   Sends messages to /api/chat (serverless backend).
   No API key needed from the user — key lives securely on the server.
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Topic / Sample data ──────────────────────────────────────────────────────
const TOPICS = [
  { emoji: "📌", label: "Introduction to C" },
  { emoji: "🔤", label: "Variables & Data Types" },
  { emoji: "➕", label: "Operators" },
  { emoji: "🔁", label: "Loops (for / while / do-while)" },
  { emoji: "🔀", label: "if / else / switch" },
  { emoji: "📦", label: "Arrays" },
  { emoji: "🔤", label: "Strings" },
  { emoji: "🧩", label: "Functions & Recursion" },
  { emoji: "👉", label: "Pointers" },
  { emoji: "🏗️", label: "Structures & Unions" },
  { emoji: "💾", label: "Dynamic Memory Allocation" },
  { emoji: "📁", label: "File Handling" },
  { emoji: "🔧", label: "Preprocessor Directives" },
  { emoji: "🗄️", label: "Storage Classes" },
  { emoji: "🔀", label: "Bitwise Operators" },
  { emoji: "🐞", label: "Debugging C Code" },
  { emoji: "🔗", label: "Linked Lists in C" },
  { emoji: "📊", label: "Sorting Algorithms" },
];

const SAMPLE_CARDS = [
  { emoji: "👉", text: "What is a pointer in C? Explain with an example." },
  { emoji: "🐞", text: "Debug this C code and explain the errors." },
  { emoji: "💾", text: "Explain malloc() and free() with a program." },
  { emoji: "🔁", text: "Write a C program to reverse an array using a loop." },
  { emoji: "📦", text: "How do 2D arrays work in C? Give an example." },
  { emoji: "🏗️", text: "What is a structure in C? How is it different from a union?" },
];

// ─── Marked.js config ─────────────────────────────────────────────────────────
marked.setOptions({ gfm: true, breaks: true, headerIds: false });

const renderer = new marked.Renderer();
renderer.code = function (code, language) {
  const lang = (language || "c").toLowerCase();
  const escaped = code
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
    <div class="code-block-wrap">
      <div class="code-block-header">
        <span class="code-lang-badge">${lang}</span>
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
      </div>
      <pre><code class="language-${lang}">${escaped}</code></pre>
    </div>`;
};
marked.use({ renderer });

// ─── State ────────────────────────────────────────────────────────────────────
let conversationHistory = [];
let isStreaming = false;

// ─── DOM refs ──────────────────────────────────────────────────────────────────
const messagesEl     = document.getElementById("messages");
const chatAreaEl     = document.getElementById("chatArea");
const userInputEl    = document.getElementById("userInput");
const sendBtnEl      = document.getElementById("sendBtn");
const newChatBtnEl   = document.getElementById("newChatBtn");
const topicListEl    = document.getElementById("topicList");
const sampleGridEl   = document.getElementById("sampleGrid");
const statusDotEl    = document.getElementById("statusDot");
const sidebarEl      = document.getElementById("sidebar");
const menuBtnEl      = document.getElementById("menuBtn");
const sidebarCloseEl = document.getElementById("sidebarClose");
const overlayEl      = document.getElementById("sidebarOverlay");

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  buildTopicList();
  buildSampleGrid();
  bindEvents();
  pingServer();
})();

// ─── Server health check ──────────────────────────────────────────────────────
async function pingServer() {
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi", history: [] }),
    });
    statusDotEl.classList.toggle("online", r.ok);
    statusDotEl.classList.toggle("error", !r.ok);
  } catch {
    statusDotEl.classList.add("error");
  }
}

// ─── Build sidebar topics ─────────────────────────────────────────────────────
function buildTopicList() {
  topicListEl.innerHTML = TOPICS.map(t => `
    <button class="topic-chip" onclick="sendTopicQuestion(${JSON.stringify(t.label)})">
      <span class="topic-emoji">${t.emoji}</span>
      <span>${t.label}</span>
    </button>`).join("");
}

// ─── Build welcome sample cards ───────────────────────────────────────────────
function buildSampleGrid() {
  sampleGridEl.innerHTML = SAMPLE_CARDS.map(c => `
    <button class="sample-card" onclick="sendSampleQuestion(${JSON.stringify(c.text)})">
      <span class="card-emoji">${c.emoji}</span>
      ${escapeHtml(c.text)}
    </button>`).join("");
}

// ─── Event binds ──────────────────────────────────────────────────────────────
function bindEvents() {
  userInputEl.addEventListener("input", onInputChange);
  userInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtnEl.disabled) handleSend();
    }
  });
  sendBtnEl.addEventListener("click", handleSend);
  newChatBtnEl.addEventListener("click", resetChat);
  menuBtnEl.addEventListener("click", openSidebar);
  sidebarCloseEl.addEventListener("click", closeSidebar);
  overlayEl.addEventListener("click", closeSidebar);
}

function onInputChange() {
  userInputEl.style.height = "auto";
  userInputEl.style.height = Math.min(userInputEl.scrollHeight, 160) + "px";
  sendBtnEl.disabled = !userInputEl.value.trim() || isStreaming;
}

// ─── Core send flow ───────────────────────────────────────────────────────────
async function handleSend() {
  const text = userInputEl.value.trim();
  if (!text || isStreaming) return;

  hideWelcome();
  addUserMessage(text);

  userInputEl.value = "";
  userInputEl.style.height = "auto";
  sendBtnEl.disabled = true;
  isStreaming = true;

  conversationHistory.push({ role: "user", parts: [{ text }] });

  const typingEl = showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: conversationHistory.slice(0, -1), // history before current msg
      }),
    });

    removeTyping(typingEl);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      addAiMessage(`⚠️ **Error ${res.status}:** ${errData.error || "Something went wrong. Please try again."}`);
      conversationHistory.pop();
      statusDotEl.classList.add("error");
      statusDotEl.classList.remove("online");
      return;
    }

    const data = await res.json();
    const reply = data.reply || "Sorry, I didn't get a response. Please try again.";

    addAiMessage(reply);
    conversationHistory.push({ role: "model", parts: [{ text: reply }] });

    if (conversationHistory.length > 40) {
      conversationHistory = conversationHistory.slice(-40);
    }

    statusDotEl.classList.add("online");
    statusDotEl.classList.remove("error");
  } catch {
    removeTyping(typingEl);
    addAiMessage("⚠️ **Network error.** Please check your connection and try again.");
    conversationHistory.pop();
    statusDotEl.classList.add("error");
    statusDotEl.classList.remove("online");
  } finally {
    isStreaming = false;
    sendBtnEl.disabled = !userInputEl.value.trim();
  }
}

// ─── Quick-action helpers ─────────────────────────────────────────────────────
function sendTopicQuestion(topic) {
  userInputEl.value = `Explain ${topic} in C programming with an example.`;
  onInputChange();
  closeSidebar();
  userInputEl.focus();
}

function sendSampleQuestion(text) {
  userInputEl.value = text;
  onInputChange();
  handleSend();
}

// ─── Message rendering ────────────────────────────────────────────────────────
function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "msg-row";
  row.innerHTML = `
    <div class="msg-avatar user-av">U</div>
    <div class="msg-content">
      <div class="msg-label">You</div>
      <div class="msg-bubble">${escapeHtml(text).replace(/\n/g, "<br>")}</div>
    </div>`;
  messagesEl.appendChild(row);
  scrollToBottom();
}

function addAiMessage(markdown) {
  const row = document.createElement("div");
  row.className = "msg-row";
  row.innerHTML = `
    <div class="msg-avatar ai-av">⚙</div>
    <div class="msg-content">
      <div class="msg-label">C Buddy</div>
      <div class="msg-bubble">${marked.parse(markdown)}</div>
    </div>`;
  messagesEl.appendChild(row);
  if (window.Prism) {
    row.querySelectorAll("pre code").forEach(b => Prism.highlightElement(b));
  }
  scrollToBottom();
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function showTyping() {
  const wrap = document.createElement("div");
  wrap.className = "msg-row typing-row";
  wrap.innerHTML = `
    <div class="msg-avatar ai-av">⚙</div>
    <div class="msg-content">
      <div class="typing-indicator">
        <div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>
    </div>`;
  messagesEl.appendChild(wrap);
  scrollToBottom();
  return wrap;
}

function removeTyping(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ─── Copy code ────────────────────────────────────────────────────────────────
function copyCode(btn) {
  const codeEl = btn.closest(".code-block-wrap").querySelector("code");
  if (!codeEl) return;
  navigator.clipboard.writeText(codeEl.innerText).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 2000);
  });
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function hideWelcome() {
  const el = document.getElementById("welcomeScreen");
  if (el && el.parentNode) {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }
}

function resetChat() {
  conversationHistory = [];
  messagesEl.innerHTML = "";
  isStreaming = false;
  sendBtnEl.disabled = true;
  userInputEl.value = "";
  userInputEl.style.height = "auto";
  chatAreaEl.insertBefore(buildWelcomeScreen(), messagesEl);
  closeSidebar();
}

function buildWelcomeScreen() {
  const div = document.createElement("div");
  div.id = "welcomeScreen";
  div.className = "welcome-screen";
  div.innerHTML = `
    <div class="welcome-glow"></div>
    <div class="welcome-avatar">⚙</div>
    <h1 class="welcome-title">C Buddy</h1>
    <p class="welcome-sub">Your personal AI C Programming Tutor</p>
    <div class="sample-questions-label">Try asking me about…</div>
    <div class="sample-grid">
      ${SAMPLE_CARDS.map(c => `
        <button class="sample-card" onclick="sendSampleQuestion(${JSON.stringify(c.text)})">
          <span class="card-emoji">${c.emoji}</span>
          ${escapeHtml(c.text)}
        </button>`).join("")}
    </div>`;
  return div;
}

function scrollToBottom() {
  requestAnimationFrame(() => { chatAreaEl.scrollTop = chatAreaEl.scrollHeight; });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function openSidebar() { sidebarEl.classList.add("open"); overlayEl.classList.add("active"); }
function closeSidebar() { sidebarEl.classList.remove("open"); overlayEl.classList.remove("active"); }
