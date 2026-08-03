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

function setTheme(mode) {
  settings.theme = mode;
  document.documentElement.setAttribute("data-theme", mode);
  storeSet("settings", settings);
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
  const [p, rl, rd, nl, rt, s] = await Promise.all([
    storeGet("progress"),
    storeGet("reviewLog"),
    storeGet("reviewsDoneLog"),
    storeGet("newWordsLog"),
    storeGet("ratingLog"),
    storeGet("settings"),
  ]);
  if (p) progress = p;
  if (rl) reviewLog = rl;
  if (rd) reviewsDoneLog = rd;
  if (nl) newWordsLog = nl;
  if (rt) ratingLog = rt;
  if (s) settings = { ...settings, ...s };
  document.documentElement.setAttribute("data-theme", settings.theme);
  switchTab("home");
}
init();
