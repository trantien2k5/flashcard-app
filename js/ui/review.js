/* ============================================================
   TAB: REVIEW — tổng quan từ đến hạn, bắt đầu phiên ôn tập
   Depends on: core/*, data/vocabulary.js, app.js, ui/study.js (startReviewSession)
   ============================================================ */
let reviewCountdownTimer = null;

function stopReviewCountdown() {
  if (reviewCountdownTimer) {
    clearInterval(reviewCountdownTimer);
    reviewCountdownTimer = null;
  }
}
function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function startReviewCountdown(targetDate) {
  stopReviewCountdown();
  const tick = () => {
    const el = document.getElementById("reviewCountdown");
    if (!el || !document.body.contains(el)) {
      stopReviewCountdown();
      return;
    }
    const ms = targetDate - new Date();
    if (ms <= 0) {
      renderReviewTab();
      return;
    }
    el.textContent = formatCountdown(ms);
  };
  tick();
  reviewCountdownTimer = setInterval(tick, 1000);
}

function renderReviewTab() {
  stopReviewCountdown();
  pageTitle.textContent = "Ôn tập";
  const due = dueCards();
  const remaining = reviewsRemainingToday();
  const capped = remaining < due.length;
  const hasNewCards = newCards().length > 0;
  const upcoming = due.length === 0 ? nextUpcomingDue() : null;

  pageSub.textContent =
    due.length === 0
      ? hasNewCards
        ? "Không có từ đến hạn — học thêm từ mới nhé"
        : "Bạn đã ôn hết, hẹn gặp lại ngày mai!"
      : remaining === 0
        ? "Đã đạt giới hạn ôn tập hôm nay"
        : "Ôn lại từ đến hạn bằng active recall";

  const byTopic = {};
  due.forEach((c) => {
    byTopic[c.topicId] = (byTopic[c.topicId] || 0) + 1;
  });

  let listHtml = "";
  if (due.length === 0) {
    listHtml = hasNewCards
      ? `<div class="empty-state"><span class="emoji">✨</span>Không có từ nào đến hạn ôn tập.<br>Hãy học thêm từ mới để mở rộng vốn từ nhé!</div>`
      : `<div class="empty-state"><span class="emoji">✅</span>Bạn đã ôn hết từ đến hạn hôm nay.<br>Quay lại vào ngày mai nhé!</div>`;
  } else {
    listHtml =
      `<div class="section-label">Theo chủ đề</div>` +
      TOPICS.filter((t) => byTopic[t.id])
        .map(
          (t) => `
      <div class="topic-row" data-topic="${t.id}">
        <div class="icon-badge" style="background:${t.color}22; width:36px; height:36px; font-size:16px;">${t.icon}</div>
        <div class="info"><div class="name">${t.name}</div><div class="due">${byTopic[t.id]} từ đến hạn</div></div>
      </div>`,
        )
        .join("");
  }

  const topBox =
    due.length > 0
      ? `
      <div style="font-family:var(--font-display); font-size:44px; font-weight:600;">${due.length}</div>
      <div style="font-size:12.5px; color:var(--ink-soft); margin-top:2px;">từ cần ôn hôm nay</div>
      ${capped ? `<div style="font-size:11.5px; color:var(--accent-soft-ink); background:var(--accent-soft); border-radius:999px; padding:5px 12px; margin-top:10px; display:inline-block;">Đã đạt giới hạn ${settings.dailyGoal} thẻ/ngày — còn ${due.length - remaining} từ để ngày mai</div>` : ""}
      ${
        remaining > 0
          ? `<button class="btn-primary" id="startReviewBtn" style="margin-top:14px;">Ôn tập ngay${capped ? ` (${remaining} thẻ)` : ""}</button>
           ${remaining > 4 ? `<button class="btn-secondary" id="quickReviewBtn" style="margin-top:8px;">Ôn nhanh 5 từ (~2 phút)</button>` : ""}`
          : `<div class="empty-state" style="padding:14px 0 0;"><span class="emoji">🎉</span>Đã hoàn thành giới hạn ôn tập hôm nay!</div>`
      }
    `
      : upcoming
        ? `
        <div style="font-size:12px; color:var(--ink-soft);">Từ tiếp theo đến hạn sau</div>
        <div id="reviewCountdown" style="font-family:var(--font-mono); font-size:36px; font-weight:700; color:var(--accent); margin-top:6px;">--:--</div>
        <div style="font-size:12px; color:var(--ink-soft); margin-top:8px;">${upcoming.count} từ sẽ đến hạn lúc đó</div>
        ${hasNewCards ? `<button class="btn-primary" id="goLearnBtn" style="margin-top:14px;">Học từ mới trong lúc chờ</button>` : ""}
      `
        : `
        <div style="font-family:var(--font-display); font-size:44px; font-weight:600;">0</div>
        <div style="font-size:12.5px; color:var(--ink-soft); margin-top:2px;">từ cần ôn hôm nay</div>
        ${hasNewCards ? `<button class="btn-primary" id="goLearnBtn" style="margin-top:14px;">Học từ mới</button>` : ""}
      `;

  mainEl.innerHTML = `
    <div class="card-box" style="text-align:center;">${topBox}</div>
    ${listHtml}
  `;
  const startBtn = document.getElementById("startReviewBtn");
  if (startBtn)
    startBtn.addEventListener("click", () =>
      startReviewSession(todaysReviewBatch()),
    );
  const quickBtn = document.getElementById("quickReviewBtn");
  if (quickBtn)
    quickBtn.addEventListener("click", () =>
      startReviewSession(shuffle(todaysReviewBatch()).slice(0, 5)),
    );
  const goLearnBtn = document.getElementById("goLearnBtn");
  if (goLearnBtn)
    goLearnBtn.addEventListener("click", () => switchTab("learn"));
  mainEl.querySelectorAll(".topic-row").forEach((el) => {
    el.addEventListener("click", () =>
      startReviewSession(todaysReviewBatch(el.dataset.topic)),
    );
  });

  if (upcoming) startReviewCountdown(upcoming.at);
}
