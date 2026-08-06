/* ============================================================
   TAB: REVIEW — 2 thẻ "Hôm nay" song song: Từ mới (học) và Cần ôn (FSRS quyết định),
   mỗi thẻ có số liệu + nút hành động riêng, cùng mở chung 1 overlay Flashcard
   (study-overlay.js) — nơi FSRS (algorithms/fsrs.js) thực sự chấm điểm & lên lịch.
   Retention/độ nhớ CỐ TÌNH không đặt ở đây — số liệu đó thuộc tab Thống kê.
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startReviewSession)
   ============================================================ */
function renderReviewTab() {
  pageTitle.textContent = "Ôn tập";
  pageSub.textContent = "Học từ mới & ôn tập đúng lúc FSRS yêu cầu";

  const due = dueCards();
  const newLeft = Math.max(
    0,
    settings.newWordsPerDay - (newWordsLog[todayStr()] || 0),
  );

  mainEl.innerHTML = `
    <div class="section-label" style="text-align:center;">Hôm nay</div>
    <div class="today-cards">
      <div class="today-card">
        <div class="num">${newLeft}</div>
        <div class="lbl">Từ mới</div>
        <button class="btn-primary" id="goLearnBtn">Học từ mới</button>
      </div>
      <div class="today-card">
        <div class="num" style="color:${due.length > 0 ? "var(--accent)" : "var(--ink)"};">${due.length}</div>
        <div class="lbl">Cần ôn</div>
        <button class="btn-primary" id="startReviewBtn" ${due.length === 0 ? "disabled" : ""}>Ôn tập</button>
      </div>
    </div>
  `;

  document
    .getElementById("goLearnBtn")
    .addEventListener("click", () => switchTab("topics"));
  const startBtn = document.getElementById("startReviewBtn");
  if (!startBtn.disabled)
    startBtn.addEventListener("click", () =>
      startReviewSession(todaysReviewBatch()),
    );
}
