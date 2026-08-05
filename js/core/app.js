/* ============================================================
   APP SHELL — router + lifecycle: global chrome (header/tabs), tab routing, init
   Depends on: core/*, services/*, algorithms/*, các renderXxx trong features/*
   ============================================================ */
let activeTab = "home";
const pageTitle = document.getElementById("pageTitle");
const pageSub = document.getElementById("pageSub");
const mainEl = document.getElementById("main");
const streakChip = document.getElementById("streakChip");
const tabs = document.querySelectorAll(".tab");
let libraryFilter = "all";
let librarySearch = "";
let libraryLimit = 30;

const systemDarkQuery = window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;

/* theme "system" -> luôn theo prefers-color-scheme hiện tại của hệ điều hành/trình duyệt */
function applyTheme() {
  const effective =
    settings.theme === "system"
      ? systemDarkQuery && systemDarkQuery.matches
        ? "dark"
        : "light"
      : settings.theme;
  document.documentElement.setAttribute("data-theme", effective);
}
function setTheme(mode) {
  settings.theme = mode;
  applyTheme();
  storeSet("settings", settings);
}
if (systemDarkQuery) {
  systemDarkQuery.addEventListener("change", () => {
    if (settings.theme === "system") applyTheme();
  });
}
function refreshChrome() {
  streakChip.textContent = `🔥 ${computeStreak()}`;
}

function switchTab(tab) {
  activeTab = tab;
  tabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  if (tab === "home") renderHome();
  else if (tab === "learn") renderLearn();
  else if (tab === "review") renderReviewTab();
  else if (tab === "library") renderLibrary();
  else if (tab === "progress") renderProgress();
  else if (tab === "settings") renderSettings();
  refreshChrome();
}
tabs.forEach((b) =>
  b.addEventListener("click", () => switchTab(b.dataset.tab)),
);
document
  .getElementById("libraryBtn")
  .addEventListener("click", () => switchTab("library"));

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  requestPersistentStorage();
  let p, rl, rd, nl, rt, s, tr;
  try {
    [, p, rl, rd, nl, rt, s, tr] = await Promise.all([
      loadVocabulary(),
      storeGet("progress"),
      storeGet("reviewLog"),
      storeGet("reviewsDoneLog"),
      storeGet("newWordsLog"),
      storeGet("ratingLog"),
      storeGet("settings"),
      storeGet("topicRecency"),
    ]);
  } catch (e) {
    console.error("Không tải được dữ liệu từ vựng:", e);
    mainEl.innerHTML = `<div class="empty-state"><span class="emoji">⚠️</span>Không tải được dữ liệu từ vựng.<br>Hãy mở app qua một local server (vd. Live Server) thay vì mở trực tiếp file HTML.</div>`;
    return;
  }
  if (p) progress = p;
  if (rl) reviewLog = rl;
  if (rd) reviewsDoneLog = rd;
  if (nl) newWordsLog = nl;
  if (rt) ratingLog = rt;
  if (s) settings = { ...settings, ...s };
  if (tr) topicRecency = tr;
  applyTheme();
  switchTab("home");
}
init();
