/* ============================================================
   TAB: THỐNG KÊ (stats.js) — chuỗi ngày, độ chính xác, biểu đồ 7 ngày, độ bền ghi nhớ
   Depends on: core/*, services/*, algorithms/*, core/app.js (mainEl)
   ============================================================ */
let expandedMemoryLevel = null; // cấp độ đang mở danh sách từ (bấm cột biểu đồ), reset khi đổi tab

/* Biểu đồ cột "Độ bền ghi nhớ" (Stability của FSRS-6), từ CHƯA BIẾT GÌ đến THÔNG
   THẠO — dữ liệu lấy thẳng từ memoryLevel() (algorithms/fsrs.js), không cần đếm/lưu
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

function renderStats() {
  pageTitle.textContent = "Thống kê";
  pageSub.textContent = "Kết quả học tập của bạn";

  const totalLearned = ALL_CARDS.filter((c) => !isNewCard(c)).length;
  const cats = {
    new: 0,
    learning: 0,
    strong: 0,
    mastered: 0,
    weak: 0,
    leech: 0,
  };
  ALL_CARDS.forEach((c) => cats[masteryTag(c)]++);
  const streak = computeStreak();

  const ratingTotals = { again: 0, hard: 0, good: 0, easy: 0 };
  Object.values(ratingLog).forEach((d) => {
    Object.keys(ratingTotals).forEach((k) => (ratingTotals[k] += d[k] || 0));
  });
  const allRatingsTotal = Object.values(ratingTotals).reduce(
    (a, b) => a + b,
    0,
  );
  const retention =
    allRatingsTotal > 0
      ? Math.round(
          ((allRatingsTotal - ratingTotals.again) / allRatingsTotal) * 100,
        )
      : 0;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: todayStr(d),
      label: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()],
    });
  }
  const maxVal = Math.max(1, ...days.map((d) => reviewLog[d.key] || 0));
  const bars = days
    .map((d) => {
      const v = reviewLog[d.key] || 0;
      const h = Math.max(3, Math.round((v / maxVal) * 82));
      return `<div class="bar-col"><div class="bar" style="height:${h}px;"></div><div class="dlabel">${d.label}</div></div>`;
    })
    .join("");

  const RATING_LABEL = { again: "Lại", hard: "Khó", good: "Tốt", easy: "Dễ" };
  const RATING_COLOR = {
    again: "var(--danger)",
    hard: "var(--accent)",
    good: "var(--success)",
    easy: "var(--sky)",
  };
  const ratingRows = Object.keys(RATING_LABEL)
    .map((r) => {
      const pct =
        allRatingsTotal > 0
          ? Math.round((ratingTotals[r] / allRatingsTotal) * 100)
          : 0;
      return `<div class="skill-row"><div class="sk-name">${RATING_LABEL[r]}</div><div class="sk-track progress-track"><div class="progress-fill" style="width:${pct}%; background:${RATING_COLOR[r]};"></div></div><div class="sk-pct">${allRatingsTotal > 0 ? pct + "%" : "—"}</div></div>`;
    })
    .join("");

  const masteryRows = TOPICS.map((t) => {
    const m = t.cardObjs.filter((c) => masteryTag(c) === "mastered").length;
    const pct = Math.round((m / t.cardObjs.length) * 100);
    return `<div class="m-row"><div class="m-name">${t.icon} ${t.name}</div><div class="m-track progress-track"><div class="progress-fill" style="width:${pct}%; background:${t.color};"></div></div><div class="m-pct">${pct}%</div></div>`;
  }).join("");

  const studyMinutesToday = Math.round((studyTimeLog[todayStr()] || 0) / 60);

  mainEl.innerHTML = `
    <div class="stat-cards">
      <div class="stat-card"><div class="num">${streak}</div><div class="lbl">Ngày liên tiếp 🔥</div></div>
      <div class="stat-card"><div class="num">${retention > 0 ? retention + "%" : "—"}</div><div class="lbl">Tỉ lệ nhớ đúng</div></div>
      <div class="stat-card"><div class="num">${totalLearned}</div><div class="lbl">Từ đã học</div></div>
      <div class="stat-card"><div class="num">${cats.mastered}</div><div class="lbl">Từ đã thuộc</div></div>
      <div class="stat-card stat-card-wide"><div class="num">${studyMinutesToday} phút</div><div class="lbl">Thời gian học hôm nay</div></div>
    </div>

    <div class="section-label">Phân loại từ vựng</div>
    <div class="mastery-grid">
      <div class="mastery-pill"><div class="mp-num" style="color:${TAG_META.new.color};">${cats.new}</div><div class="mp-lbl">Mới</div></div>
      <div class="mastery-pill"><div class="mp-num" style="color:${TAG_META.learning.color};">${cats.learning}</div><div class="mp-lbl">Đang học</div></div>
      <div class="mastery-pill"><div class="mp-num" style="color:${TAG_META.strong.color};">${cats.strong}</div><div class="mp-lbl">Khá tốt</div></div>
      <div class="mastery-pill"><div class="mp-num" style="color:${TAG_META.mastered.color};">${cats.mastered}</div><div class="mp-lbl">Đã thuộc</div></div>
      <div class="mastery-pill"><div class="mp-num" style="color:${TAG_META.weak.color};">${cats.weak}</div><div class="mp-lbl">Yếu</div></div>
      <div class="mastery-pill"><div class="mp-num" style="color:${TAG_META.leech.bg};">${cats.leech}</div><div class="mp-lbl">Leech</div></div>
    </div>

    ${renderMasteryBarChart()}

    <div class="section-label">7 ngày gần nhất</div>
    <div class="bar-chart">${bars}</div>

    <div class="section-label">Phân bố đánh giá</div>
    <div class="settings-group" style="padding:2px 14px;">${ratingRows}</div>

    <div class="section-label">Mức độ thuộc theo chủ đề</div>
    <div class="settings-group mastery-list">${masteryRows}</div>
  `;

  mainEl.querySelectorAll(".bar-col[data-level]").forEach((col) => {
    col.addEventListener("click", () => toggleMemoryLevelList(col.dataset.level));
  });
  if (expandedMemoryLevel) openMemoryLevelList(expandedMemoryLevel);
}
