/* ============================================================
   TAB: REVIEW — khối thẻ số liệu (stat-cards, dùng chung style với tab Thống kê)
   + 1 nút hành động duy nhất (Ôn từ đến hạn nếu có, ngược lại điều hướng sang tab
   Chủ đề để học từ mới). Retention/độ nhớ CỐ TÌNH không đặt ở đây — số liệu đó
   thuộc tab Thống kê (đã có sẵn, xem stats.js).
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startReviewSession)
   ============================================================ */
function renderReviewTab() {
  pageTitle.textContent = "Ôn tập";

  const due = dueCards();
  const remaining = reviewsRemainingToday();
  const batchSize = Math.min(due.length, remaining);
  const canReview = due.length > 0 && remaining > 0;

  const today = todayStr();
  const newDoneToday = newWordsLog[today] || 0;
  const reviewedToday = reviewsDoneLog[today] || 0;
  const totalDoneToday = newDoneToday + reviewedToday;
  const totalGoalToday = settings.newWordsPerDay + settings.dailyGoal;
  const studyMinutesToday = Math.round((studyTimeLog[today] || 0) / 60);

  pageSub.textContent = canReview
    ? "Ôn lại từ đến hạn bằng active recall"
    : "Không có từ đến hạn — học thêm từ mới nhé";

  const statsHtml = `
    <div class="stat-cards">
      <div class="stat-card">
        <div class="num">${due.length}</div>
        <div class="lbl">Đến hạn ôn</div>
      </div>
      <div class="stat-card">
        <div class="num">${newDoneToday}/${settings.newWordsPerDay}</div>
        <div class="lbl">Từ mới hôm nay</div>
      </div>
      <div class="stat-card">
        <div class="num">${totalDoneToday}/${totalGoalToday}</div>
        <div class="lbl">Đã hoàn thành hôm nay</div>
      </div>
      <div class="stat-card">
        <div class="num">🔥 ${computeStreak()}</div>
        <div class="lbl">Streak</div>
      </div>
      <div class="stat-card stat-card-wide">
        <div class="num">${studyMinutesToday} phút</div>
        <div class="lbl">Thời gian học hôm nay</div>
      </div>
    </div>
  `;

  const ctaHtml = canReview
    ? `<button class="btn-primary" id="startReviewBtn">Ôn ${batchSize} từ đến hạn</button>`
    : `<button class="btn-primary" id="goLearnBtn">Học từ mới</button>`;

  mainEl.innerHTML = `
    ${statsHtml}
    <div class="card-box" style="margin-top:14px; text-align:center;">
      ${ctaHtml}
    </div>
  `;

  const startBtn = document.getElementById("startReviewBtn");
  if (startBtn)
    startBtn.addEventListener("click", () =>
      startReviewSession(todaysReviewBatch()),
    );
  const goLearnBtn = document.getElementById("goLearnBtn");
  if (goLearnBtn)
    goLearnBtn.addEventListener("click", () => switchTab("topics"));
}
