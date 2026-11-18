const AI_CONFIG = {
  name: "Hill AI",
  creator: "Hillar Tech",
  description: "Your coding and debugging study partner. Paste broken code, trace tricky errors, or learn programming concepts step by step.",
  imageUrl: "https://res.cloudinary.com/dqqyvozdw/image/upload/v1794829406/lxzzqilpwcoxhypl940a.jpg",
  storageKey: "hill_ai_chats_v1",
  suggestions: [
    {
      icon: "fa-bug",
      title: "Debug an error",
      prompt: "I'm getting 'TypeError: Cannot read properties of undefined' in JavaScript. How do I find and fix it?"
    },
    {
      icon: "fa-code",
      title: "Explain recursion",
      prompt: "Can you explain recursion simply with a beginner-friendly Python example and trace how the call stack works?"
    },
    {
      icon: "fa-database",
      title: "Fix a SQL query",
      prompt: "Why would a SQL JOIN return duplicate rows, and how can I debug and fix it?"
    },
    {
      icon: "fa-laptop-code",
      title: "Review my logic",
      prompt: "How do I reverse a linked list iteratively in C++ or Java without losing track of pointers?"
    }
  ]
};

// State
let chats = [];
let activeChatId = null;
let isSending = false;

// DOM Elements
const sidebar = document.getElementById("sidebar");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const menuBtn = document.getElementById("menuBtn");
const newChatBtn = document.getElementById("newChatBtn");
const chatHistoryList = document.getElementById("chatHistoryList");
const chatContainer = document.getElementById("chatContainer");
const chatInner = document.getElementById("chatInner");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  hydrateAvatars(document);
  loadChatsFromStorage();
  renderSidebar();
  renderChatArea();
  setupEventListeners();
});

function setupEventListeners() {
  menuBtn.addEventListener("click", () => {
    sidebar.classList.add("open");
    sidebarBackdrop.classList.add("visible");
  });

  sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  newChatBtn.addEventListener("click", () => {
    createNewChat();
    closeMobileSidebar();
  });

  messageInput.addEventListener("input", () => {
    autoResizeTextarea();
    updateSendButtonState();
  });

  messageInput.addEventListener("keydown", (e) => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (e.key === "Enter" && !e.shiftKey && !isMobile) {
      e.preventDefault();
      if (!sendBtn.disabled) {
        chatForm.dispatchEvent(new Event("submit"));
      }
    }
  });

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || isSending) return;
    await sendMessage(text);
  });
}

function closeMobileSidebar() {
  sidebar.classList.remove("open");
  sidebarBackdrop.classList.remove("visible");
}

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + "px";
}

function updateSendButtonState() {
  sendBtn.disabled = isSending || messageInput.value.trim().length === 0;
}

// Avatar Helper with Fallback to Initial Letter
function hydrateAvatars(root = document) {
  const containers = root.querySelectorAll("[data-ai-avatar]");
  const initial = AI_CONFIG.name.charAt(0).toUpperCase();

  containers.forEach((el) => {
    if (el.dataset.hydrated === "true") return;
    el.dataset.hydrated = "true";
    el.innerHTML = "";

    const img = document.createElement("img");
    img.src = AI_CONFIG.imageUrl;
    img.alt = AI_CONFIG.name;
    img.onerror = () => {
      el.innerHTML = "";
      el.textContent = initial;
    };

    el.appendChild(img);
  });
}

// LocalStorage Persistence
function loadChatsFromStorage() {
  try {
    const raw = localStorage.getItem(AI_CONFIG.storageKey);
    chats = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(chats)) chats = [];
  } catch {
    chats = [];
  }

  if (chats.length > 0) {
    activeChatId = chats[0].id;
  } else {
    activeChatId = null;
  }
}

function saveChatsToStorage() {
  try {
    localStorage.setItem(AI_CONFIG.storageKey, JSON.stringify(chats));
  } catch (err) {
    console.error("Could not save chats:", err);
  }
}

