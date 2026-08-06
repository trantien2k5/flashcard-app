/* ============================================================
   TAB: REVIEW — gộp Trang chủ (vòng tiến độ ngày, chuỗi tuần, gợi ý) + Ôn tập
   (tổng quan hôm nay, CTA ôn tập theo trạng thái, dự báo từ sắp đến hạn, luyện từ yếu).
   Thứ tự cố ý: Vòng tiến độ ngày → chuỗi tuần → gợi ý → Tổng quan → CTA →
   trạng thái/lần ôn tiếp theo → Sắp đến hạn (7 ngày tới) → Việc cần làm. Thống kê sâu
   (retention%, lịch sử 7/30 ngày, accuracy, độ bền ghi nhớ theo cấp...) KHÔNG đặt ở
   đây — những thứ đó thuộc tab Tiến độ. Tab này chỉ giữ dữ liệu có tác dụng thúc đẩy
   hành động ôn ngay.
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startReviewSession)
   ============================================================ */
let reviewCountdownTimer = null;

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

/* Biểu đồ cột "Sắp đến hạn (7 ngày tới)" — dự báo số thẻ sẽ due mỗi ngày dựa trên
   st.due (state "review") / st.dueAt (state "relearning", luôn rơi vào hôm nay vì
   bước chờ tính bằng phút). Cột "Hôm nay" gộp cả phần đã quá hạn (due <= hôm nay),
   khớp với số liệu "Đến hạn" ở overview phía trên — các cột sau là khớp đúng ngày. */
