/* ============================================================
   TAB: REVIEW — tối giản: 2 thẻ cùng hàng (streak + số từ đến hạn) rồi 1 nút "Ôn
   tập" cuối trang. Bấm vào thẻ "Từ đến hạn" chuyển sang 1 trang riêng trong cùng
   tab (renderReviewTab tự chuyển giữa 2 chế độ qua biến module reviewShowDueList)
   liệt kê từng từ đang chờ ôn, có nút quay lại.
   Icon dùng SVG outline kiểu Lucide (inline, không thư viện ngoài — app không build/npm).
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startReviewSession)
   ============================================================ */
const REVIEW_ICONS = {
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
};

let reviewShowDueList = false; // true = đang ở "trang" danh sách từ đến hạn thay vì bảng điều khiển chính

function renderReviewTab() {
  pageTitle.textContent = "Ôn tập";
  pageSub.textContent = "Ôn đúng lúc, nhớ lâu hơn";

  const due = todaysReviewBatch(); // đã sắp theo mức độ quá hạn, KHÔNG giới hạn số lượng
  if (due.length === 0) reviewShowDueList = false; // hết từ đến hạn thì không còn gì để xem ở trang danh sách

  const ctaHtml = `
    <button class="btn-primary review-cta" id="startReviewBtn" ${due.length === 0 ? "disabled" : ""}>
      ${REVIEW_ICONS.play} ${due.length > 0 ? "Ôn tập" : "Không có từ cần ôn"}
    </button>`;

  if (reviewShowDueList) {
    const rowsHtml = due
      .map((c) => {
        const t = topicById(c.topicId);
        return `
        <div class="due-row">
          <div class="dr-dot" style="background:${t.color};"></div>
          <div class="dr-en">${c.en}</div>
          <div class="dr-topic">${t.icon} ${t.name}</div>
        </div>`;
      })
      .join("");

    mainEl.innerHTML = `
      <div class="due-page-head">
        <button class="back-btn" id="backBtn" aria-label="Quay lại">${REVIEW_ICONS.arrowLeft}</button>
        <div class="due-page-title">Từ đến hạn ôn tập <span class="due-page-count">${due.length}</span></div>
      </div>
      <div class="due-list">${rowsHtml}</div>
      ${ctaHtml}
    `;
    document.getElementById("backBtn").addEventListener("click", () => {
      reviewShowDueList = false;
      renderReviewTab();
    });
  } else {
    const streak = computeStreak();
    mainEl.innerHTML = `
      <div class="review-stats-grid">
        <div class="review-tile">
          <div class="rt-icon rt-icon-flame">🔥</div>
          <div class="rt-num">${streak}</div>
          <div class="rt-lbl">Ngày liên tục</div>
        </div>
        <div class="review-tile review-tile-clickable" id="dueTile">
          <div class="rt-hint">${REVIEW_ICONS.chevronRight}</div>
          <div class="rt-icon">${REVIEW_ICONS.book}</div>
          <div class="rt-num">${due.length}</div>
          <div class="rt-lbl">Từ đến hạn</div>
        </div>
      </div>
      ${ctaHtml}
    `;
    if (due.length > 0) {
      document.getElementById("dueTile").addEventListener("click", () => {
        reviewShowDueList = true;
        renderReviewTab();
      });
    }
  }

  if (due.length > 0) {
    document
      .getElementById("startReviewBtn")
      .addEventListener("click", () => startReviewSession(due));
  }
}