function getActiveChat() {
  return chats.find((c) => c.id === activeChatId) || null;
}

function createNewChat() {
  const newChat = {
    id: "chat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    title: "New Chat",
    messages: [],
    createdAt: Date.now()
  };
  chats.unshift(newChat);
  activeChatId = newChat.id;
  saveChatsToStorage();
  renderSidebar();
  renderChatArea();
  messageInput.focus();
}

function deleteChat(chatId, event) {
  event.stopPropagation();
  chats = chats.filter((c) => c.id !== chatId);
  if (activeChatId === chatId) {
    activeChatId = chats.length > 0 ? chats[0].id : null;
  }
  saveChatsToStorage();
  renderSidebar();
  renderChatArea();
}

function renderSidebar() {
  chatHistoryList.innerHTML = "";

  if (chats.length === 0) {
    const empty = document.createElement("div");
    empty.className = "chat-history-empty";
    empty.textContent = "No recent chats yet.";
    chatHistoryList.appendChild(empty);
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement("div");
    item.className = "history-item" + (chat.id === activeChatId ? " active" : "");
    item.addEventListener("click", () => {
      activeChatId = chat.id;
      renderSidebar();
      renderChatArea();
      closeMobileSidebar();
    });

    const titleSpan = document.createElement("span");
    titleSpan.className = "history-title";
    titleSpan.textContent = chat.title || "New Chat";

    const delBtn = document.createElement("button");
    delBtn.className = "delete-chat-btn";
    delBtn.type = "button";
    delBtn.title = "Delete chat";
    delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    delBtn.addEventListener("click", (e) => deleteChat(chat.id, e));

    item.appendChild(titleSpan);
    item.appendChild(delBtn);
    chatHistoryList.appendChild(item);
  });
}

function renderChatArea() {
  const currentChat = getActiveChat();
  chatInner.innerHTML = "";

  if (!currentChat || currentChat.messages.length === 0) {
    renderWelcomeScreen();
    return;
  }

  currentChat.messages.forEach((msg, index) => {
    appendMessageElement(msg, index);
  });

  scrollToBottom();
}

function renderWelcomeScreen() {
  const welcome = document.createElement("div");
  welcome.className = "welcome-screen";

  const cardsHtml = AI_CONFIG.suggestions
    .map(
      (item, idx) => `
      <button type="button" class="suggestion-card" data-suggestion-idx="${idx}">
        <div class="suggestion-card-title">
          <i class="fa-solid ${item.icon}"></i>
          <span>${escapeHtml(item.title)}</span>
        </div>
        <div class="suggestion-card-desc">${escapeHtml(item.prompt)}</div>
      </button>
    `
    )
    .join("");

  welcome.innerHTML = `
    <div class="avatar-wrap avatar-lg" data-ai-avatar></div>
    <h1 class="welcome-title">Hi, I'm ${escapeHtml(AI_CONFIG.name)}</h1>
    <p class="welcome-subtitle">${escapeHtml(AI_CONFIG.description)}</p>
    <div class="suggestions-grid">${cardsHtml}</div>
  `;

  chatInner.appendChild(welcome);
  hydrateAvatars(welcome);

  welcome.querySelectorAll(".suggestion-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.suggestionIdx);
      const chosen = AI_CONFIG.suggestions[idx];
      if (chosen) {
        sendMessage(chosen.prompt);
      }
    });
  });
}

