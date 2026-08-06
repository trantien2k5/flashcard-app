/* ============================================================
   TAB: REVIEW — TẠM THỜI rút gọn tối đa theo yêu cầu: chỉ còn khối thông tin
   (số từ đang học, kèm số từ đến hạn nếu hôm nay có) + 1 nút hành động duy nhất
   (Ôn từ đến hạn nếu có, ngược lại điều hướng sang tab Chủ đề để học từ mới).
   Các phần trước đây (vòng tiến độ ngày, chuỗi tuần, gợi ý, biểu đồ dự báo 7 ngày,
   Việc cần làm...) đã bỏ — xem lịch sử git nếu cần khôi phục sau này.
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startReviewSession)
   ============================================================ */
function renderReviewTab() {
  pageTitle.textContent = "Ôn tập";

  const due = dueCards();
  const remaining = reviewsRemainingToday();
  const batchSize = Math.min(due.length, remaining);
  const canReview = due.length > 0 && remaining > 0;
  const learningCount = ALL_CARDS.filter(
    (c) => getCardState(c.id).state === "learning",
  ).length;

  pageSub.textContent = canReview
    ? "Ôn lại từ đến hạn bằng active recall"
    : "Không có từ đến hạn — học thêm từ mới nhé";

  const statsHtml = `
    <div class="review-overview">
      <div class="ov-stat"><div class="ov-num">${learningCount}</div><div class="ov-lbl">Đang học</div></div>
      ${
        due.length > 0
          ? `<div class="ov-stat"><div class="ov-num" style="color:var(--accent);">${due.length}</div><div class="ov-lbl">Đến hạn</div></div>`
          : ""
      }
    </div>
  `;

  const ctaHtml = canReview
    ? `<button class="btn-primary" id="startReviewBtn">Ôn ${batchSize} từ đến hạn</button>`
    : `<button class="btn-primary" id="goLearnBtn">Học từ mới</button>`;

  mainEl.innerHTML = `
    <div class="card-box">
      ${statsHtml}
      <div class="card-divider"></div>
      <div style="text-align:center; padding-top:14px;">${ctaHtml}</div>
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
