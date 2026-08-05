/* ============================================================
   TAB: PROGRESS — thống kê chuỗi ngày, độ chính xác, biểu đồ 7 ngày
   Depends on: core/*, services/*, algorithms/*, core/app.js (mainEl)
   ============================================================ */
function renderProgress() {
  pageTitle.textContent = "Tiến độ";
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

  mainEl.innerHTML = `
    <div class="stat-cards">
      <div class="stat-card"><div class="num">${streak}</div><div class="lbl">Ngày liên tiếp 🔥</div></div>
      <div class="stat-card"><div class="num">${retention > 0 ? retention + "%" : "—"}</div><div class="lbl">Tỉ lệ nhớ đúng</div></div>
      <div class="stat-card"><div class="num">${totalLearned}</div><div class="lbl">Từ đã học</div></div>
      <div class="stat-card"><div class="num">${cats.mastered}</div><div class="lbl">Từ đã thuộc</div></div>
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

    <div class="section-label">7 ngày gần nhất</div>
    <div class="bar-chart">${bars}</div>

    <div class="section-label">Phân bố đánh giá</div>
    <div class="settings-group" style="padding:2px 14px;">${ratingRows}</div>

    <div class="section-label">Mức độ thuộc theo chủ đề</div>
    <div class="settings-group mastery-list">${masteryRows}</div>
  `;
}