function appendMessageElement(msg, msgIndex) {
  const row = document.createElement("div");
  row.className = `message-row ${msg.role}`;

  if (msg.role === "user") {
    const bubble = document.createElement("div");
    bubble.className = "user-bubble";
    bubble.textContent = msg.content;
    row.appendChild(bubble);
    chatInner.appendChild(row);
    return;
  }

  // Assistant Message
  const avatar = document.createElement("div");
  avatar.className = "avatar-wrap avatar-sm";
  avatar.setAttribute("data-ai-avatar", "");

  const contentWrap = document.createElement("div");
  contentWrap.className = "assistant-content-wrap";

  const bubble = document.createElement("div");
  bubble.className = "assistant-bubble" + (msg.isError ? " error-bubble" : "");
  bubble.innerHTML = formatMarkdown(msg.content);

  // Attach copy listeners to code blocks
  bubble.querySelectorAll(".copy-code-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const pre = btn.closest(".code-block-wrapper").querySelector("pre");
      if (!pre) return;
      await copyTextToClipboard(pre.textContent);
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
      setTimeout(() => {
        btn.innerHTML = originalHtml;
      }, 1800);
    });
  });

  contentWrap.appendChild(bubble);

  // Action bar under AI reply
  const actions = document.createElement("div");
  actions.className = "message-actions";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "action-btn";
  copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
  copyBtn.addEventListener("click", async () => {
    await copyTextToClipboard(msg.content);
    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied</span>';
    setTimeout(() => {
      copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
    }, 1800);
  });

  // Timestamp
  const timeSpan = document.createElement("span");
  timeSpan.className = "msg-timestamp";
  timeSpan.textContent = msg.time || formatTime(new Date());

  // Thumbs Up
  const thumbUpBtn = document.createElement("button");
  thumbUpBtn.type = "button";
  thumbUpBtn.className = "action-btn" + (msg.feedback === "up" ? " active" : "");
  thumbUpBtn.title = "Helpful";
  thumbUpBtn.innerHTML = '<i class="fa-regular fa-thumbs-up"></i>';

  // Thumbs Down
  const thumbDownBtn = document.createElement("button");
  thumbDownBtn.type = "button";
  thumbDownBtn.className = "action-btn" + (msg.feedback === "down" ? " active-down" : "");
  thumbDownBtn.title = "Not helpful";
  thumbDownBtn.innerHTML = '<i class="fa-regular fa-thumbs-down"></i>';

  thumbUpBtn.addEventListener("click", () => {
    const activeChat = getActiveChat();
    if (!activeChat || !activeChat.messages[msgIndex]) return;
    const current = activeChat.messages[msgIndex].feedback;
    activeChat.messages[msgIndex].feedback = current === "up" ? null : "up";
    saveChatsToStorage();
    thumbUpBtn.className = "action-btn" + (activeChat.messages[msgIndex].feedback === "up" ? " active" : "");
    thumbDownBtn.className = "action-btn";
  });

  thumbDownBtn.addEventListener("click", () => {
    const activeChat = getActiveChat();
    if (!activeChat || !activeChat.messages[msgIndex]) return;
    const current = activeChat.messages[msgIndex].feedback;
    activeChat.messages[msgIndex].feedback = current === "down" ? null : "down";
    saveChatsToStorage();
    thumbDownBtn.className = "action-btn" + (activeChat.messages[msgIndex].feedback === "down" ? " active-down" : "");
    thumbUpBtn.className = "action-btn";
  });

  actions.appendChild(copyBtn);
  actions.appendChild(timeSpan);
  actions.appendChild(thumbUpBtn);
  actions.appendChild(thumbDownBtn);

  contentWrap.appendChild(actions);
  row.appendChild(avatar);
  row.appendChild(contentWrap);
  chatInner.appendChild(row);
  hydrateAvatars(row);
}

