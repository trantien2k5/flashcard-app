/* ============================================================
   TAB: REVIEW — tối giản theo yêu cầu: chỉ 2 thẻ (streak + số từ đến hạn ôn tập,
   bấm vào thẻ thứ 2 để xem danh sách từ nào đang đến hạn) và 1 nút "Ôn tập" cuối
   trang. Không còn banner/mẹo/4-số-liệu/vòng tiến độ như bản trước.
   Icon dùng SVG outline kiểu Lucide (inline, không thư viện ngoài — app không build/npm).
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startReviewSession)
   ============================================================ */
const REVIEW_ICONS = {
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
};

let reviewDueListOpen = false; // trạng thái mở/đóng danh sách từ đến hạn trong thẻ "Cần ôn", giữ nguyên khi renderReviewTab() re-render do bấm thẻ

function renderReviewTab() {
  pageTitle.textContent = "Ôn tập";
  pageSub.textContent = "Ôn đúng lúc, nhớ lâu hơn";

  const due = todaysReviewBatch(); // đã sắp theo mức độ quá hạn, KHÔNG giới hạn số lượng
  const streak = computeStreak();

  const dueListHtml = due.length
    ? `<div class="due-list">
        ${due
          .map((c) => {
            const t = topicById(c.topicId);
            return `
          <div class="due-row">
            <div class="dr-dot" style="background:${t.color};"></div>
            <div class="dr-en">${c.en}</div>
            <div class="dr-topic">${t.icon} ${t.name}</div>
          </div>`;
          })
          .join("")}
      </div>`
    : "";

  mainEl.innerHTML = `
    <div class="card-box streak-card">
      <div class="streak-flame">🔥</div>
      <div class="streak-info">
        <div class="streak-num">${streak}</div>
        <div class="streak-lbl">${streak > 0 ? "ngày ôn tập liên tục" : "Ôn hôm nay để bắt đầu chuỗi mới"}</div>
      </div>
    </div>

    <div class="card-box due-card">
      <div class="due-card-head" id="dueCardHead">
        <div class="due-icon">${REVIEW_ICONS.book}</div>
        <div class="due-info">
          <div class="due-num">${due.length}</div>
          <div class="due-lbl">Từ đến hạn ôn tập</div>
        </div>
        ${due.length > 0 ? `<div class="due-chevron ${reviewDueListOpen ? "open" : ""}">${REVIEW_ICONS.chevron}</div>` : ""}
      </div>
      ${reviewDueListOpen ? dueListHtml : ""}
    </div>

    <button class="btn-primary review-cta" id="startReviewBtn" ${due.length === 0 ? "disabled" : ""}>
      ${REVIEW_ICONS.play} ${due.length > 0 ? "Ôn tập" : "Không có từ cần ôn"}
    </button>
  `;

  if (due.length > 0) {
    document.getElementById("dueCardHead").addEventListener("click", () => {
      reviewDueListOpen = !reviewDueListOpen;
      renderReviewTab();
    });
    document
      .getElementById("startReviewBtn")
      .addEventListener("click", () => startReviewSession(due));
  }
}
