/* ═══════════════════════════════════════════════════════════════════════════
   C Buddy — app.js  (Static / GitHub Pages edition)
   Calls Gemini REST API directly from the browser.
   API key is stored in localStorage — never in source code.
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Gemini config ────────────────────────────────────────────────────────────
const GEMINI_MODEL    = "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `You are an expert C Programming AI Tutor named "C Buddy". Your ONLY purpose is to help users with everything related to the C programming language.

TOPICS YOU HANDLE:
- Introduction to C, history, structure, compilers, IDEs
- Compilation and execution process
- Tokens, keywords, identifiers
- Variables, constants, data types (int, float, char, double, etc.)
- Operators (arithmetic, relational, logical, bitwise, assignment, conditional)
- Input/output: printf(), scanf(), getchar(), putchar()
- Conditional statements: if, if-else, nested if, switch
- Loops: for, while, do-while; break and continue
- Arrays (1D, 2D, multi-dimensional) and strings
- Functions, function prototypes, recursion, inline functions
- Pointers, pointer arithmetic, pointer to pointer, pointers and arrays
- Structures, unions, enumerations (enum), typedef
- Dynamic memory allocation: malloc(), calloc(), realloc(), free()
- File handling: fopen(), fclose(), fread(), fwrite(), fprintf(), fscanf()
- Preprocessor directives (#define, #include, #ifdef, macros)
- Header files and creating custom header files
- Storage classes: auto, extern, static, register
- Command-line arguments: argc, argv
- C standard library functions (string.h, math.h, stdlib.h, etc.)
- Data structures in C: linked lists, stacks, queues, trees, graphs
- Algorithms in C: sorting, searching, recursion
- Debugging: syntax errors, logical errors, runtime errors, segmentation faults
- Memory leaks, undefined behavior, buffer overflows
- Code optimization and best practices

RESPONSE BEHAVIOR:

CONCEPTUAL QUESTIONS:
- Start with a clear, simple definition.
- Explain the concept progressively.
- Provide a practical, compilable code example.
- Explain the example step by step.
- Mention common mistakes or edge cases when relevant.

CODE GENERATION REQUESTS:
- Provide COMPLETE, compilable, standard C code (C99/C11).
- Add meaningful inline comments inside the code.
- After the code, briefly explain how it works.
- Show sample input/output where helpful.

DEBUGGING REQUESTS (user sends broken code):
- Identify ALL errors (syntax, logical, runtime, memory).
- Explain WHY each error occurs.
- Provide the fully corrected code.
- Explain the exact changes made.

OUTPUT PREDICTION ("what is the output?"):
- Trace execution step by step.
- Give the exact, correct output.
- Explain each step of the trace.
- If the output involves undefined behavior, explicitly state this.

EXAM ANSWERS:
- Structure your answer with: Definition → Explanation → Syntax → Example Code → Output.
- Keep language simple and suitable for a college student.

FOLLOW-UP QUESTIONS:
- Always consider prior conversation context.
- Never ask the user to repeat something they already shared in this session.

CODE FORMAT:
- Always wrap C code in triple backtick code blocks with the language tag.
- Keep code clean and properly indented (4 spaces).

OFF-TOPIC HANDLING:
If the user asks something unrelated to C programming or computer science, respond with:
"I'm C Buddy, specialized in C programming. I can help you with C concepts, writing programs, debugging, data structures, algorithms, and more. Please ask me a C-related question! 😊"

TONE: Friendly, patient, encouraging — like a knowledgeable senior student or tutor. Use simple English suitable for a beginner or college-level student.`;

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
let conversationHistory = []; // [{role:"user"|"model", parts:[{text}]}]
let isStreaming = false;

// ─── DOM refs ──────────────────────────────────────────────────────────────────
const messagesEl     = document.getElementById("messages");
const chatAreaEl     = document.getElementById("chatArea");
const userInputEl    = document.getElementById("userInput");
const sendBtnEl      = document.getElementById("sendBtn");
const newChatBtnEl   = document.getElementById("newChatBtn");
const topicListEl    = document.getElementById("topicList");
const sampleGridEl   = document.getElementById("sampleGrid");
const welcomeEl      = document.getElementById("welcomeScreen");
const statusDotEl    = document.getElementById("statusDot");
const sidebarEl      = document.getElementById("sidebar");
const menuBtnEl      = document.getElementById("menuBtn");
const sidebarCloseEl = document.getElementById("sidebarClose");
const overlayEl      = document.getElementById("sidebarOverlay");

// API key modal refs
const apiModalEl        = document.getElementById("apiKeyModal");
const apiKeyInputEl     = document.getElementById("apiKeyInput");
const saveKeyBtnEl      = document.getElementById("saveKeyBtn");
const changeKeyBtnEl    = document.getElementById("changeKeyBtn");
const apiKeyToggleBtnEl = document.getElementById("apiKeyToggleBtn");

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  buildTopicList();
  buildSampleGrid();
  bindEvents();
  checkApiKey();
})();

// ─── API key management ───────────────────────────────────────────────────────

function getApiKey() {
  return localStorage.getItem("cbuddy_gemini_key") || "";
}

function saveApiKey(key) {
  localStorage.setItem("cbuddy_gemini_key", key.trim());
}

function clearApiKey() {
  localStorage.removeItem("cbuddy_gemini_key");
}

function checkApiKey() {
  if (!getApiKey()) {
    showApiModal();
  } else {
    hideApiModal();
    setStatusOnline();
  }
}

function showApiModal() {
  apiModalEl.classList.add("visible");
  apiKeyInputEl.value = "";
  setTimeout(() => apiKeyInputEl.focus(), 300);
}

function hideApiModal() {
  apiModalEl.classList.remove("visible");
}

function setStatusOnline() {
  statusDotEl.classList.add("online");
  statusDotEl.classList.remove("error");
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

  // Mobile sidebar
  menuBtnEl.addEventListener("click", openSidebar);
  sidebarCloseEl.addEventListener("click", closeSidebar);
  overlayEl.addEventListener("click", closeSidebar);

  // API key modal
  saveKeyBtnEl.addEventListener("click", onSaveKey);
  changeKeyBtnEl.addEventListener("click", showApiModal);
  apiKeyInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSaveKey();
  });

  // Toggle show/hide API key input
  if (apiKeyToggleBtnEl) {
    apiKeyToggleBtnEl.addEventListener("click", () => {
      const isPassword = apiKeyInputEl.type === "password";
      apiKeyInputEl.type = isPassword ? "text" : "password";
      apiKeyToggleBtnEl.textContent = isPassword ? "🙈" : "👁";
    });
  }
}

function onSaveKey() {
  const key = apiKeyInputEl.value.trim();
  if (!key || !key.startsWith("AIza")) {
    apiKeyInputEl.classList.add("shake");
    setTimeout(() => apiKeyInputEl.classList.remove("shake"), 600);
    apiKeyInputEl.placeholder = "Must start with AIza... — get it from aistudio.google.com";
    return;
  }
  saveApiKey(key);
  hideApiModal();
  setStatusOnline();
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

  const apiKey = getApiKey();
  if (!apiKey) { showApiModal(); return; }

  hideWelcome();
  addUserMessage(text);

  userInputEl.value = "";
  userInputEl.style.height = "auto";
  sendBtnEl.disabled = true;
  isStreaming = true;

  // Add to history
  conversationHistory.push({ role: "user", parts: [{ text }] });

  const typingEl = showTyping();

  try {
    // Build request body for Gemini REST API
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: conversationHistory,
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8192,
      },
    };

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    removeTyping(typingEl);

    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || "Invalid API key.";
      addAiMessage(`⚠️ **API Key Error:** ${msg}\n\nPlease update your Gemini API key using the key button in the header.`);
      conversationHistory.pop();
      clearApiKey();
      statusDotEl.classList.remove("online");
      statusDotEl.classList.add("error");
      return;
    }

    if (!res.ok) {
      addAiMessage(`⚠️ **Error ${res.status}:** Something went wrong. Please try again.`);
      conversationHistory.pop();
      return;
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "Sorry, I didn't receive a response. Please try again.";

    addAiMessage(reply);

    // Add model reply to history
    conversationHistory.push({ role: "model", parts: [{ text: reply }] });

    // Cap history at 40 entries (20 exchanges)
    if (conversationHistory.length > 40) {
      conversationHistory = conversationHistory.slice(-40);
    }

    setStatusOnline();
  } catch (err) {
    removeTyping(typingEl);
    addAiMessage(
      `⚠️ **Network Error:** Could not reach the Gemini API.\n\nPlease check your internet connection and try again.`
    );
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
  const html = marked.parse(markdown);
  row.innerHTML = `
    <div class="msg-avatar ai-av">⚙</div>
    <div class="msg-content">
      <div class="msg-label">C Buddy</div>
      <div class="msg-bubble">${html}</div>
    </div>`;
  messagesEl.appendChild(row);

  if (window.Prism) {
    row.querySelectorAll("pre code").forEach((block) => Prism.highlightElement(block));
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
  const welcome = buildWelcomeScreen();
  chatAreaEl.insertBefore(welcome, messagesEl);
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

// ─── Mobile sidebar ───────────────────────────────────────────────────────────
function openSidebar() {
  sidebarEl.classList.add("open");
  overlayEl.classList.add("active");
}

function closeSidebar() {
  sidebarEl.classList.remove("open");
  overlayEl.classList.remove("active");
}