function computeUpcomingDueForecast() {
  const todayKey = todayStr();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      key: todayStr(d),
      label:
        i === 0
          ? "Hôm nay"
          : ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()],
      count: 0,
    });
  }
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  ALL_CARDS.forEach((c) => {
    const st = getCardState(c.id);
    if (st.suspended) return;
    if (st.state === "relearning") {
      days[0].count++;
    } else if (st.state === "review") {
      if (st.due <= todayKey) days[0].count++;
      else if (byKey[st.due]) byKey[st.due].count++;
    }
  });
  return days;
}
function renderUpcomingDueChart() {
  const days = computeUpcomingDueForecast();
  const maxVal = Math.max(1, ...days.map((d) => d.count));
  const cols = days
    .map((d) => {
      const h = Math.max(3, Math.round((d.count / maxVal) * 82));
      return `<div class="bar-col"><div class="bar-value">${d.count}</div><div class="bar" style="height:${h}px;"></div><div class="dlabel">${d.label}</div></div>`;
    })
    .join("");
  return `
    <div class="card-divider"></div>
    <div class="section-label" style="margin:22px 4px 10px;">Sắp đến hạn (7 ngày tới)</div>
    <div class="bar-chart">${cols}</div>
  `;
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
  const weak = ALL_CARDS.filter((c) => masteryTag(c) === "weak");
  const weakCount = weak.length;
  const reviewedToday = reviewsDoneLog[todayStr()] || 0;

  pageSub.textContent =
    due.length > 0
      ? "Ôn lại từ đến hạn bằng active recall"
      : "Không có từ đến hạn — học thêm từ mới nhé";

  // vòng tiến độ ngày (gộp từ tab Trang chủ cũ)
  const newLeft = Math.max(
    0,
    settings.newWordsPerDay - (newWordsLog[todayStr()] || 0),
  );
  const newDoneToday = newWordsLog[todayStr()] || 0;
  const reviewTotalToday = reviewedToday + Math.min(due.length, remaining);
  const goalPct =
    reviewTotalToday === 0
      ? 100
      : clamp(Math.round((reviewedToday / reviewTotalToday) * 100), 0, 100);
  const newPct = clamp(
    Math.round((newDoneToday / Math.max(1, settings.newWordsPerDay)) * 100),
    0,
    100,
  );
  const ring = (pct, color, label) => {
    const r = 32,
      c = 2 * Math.PI * r,
      off = c - (c * pct) / 100;
    return `<div class="ring-wrap">
      <svg viewBox="0 0 76 76"><circle class="ring-track" cx="38" cy="38" r="${r}"/><circle class="ring-fill" cx="38" cy="38" r="${r}" stroke="${color}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
      <div class="r-num">${label}</div>
    </div>`;
  };
  const ringsHtml = `
    <div class="goal-rings">
      <div class="ring-card">${ring(goalPct, "var(--accent)", `${reviewedToday}/${reviewTotalToday}`)}<div class="r-lbl">Ôn tập hôm nay</div></div>
      <div class="ring-card">${ring(newPct, "var(--success)", `${newDoneToday}/${settings.newWordsPerDay}`)}<div class="r-lbl">Từ mới hôm nay</div></div>
    </div>
  `;

  // chuỗi 7 ngày gần nhất (gộp từ tab Trang chủ cũ)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const weeklyHtml = `<div class="weekly-strip">${days
    .map((d) => {
      const key = todayStr(d);
      const isToday = key === todayStr();
      const done = !!reviewLog[key];
      return `<div class="wd ${done ? "done" : ""} ${isToday ? "today" : ""}"><div class="dot">${done ? "✓" : ""}</div>${["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()]}</div>`;
    })
    .join("")}</div>`;

  const insightHtml =
    weakCount > 0
      ? `<div class="insight-box">💡 Bạn có <b>${weakCount} từ đang yếu</b> (hay bị "Lại"/dễ quên) — nên ôn lại sớm trước khi quên hẳn.</div>`
      : "";

  const overviewHtml = `
    <div class="review-overview">
      <div class="ov-stat"><div class="ov-num">${due.length}</div><div class="ov-lbl">Đến hạn</div></div>
      <div class="ov-stat"><div class="ov-num" style="color:${weakCount > 0 ? "var(--danger)" : "var(--ink)"};">${weakCount}</div><div class="ov-lbl">Từ yếu</div></div>
      <div class="ov-stat"><div class="ov-num" style="color:var(--success);">${reviewedToday}</div><div class="ov-lbl">Đã ôn</div></div>
      <div class="ov-stat"><div class="ov-num" style="color:var(--accent);">${newDoneToday}</div><div class="ov-lbl">Đã học</div></div>
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
  } else {
    const nextLabel = upcoming ? upcomingReviewLabel(upcoming.at) : null;
    const nextLabelHtml = nextLabel
      ? nextLabel.live
        ? `<div class="rs-next">Lần ôn tiếp theo: còn <b id="reviewCountdown">--:--</b></div>`
        : `<div class="rs-next">Lần ôn tiếp theo: <b>${nextLabel.text}</b></div>`
      : "";
    if (reviewedToday === 0) {
      // Chưa ôn từ nào hôm nay — dù có thể có thẻ sắp đến hạn (upcoming), vẫn không
      // dùng chữ "Đã hoàn thành" ở đây vì gây hiểu lầm (chưa làm gì thì sao "hoàn thành"),
      // chỉ báo lịch ôn tiếp theo (nếu có) và mời học từ mới.
      ctaHtml = `
        ${
          hasNewCards
            ? `<button class="btn-primary" id="goLearnBtn">Học từ mới</button>`
            : `<div class="empty-state" style="padding:8px 0 0;"><span class="emoji">📭</span>Chưa có từ nào để ôn tập.</div>`
        }
        ${nextLabelHtml ? `<div style="margin-top:12px;">${nextLabelHtml}</div>` : ""}
      `;
    } else {
      ctaHtml = `
        <div class="review-status">
          <div class="rs-check">✓ Đã hoàn thành ôn tập hôm nay</div>
          ${nextLabelHtml}
        </div>
        ${hasNewCards ? `<button class="btn-primary" id="goLearnBtn" style="margin-top:12px;">Học từ mới</button>` : ""}
      `;
    }
  }

  // "Việc cần làm" (gộp từ tab Trang chủ cũ): học từ mới + luyện từ yếu
  const todoActionsHtml = `
    <div class="section-label">Việc cần làm</div>
    <div class="quick-actions">
      <div class="action-row" id="goLearnAction">
        <div class="a-icon" style="background:var(--success-soft);">✨</div>
        <div class="a-info"><div class="a-title">Học từ mới</div><div class="a-sub">${newLeft > 0 ? `Còn ${newLeft} từ trong mục tiêu hôm nay` : "Đã đạt mục tiêu từ mới hôm nay"}</div></div>
        <div class="a-chev">›</div>
      </div>
      ${
        weakCount > 0
          ? `
      <div class="action-row" id="goWeak">
        <div class="a-icon" style="background:var(--danger-soft);">⚠️</div>
        <div class="a-info"><div class="a-title">Luyện từ yếu</div><div class="a-sub">${weakCount} từ hay quên / khó nhớ cần củng cố</div></div>
        <div class="a-chev">›</div>
      </div>`
          : ""
      }
    </div>
  `;

  mainEl.innerHTML = `
    ${ringsHtml}
    ${weeklyHtml}
    ${insightHtml}
    <div class="card-box">
      ${overviewHtml}
      <div class="card-divider"></div>
      <div style="text-align:center; padding-top:14px;">${ctaHtml}</div>
      ${renderUpcomingDueChart()}
    </div>
    ${todoActionsHtml}
  `;

  const startBtn = document.getElementById("startReviewBtn");
  if (startBtn)
    startBtn.addEventListener("click", () =>
      startReviewSession(todaysReviewBatch()),
    );
  const goLearnBtn = document.getElementById("goLearnBtn");
  if (goLearnBtn)
    goLearnBtn.addEventListener("click", () => switchTab("learn"));
  document
    .getElementById("goLearnAction")
    .addEventListener("click", () => switchTab("learn"));
  const goWeakBtn = document.getElementById("goWeak");
  if (goWeakBtn)
    goWeakBtn.addEventListener("click", () =>
      startReviewSession(weak),
    ); // luyện tập chủ động, không tính vào giới hạn ôn/ngày

  if (upcoming) {
    const label = upcomingReviewLabel(upcoming.at);
    if (label.live) startReviewCountdown(upcoming.at);
  }
}
