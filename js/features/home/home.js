/* ============================================================
   TAB: HOME — vòng tiến độ ngày, chuỗi tuần, gợi ý, việc cần làm
   Depends on: core/*, services/*, algorithms/*, core/app.js (mainEl, pageTitle...), components/studyOverlay.js (startReviewSession)
   ============================================================ */
function renderHome() {
  pageTitle.textContent = "Trang chủ";
  pageSub.textContent = "Chào bạn quay lại 👋";

  const due = dueCards().length;
  const remaining = reviewsRemainingToday();
  const hasNewCards = newCards().length > 0;
  const newLeft = Math.max(
    0,
    settings.newWordsPerDay - (newWordsLog[todayStr()] || 0),
  );
  const newDoneToday = newWordsLog[todayStr()] || 0;
  const reviewDoneToday = reviewsDoneLog[todayStr()] || 0;
  const weak = ALL_CARDS.filter((c) => masteryTag(c) === "weak");
  const goalPct = clamp(
    Math.round((reviewDoneToday / Math.max(1, settings.dailyGoal)) * 100),
    0,
    100,
  );
  const newPct = clamp(
    Math.round((newDoneToday / Math.max(1, settings.newWordsPerDay)) * 100),
    0,
    100,
  );

  const ring = (pct, color, label) => {
    const r = 24,
      c = 2 * Math.PI * r,
      off = c - (c * pct) / 100;
    return `<div class="ring-wrap">
      <svg viewBox="0 0 60 60"><circle class="ring-track" cx="30" cy="30" r="${r}"/><circle class="ring-fill" cx="30" cy="30" r="${r}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
      <div class="r-num">${label}</div>
    </div>`;
  };

  // weekly strip (last 7 days incl today)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const weekly = days
    .map((d) => {
      const key = todayStr(d);
      const isToday = key === todayStr();
      const done = !!reviewLog[key];
      return `<div class="wd ${done ? "done" : ""} ${isToday ? "today" : ""}"><div class="dot">${done ? "✓" : ""}</div>${["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()]}</div>`;
    })
    .join("");

  let insight = "";
  if (weak.length > 0) {
    insight = `<div class="insight-box">💡 Bạn có <b>${weak.length} từ đang yếu</b> (hay bị "Lại"/dễ quên) — nên ôn lại sớm trước khi quên hẳn.</div>`;
  }

  mainEl.innerHTML = `
    <div class="goal-rings">
      <div class="ring-card">${ring(goalPct, "var(--accent)", `${reviewDoneToday}/${settings.dailyGoal}`)}<div class="r-lbl">Ôn tập hôm nay</div></div>
      <div class="ring-card">${ring(newPct, "var(--success)", `${newDoneToday}/${settings.newWordsPerDay}`)}<div class="r-lbl">Từ mới hôm nay</div></div>
    </div>
    <div class="weekly-strip">${weekly}</div>
    ${insight}
    <div class="section-label">Việc cần làm</div>
    <div class="quick-actions">
      <div class="action-row" id="goReview">
        <div class="a-icon" style="background:var(--accent-soft);">🔁</div>
        <div class="a-info"><div class="a-title">Ôn tập ngay</div><div class="a-sub">${due > 0 ? (remaining > 0 ? `${due} từ đến hạn` : "Đã đạt giới hạn ôn tập hôm nay 🎉") : hasNewCards ? "Hết từ cần ôn — học thêm từ mới nhé" : "Đã ôn hết, hẹn gặp lại ngày mai!"}</div></div>
        <div class="a-chev">›</div>
      </div>
      <div class="action-row" id="goLearn">
        <div class="a-icon" style="background:var(--success-soft);">✨</div>
        <div class="a-info"><div class="a-title">Học từ mới</div><div class="a-sub">${newLeft > 0 ? `Còn ${newLeft} từ trong mục tiêu hôm nay` : "Đã đạt mục tiêu từ mới hôm nay"}</div></div>
        <div class="a-chev">›</div>
      </div>
      ${
        weak.length > 0
          ? `
      <div class="action-row" id="goWeak">
        <div class="a-icon" style="background:var(--danger-soft);">⚠️</div>
        <div class="a-info"><div class="a-title">Luyện từ yếu</div><div class="a-sub">${weak.length} từ cần chú ý</div></div>
        <div class="a-chev">›</div>
      </div>`
          : ""
      }
    </div>
  `;
  document.getElementById("goReview").addEventListener("click", () => {
    if (due > 0 && remaining > 0) startReviewSession(todaysReviewBatch());
    else if (due === 0 && hasNewCards) switchTab("learn");
    else switchTab("review");
  });
  document
    .getElementById("goLearn")
    .addEventListener("click", () => switchTab("learn"));
  const goWeak = document.getElementById("goWeak");
  if (goWeak) goWeak.addEventListener("click", () => startReviewSession(weak)); // luyện tập chủ động, không tính vào giới hạn ôn/ngày
}
