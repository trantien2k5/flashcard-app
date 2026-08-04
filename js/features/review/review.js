/* ============================================================
   TAB: REVIEW — tổng quan hôm nay, CTA ôn tập theo trạng thái, độ bền ghi nhớ,
   luyện từ yếu. Thứ tự cố ý: Tổng quan → CTA → trạng thái/lần ôn tiếp theo →
   Độ bền ghi nhớ → Luyện tập thêm. Thống kê sâu (retention%, lịch sử 7/30 ngày,
   accuracy...) KHÔNG đặt ở đây — những thứ đó thuộc tab Tiến độ. Tab này chỉ giữ
   dữ liệu có tác dụng thúc đẩy hành động ôn ngay.
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/studyOverlay.js (startReviewSession)
   ============================================================ */
let reviewCountdownTimer = null;
let expandedMemoryLevel = null; // cấp độ đang mở danh sách từ (bấm cột biểu đồ), reset khi đổi tab

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

/* Countdown chỉ đáng chú ý khi còn dưới 24h (vd "còn 2 giờ nữa"). Xa hơn thì hiện
   nhãn ngày tương đối tĩnh ("ngày mai" / "trong N ngày") — không cần đếm từng giây,
   người dùng không cần biết chính xác "1 ngày 0 giờ". */
function upcomingReviewLabel(at) {
  const now = new Date();
  const ms = at - now;
  if (ms < 24 * 3600 * 1000) return { live: true };
  const dayDiff = Math.round(
    (new Date(todayStr(at) + "T00:00:00") -
      new Date(todayStr(now) + "T00:00:00")) /
      86400000,
  );
  return { live: false, text: dayDiff <= 1 ? "ngày mai" : `trong ${dayDiff} ngày` };
}

/* Biểu đồ cột "Độ bền ghi nhớ" (Stability của FSRS-6), từ CHƯA BIẾT GÌ đến THÔNG
   THẠO — dữ liệu lấy thẳng từ memoryLevel() (algorithms/srs.js), không cần đếm/lưu
   thống kê riêng. Bấm 1 cột để xem nhanh danh sách từ thuộc cấp đó. */
function renderMasteryBarChart() {
  const cats = { fresh: 0, familiar: 0, remembered: 0, solid: 0, fluent: 0, leech: 0 };
  let totalTouched = 0;
  ALL_CARDS.forEach((c) => {
    const level = memoryLevel(c);
    if (!level) return; // state "new" — chưa từng tiếp xúc, không tính vào biểu đồ
    cats[level]++;
    totalTouched++;
  });
  if (totalTouched === 0) return ""; // chưa học/ôn từ nào thì chưa có gì để vẽ

  const maxCat = Math.max(1, ...MEMORY_LEVEL_ORDER.map((k) => cats[k]));
  const cols = MEMORY_LEVEL_ORDER.map((k) => {
    const v = cats[k];
    const h = Math.max(4, Math.round((v / maxCat) * 82));
    const meta = MEMORY_LEVEL_META[k];
    return `
      <div class="bar-col ${expandedMemoryLevel === k ? "active" : ""}" data-level="${k}" title="${meta.desc}">
        <div class="bar-value">${v}</div>
        <div class="bar" style="height:${h}px; background:${meta.color};"></div>
        <div class="dlabel">${meta.label}</div>
      </div>`;
  }).join("");

  return `
    <div class="card-divider"></div>
    <div class="section-label-row" style="margin:22px 4px 10px;">
      <div class="section-label">Độ bền ghi nhớ</div>
      <div class="sl-total">${totalTouched} từ</div>
    </div>
    <div class="bar-chart mastery-bar-chart">${cols}</div>
    <div class="level-word-list" id="levelWordList"></div>
  `;
}

function openMemoryLevelList(level) {
  expandedMemoryLevel = level;
  const listEl = document.getElementById("levelWordList");
  if (!listEl) return;
  mainEl
    .querySelectorAll(".bar-col")
    .forEach((c) => c.classList.toggle("active", c.dataset.level === level));
  const words = ALL_CARDS.filter((c) => memoryLevel(c) === level);
  const shown = words.slice(0, 40);
  listEl.innerHTML = words.length
    ? shown
        .map(
          (c) =>
            `<div class="lw-item"><span class="lw-en">${c.en}</span><span class="lw-vi">${c.vi}</span></div>`,
        )
        .join("") +
      (words.length > shown.length
        ? `<div class="lw-more">+ ${words.length - shown.length} từ khác — xem đầy đủ ở Thư viện</div>`
        : "")
    : `<div class="lw-empty">Chưa có từ nào ở cấp này.</div>`;
  listEl.style.display = "block";
}
function closeMemoryLevelList() {
  expandedMemoryLevel = null;
  const listEl = document.getElementById("levelWordList");
  if (listEl) listEl.style.display = "none";
  mainEl.querySelectorAll(".bar-col").forEach((c) => c.classList.remove("active"));
}
function toggleMemoryLevelList(level) {
  if (expandedMemoryLevel === level) closeMemoryLevelList();
  else openMemoryLevelList(level);
}

