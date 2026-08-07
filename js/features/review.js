/* ============================================================
   TAB: REVIEW — bố cục theo bản thiết kế: banner mở đầu, 4 thẻ số liệu "Hôm nay",
   thẻ tiến độ ôn tập, mẹo học tập, và nút hành động lớn ở cuối. CHỈ dùng số liệu
   THẬT có trong app (due/overdue/weak/reviewed/studyTimeLog...) — không có điểm
   thưởng/XP/streak leaderboard kiểu game vì app chưa theo dõi những thứ đó.
   Icon dùng SVG outline kiểu Lucide (inline, không thư viện ngoài — app không build/npm).
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startReviewSession)
   ============================================================ */
const REVIEW_ICONS = {
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  timer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>`,
  lightbulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
};

const REVIEW_TIPS = [
  "Ôn tập vào đúng lúc khó nhớ nhất sẽ giúp bạn ghi nhớ lâu hơn — đó là lý do FSRS luôn tính lại lịch ôn sau mỗi lần bạn trả lời.",
  "Đặt câu với từ mới giúp não ghi nhớ sâu hơn là chỉ học thuộc nghĩa.",
  "Ôn đều đặn mỗi ngày hiệu quả hơn nhồi nhét một lần thật nhiều.",
  "Đừng ngại bấm \"Lại\" khi quên — hệ thống sẽ tự xếp lịch ôn lại đúng lúc bạn cần, quên là một phần bình thường của việc học.",
  "Phát âm to từ vựng khi ôn giúp tăng khả năng ghi nhớ so với chỉ đọc thầm.",
];

/* Ước tính thời gian ôn hôm nay từ NHỊP ĐỘ THẬT của chính bạn (studyTimeLog/reviewLog
   cộng dồn từ trước tới nay) — chỉ dùng hằng số mặc định (~15s/thẻ) khi chưa có lịch sử
   nào để tính, không bịa số liệu cá nhân hoá khi không có dữ liệu. */
function estimateReviewMinutes(count) {
  if (count <= 0) return 0;
  const totalSeconds = Object.values(studyTimeLog).reduce((a, b) => a + b, 0);
  const totalReps = Object.values(reviewLog).reduce((a, b) => a + b, 0);
  const avgSecPerCard = totalReps > 0 ? totalSeconds / totalReps : 15;
  return Math.max(1, Math.round((count * avgSecPerCard) / 60));
}

function renderReviewTab() {
  pageTitle.textContent = "Ôn tập";
  pageSub.textContent = "Ôn đúng lúc – nhớ lâu hơn 🎯";

  const due = dueCards();
  const overdueCount = overdueCards().length;
  const weakCount = ALL_CARDS.filter((c) => masteryTag(c) === "weak").length;
  const estMinutes = estimateReviewMinutes(due.length);
  const reviewedToday = reviewsDoneLog[todayStr()] || 0;
  const totalToday = reviewedToday + due.length;
  const pct = totalToday === 0 ? 100 : Math.round((reviewedToday / totalToday) * 100);
  const canReview = due.length > 0;

  const heroSub =
    due.length > 0
      ? `Bạn có <b>${due.length} từ</b> đang chờ ôn — ôn ngay để nhớ lâu hơn nhé.`
      : "Không có từ nào đến hạn hôm nay — học thêm từ mới cũng là một cách ôn luyện tốt!";

  const heroHtml = `
    <div class="review-hero">
      <div class="rh-title">${due.length > 0 ? "Sẵn sàng chinh phục hôm nay! 💪" : "Bạn đã bắt kịp lịch ôn rồi! 🎉"}</div>
      <div class="rh-sub">${heroSub}</div>
    </div>
  `;

  const statCards = [
    { icon: REVIEW_ICONS.book, num: due.length, lbl: "Từ cần ôn", bg: "var(--accent-soft)", fg: "var(--accent)" },
    { icon: REVIEW_ICONS.clock, num: overdueCount, lbl: "Từ quá hạn", bg: "var(--danger-soft)", fg: "var(--danger)" },
    { icon: REVIEW_ICONS.alertTriangle, num: weakCount, lbl: "Từ yếu", bg: "var(--warning-soft)", fg: "var(--warning)" },
    { icon: REVIEW_ICONS.timer, num: `~${estMinutes}p`, lbl: "Thời gian ước tính", bg: "var(--sky-soft)", fg: "var(--sky)" },
  ]
    .map(
      (s) => `
    <div class="today-stat-card" style="background:${s.bg};">
      <div class="tsc-icon" style="color:${s.fg};">${s.icon}</div>
      <div class="tsc-num">${s.num}</div>
      <div class="tsc-lbl">${s.lbl}</div>
    </div>`,
    )
    .join("");

  const progressHint =
    due.length === 0
      ? reviewedToday > 0
        ? "Đã hoàn thành ôn tập hôm nay! 🎉"
        : "Chưa có từ nào cần ôn hôm nay."
      : `Cố lên! Chỉ còn ${due.length} từ nữa thôi!`;

  const tip = REVIEW_TIPS[new Date().getDate() % REVIEW_TIPS.length];

  const ctaHtml = canReview
    ? `<button class="btn-primary review-cta" id="startReviewBtn">
        <span class="cta-main">${REVIEW_ICONS.play} Bắt đầu ôn tập</span>
        <span class="cta-sub">Học ngay ${due.length} từ cần ôn</span>
      </button>`
    : `<button class="btn-primary review-cta" id="goLearnBtn">
        <span class="cta-main">${REVIEW_ICONS.play} Học từ mới</span>
        <span class="cta-sub">Không có từ cần ôn lúc này</span>
      </button>`;

  mainEl.innerHTML = `
    ${heroHtml}

    <div class="section-label">Hôm nay</div>
    <div class="today-stat-grid">${statCards}</div>

    <div class="card-box" style="margin-top:14px;">
      <div class="section-label" style="margin-top:0;">Tiến độ ôn tập hôm nay</div>
      <div class="review-progress-row">
        <div class="rp-main">
          <div class="rp-label">Đã ôn</div>
          <div class="rp-count">${reviewedToday} <span class="rp-total">/ ${totalToday}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:var(--accent);"></div></div>
          <div class="rp-hint">${progressHint}</div>
        </div>
        <div class="progress-ring" style="background: conic-gradient(var(--accent) ${pct * 3.6}deg, var(--border) 0deg);">
          <div class="progress-ring-inner">${pct}%</div>
        </div>
      </div>
    </div>

    <div class="tip-banner"><span class="tb-icon">${REVIEW_ICONS.lightbulb}</span><span><b>Mẹo:</b> ${tip}</span></div>

    ${ctaHtml}
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
