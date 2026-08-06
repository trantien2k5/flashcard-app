/* ============================================================
   TAB: LEARN — chọn chủ đề, bắt đầu phiên học từ mới
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startLearnSession)
   ============================================================ */
function renderLearn() {
  pageTitle.textContent = "Học";
  pageSub.textContent = "Học từ vựng mới theo chủ đề";
  const html = topicsByRecency().map((t) => {
    const nTotal = t.cardObjs.length;
    const nNew = t.cardObjs.filter(isNewCard).length;
    const learned = nTotal - nNew;
    const pct = Math.round((learned / nTotal) * 100);
    return `
    <div class="topic-card" data-topic="${t.id}">
      <div class="icon-badge" style="background:${t.color}22;">${t.icon}</div>
      <div class="t-info">
        <div class="t-name">${t.name}</div>
        <div class="t-count">${learned}/${nTotal} từ đã học${nNew > 0 ? ` · ${nNew} từ mới` : ""}</div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${t.color};"></div></div>
      </div>
    </div>`;
  }).join("");
  mainEl.innerHTML = `<div class="topics-grid">${html}</div>`;
  mainEl.querySelectorAll(".topic-card").forEach((el) => {
    el.addEventListener("click", () => beginLearnTopic(el.dataset.topic));
  });
}
function beginLearnTopic(topicId) {
  touchTopicRecency(topicId);
  const nc = newCards(topicId);
  if (nc.length === 0) {
    const topic = topicById(topicId);
    const topicDue = todaysReviewBatch(topicId);
    if (topicDue.length > 0) {
      showDialog({
        emoji: "🎉",
        title: "Đã học hết chủ đề này!",
        message: `Bạn đã học hết từ mới trong "${topic.name}". Có ${topicDue.length} từ đang đến hạn ôn lại — ôn ngay luôn không?`,
        actions: [
          { label: "Để sau" },
          {
            label: "Ôn lại ngay",
            primary: true,
            onClick: () => startReviewSession(topicDue),
          },
        ],
      });
    } else {
      showDialog({
        emoji: "✅",
        title: "Đã học hết chủ đề này!",
        message: `Bạn đã học hết từ mới trong "${topic.name}". Chưa có từ nào đến hạn ôn ngay lúc này, quay lại sau nhé!`,
      });
    }
    return;
  }
  // "Mục tiêu mỗi ngày" (settings.newWordsPerDay) chỉ để HIỂN THỊ (Cài đặt, vòng tiến độ
  // tab Ôn tập) — không dùng để giới hạn số thẻ của phiên học. Số thẻ/phiên luôn cố định
  // tối đa SESSION_MAX_CARDS, do startStudySession() (studyOverlay.js) quyết định.
  startLearnSession(nc);
}