function renderReviewTab() {
  stopReviewCountdown();
  pageTitle.textContent = "Ôn tập";

  const due = dueCards();
  const remaining = reviewsRemainingToday();
  const capped = remaining < due.length;
  const batchSize = Math.min(due.length, remaining);
  const hasNewCards = newCards().length > 0;
  const upcoming = due.length === 0 ? nextUpcomingDue() : null;
  const weakCount = ALL_CARDS.filter((c) => masteryTag(c) === "weak").length;
  const reviewedToday = reviewsDoneLog[todayStr()] || 0;

  pageSub.textContent =
    due.length > 0
      ? "Ôn lại từ đến hạn bằng active recall"
      : "Không có từ đến hạn — học thêm từ mới nhé";

  const overviewHtml = `
    <div class="review-overview">
      <div class="ov-stat"><div class="ov-num">${due.length}</div><div class="ov-lbl">Đến hạn</div></div>
      <div class="ov-stat"><div class="ov-num" style="color:${weakCount > 0 ? "var(--danger)" : "var(--ink)"};">${weakCount}</div><div class="ov-lbl">Từ yếu</div></div>
      <div class="ov-stat"><div class="ov-num" style="color:var(--success);">${reviewedToday}</div><div class="ov-lbl">Đã ôn</div></div>
    </div>
  `;

  let ctaHtml;
  if (due.length > 0) {
    ctaHtml =
      remaining > 0
        ? `
      <button class="btn-primary" id="startReviewBtn">Ôn ${batchSize} từ ngay</button>
      ${capped ? `<div style="font-size:11.5px; color:var(--ink-faint); text-align:center; margin-top:8px;">Đã đạt giới hạn ${settings.dailyGoal} thẻ/ngày — còn ${due.length - remaining} từ để ngày mai</div>` : ""}
    `
        : `<div class="empty-state" style="padding:8px 0 0;"><span class="emoji">🎉</span>Đã hoàn thành giới hạn ôn tập hôm nay!</div>`;
  } else if (!upcoming && reviewedToday === 0) {
    // Chưa từng ôn từ nào (thẻ mới toanh, chưa có gì để "hoàn thành") — không dùng
    // chữ "Đã hoàn thành" ở đây vì gây hiểu lầm, chỉ mời học từ mới.
    ctaHtml = hasNewCards
      ? `<button class="btn-primary" id="goLearnBtn">Học từ mới</button>`
      : `<div class="empty-state" style="padding:8px 0 0;"><span class="emoji">📭</span>Chưa có từ nào để ôn tập.</div>`;
  } else {
    const nextLabel = upcoming ? upcomingReviewLabel(upcoming.at) : null;
    ctaHtml = `
      <div class="review-status">
        <div class="rs-check">✓ Đã hoàn thành ôn tập hôm nay</div>
        ${
          nextLabel
            ? nextLabel.live
              ? `<div class="rs-next">Lần ôn tiếp theo: còn <b id="reviewCountdown">--:--</b></div>`
              : `<div class="rs-next">Lần ôn tiếp theo: <b>${nextLabel.text}</b></div>`
            : ""
        }
      </div>
      ${hasNewCards ? `<button class="btn-primary" id="goLearnBtn" style="margin-top:12px;">Học từ mới</button>` : ""}
    `;
  }

  const weakActionHtml =
    weakCount > 0
      ? `
    <div class="section-label">Luyện tập thêm</div>
    <div class="quick-actions">
      <div class="action-row" id="goWeak">
        <div class="a-icon" style="background:var(--danger-soft);">⚠️</div>
        <div class="a-info"><div class="a-title">Luyện từ yếu</div><div class="a-sub">${weakCount} từ hay quên / khó nhớ cần củng cố</div></div>
        <div class="a-chev">›</div>
      </div>
    </div>
  `
      : "";

  mainEl.innerHTML = `
    <div class="card-box">
      ${overviewHtml}
      <div class="card-divider"></div>
      <div style="text-align:center; padding-top:14px;">${ctaHtml}</div>
      ${renderMasteryBarChart()}
    </div>
    ${weakActionHtml}
  `;

  const startBtn = document.getElementById("startReviewBtn");
  if (startBtn)
    startBtn.addEventListener("click", () =>
      startReviewSession(todaysReviewBatch()),
    );
  const goLearnBtn = document.getElementById("goLearnBtn");
  if (goLearnBtn)
    goLearnBtn.addEventListener("click", () => switchTab("learn"));
  const goWeakBtn = document.getElementById("goWeak");
  if (goWeakBtn)
    goWeakBtn.addEventListener("click", () =>
      startReviewSession(ALL_CARDS.filter((c) => masteryTag(c) === "weak")),
    );

  mainEl.querySelectorAll(".bar-col[data-level]").forEach((col) => {
    col.addEventListener("click", () => toggleMemoryLevelList(col.dataset.level));
  });
  if (expandedMemoryLevel) openMemoryLevelList(expandedMemoryLevel);

  if (upcoming) {
    const label = upcomingReviewLabel(upcoming.at);
    if (label.live) startReviewCountdown(upcoming.at);
  }
}
