/* ============================================================
   TAB: REVIEW — tổng quan từ đến hạn, bắt đầu phiên ôn tập
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/studyOverlay.js (startReviewSession)
   ============================================================ */
let reviewCountdownTimer = null;

function stopReviewCountdown() {
  if (reviewCountdownTimer) {
    clearInterval(reviewCountdownTimer);
    reviewCountdownTimer = null;
  }
}
/* Chọn đơn vị phù hợp theo độ lớn thay vì luôn quy hết ra giờ:mm:ss
   (ví dụ 4 ngày trước đây hiện "118:53:40" — khó đọc và trông như lỗi). */
function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d} ngày ${h} giờ`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

  let listHtml = "";
  if (due.length === 0) {
    listHtml = hasNewCards
      ? `<div class="empty-state"><span class="emoji">✨</span>Không có từ nào đến hạn ôn tập.<br>Hãy học thêm từ mới để mở rộng vốn từ nhé!</div>`
      : `<div class="empty-state"><span class="emoji">✅</span>Bạn đã ôn hết từ đến hạn hôm nay.<br>Quay lại vào ngày mai nhé!</div>`;
  }

  const topBox =
    due.length > 0
      ? `
      <div style="font-family:var(--font-display); font-size:44px; font-weight:600;">${due.length}</div>
      <div style="font-size:12.5px; color:var(--ink-soft); margin-top:2px;">từ cần ôn hôm nay</div>
      ${capped ? `<div style="font-size:11.5px; color:var(--accent-soft-ink); background:var(--accent-soft); border-radius:999px; padding:5px 12px; margin-top:10px; display:inline-block;">Đã đạt giới hạn ${settings.dailyGoal} thẻ/ngày — còn ${due.length - remaining} từ để ngày mai</div>` : ""}
      ${
        remaining > 0
          ? `<button class="btn-primary" id="startReviewBtn" style="margin-top:14px;">Ôn tập ngay${capped ? ` (${remaining} thẻ)` : ""}</button>`
          : `<div class="empty-state" style="padding:14px 0 0;"><span class="emoji">🎉</span>Đã hoàn thành giới hạn ôn tập hôm nay!</div>`
      }
    `
      : upcoming
        ? `
        <div style="font-size:12px; color:var(--ink-soft);">Từ tiếp theo đến hạn sau</div>
        <div id="reviewCountdown" class="review-countdown" style="color:var(--accent); margin-top:6px;">--:--</div>
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
  const goLearnBtn = document.getElementById("goLearnBtn");
  if (goLearnBtn)
    goLearnBtn.addEventListener("click", () => switchTab("learn"));

  if (upcoming) startReviewCountdown(upcoming.at);
}