function showTypingIndicator() {
  const row = document.createElement("div");
  row.className = "message-row assistant";
  row.id = "typingIndicatorRow";

  row.innerHTML = `
    <div class="avatar-wrap avatar-sm" data-ai-avatar></div>
    <div class="assistant-content-wrap">
      <div class="assistant-bubble">
        <div class="typing-dots" aria-label="Hill AI is typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;

  chatInner.appendChild(row);
  hydrateAvatars(row);
  scrollToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typingIndicatorRow");
  if (indicator) indicator.remove();
}

async function sendMessage(text) {
  let currentChat = getActiveChat();
  if (!currentChat) {
    createNewChat();
    currentChat = getActiveChat();
  }

  // If welcome screen is visible, clear it
  if (currentChat.messages.length === 0) {
    chatInner.innerHTML = "";
    currentChat.title = text.length > 36 ? text.slice(0, 36) + "..." : text;
  }

  const userMsg = {
    role: "user",
    content: text,
    time: formatTime(new Date())
  };

  currentChat.messages.push(userMsg);
  saveChatsToStorage();
  renderSidebar();
  appendMessageElement(userMsg, currentChat.messages.length - 1);

  messageInput.value = "";
  autoResizeTextarea();
  isSending = true;
  updateSendButtonState();
  scrollToBottom();
  showTypingIndicator();

  try {
    const payloadMessages = currentChat.messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payloadMessages })
    });

    const data = await response.json().catch(() => ({}));
    removeTypingIndicator();

    if (!response.ok || !data.reply) {
      throw new Error(data.error || "Something went wrong while reaching Hill AI.");
    }

    const aiMsg = {
      role: "assistant",
      content: data.reply,
      time: formatTime(new Date()),
      feedback: null
    };

    currentChat.messages.push(aiMsg);
    saveChatsToStorage();
    appendMessageElement(aiMsg, currentChat.messages.length - 1);
  } catch (err) {
    removeTypingIndicator();
    const errorMsg = {
      role: "assistant",
      content: `Sorry, I ran into an issue: ${err.message || "Network error. Please try again."}`,
      time: formatTime(new Date()),
      feedback: null,
      isError: true
    };
    currentChat.messages.push(errorMsg);
    saveChatsToStorage();
    appendMessageElement(errorMsg, currentChat.messages.length - 1);
  } finally {
    isSending = false;
    updateSendButtonState();
    scrollToBottom();
  }
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
}

// Safe HTML Escaping + Lightweight Markdown Formatter
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineMarkdown(escapedText) {
  // Inline code: `code`
  let out = escapedText.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  // Bold: **text**
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  return out;
}

function formatMarkdown(rawText) {
  const codeBlocks = [];
  // Extract fenced code blocks first so their contents stay untouched
  const textWithPlaceholders = String(rawText).replace(
    /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const languageLabel = escapeHtml(lang.trim() || "code");
      const escapedCode = escapeHtml(code.replace(/\n$/, ""));
      const blockHtml = `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span>${languageLabel}</span>
            <button type="button" class="copy-code-btn">
              <i class="fa-regular fa-copy"></i> Copy code
            </button>
          </div>
          <pre><code>${escapedCode}</code></pre>
        </div>
      `;
      const token = `@@CODEBLOCK_${codeBlocks.length}@@`;
      codeBlocks.push(blockHtml);
      return `\n${token}\n`;
    }
  );

  const lines = textWithPlaceholders.split("\n");
  const htmlParts = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      htmlParts.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlParts.push("</ol>");
      inOl = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Restore code block placeholder
    const codeMatch = trimmed.match(/^@@CODEBLOCK_(\d+)@@$/);
    if (codeMatch) {
      closeLists();
      htmlParts.push(codeBlocks[Number(codeMatch[1])]);
      continue;
    }

    if (!trimmed) {
      closeLists();
      continue;
    }

    // Headings (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      const content = formatInlineMarkdown(escapeHtml(headingMatch[2]));
      htmlParts.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    // Unordered list (- or *)
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) {
        htmlParts.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push("<ul>");
        inUl = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdown(escapeHtml(ulMatch[1]))}</li>`);
      continue;
    }

    // Ordered list (1. 2. etc.)
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) {
        htmlParts.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        htmlParts.push("<ol>");
        inOl = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdown(escapeHtml(olMatch[1]))}</li>`);
      continue;
    }

    closeLists();
    htmlParts.push(`<p>${formatInlineMarkdown(escapeHtml(line))}</p>`);
  }

  closeLists();
  return htmlParts.join("");
}
