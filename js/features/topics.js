/* ============================================================
   TAB: CHỦ ĐỀ (topics.js) — chọn chủ đề, bắt đầu phiên học từ mới
   Depends on: core/*, services/*, algorithms/*, core/app.js, components/study-overlay.js (startLearnSession)
   ============================================================ */
function renderTopics() {
  pageTitle.textContent = "Chủ đề";
  pageSub.textContent = "Chọn một chủ đề để học từ mới";
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
    el.addEventListener("click", () => beginTopicSession(el.dataset.topic));
  });
}
function beginTopicSession(topicId) {
  touchTopicRecency(topicId);
  const nc = newCards(topicId); // đã bị cắt theo newCardsRemainingToday() — giới hạn cứng
  if (nc.length === 0) {
    const topic = topicById(topicId);
    const topicDue = todaysReviewBatch(topicId);
    // nc rỗng có 2 lý do KHÁC NHAU — phải phân biệt để không báo nhầm "hết từ mới"
    // trong khi thực ra chủ đề vẫn còn, chỉ là đã dùng hết hạn mức từ mới/ngày.
    const topicStillHasNew = topic.cardObjs.some(isLearnable);
    if (topicStillHasNew) {
      showDialog({
        emoji: "🎯",
        title: "Đã đạt mục tiêu từ mới hôm nay!",
        message:
          topicDue.length > 0
            ? `Bạn đã học đủ ${settings.newWordsPerDay} từ mới hôm nay. "${topic.name}" vẫn còn từ mới, để mai học tiếp — nhưng có ${topicDue.length} từ đang cần ôn ngay, ôn luôn không?`
            : `Bạn đã học đủ ${settings.newWordsPerDay} từ mới hôm nay. "${topic.name}" vẫn còn từ mới, quay lại vào ngày mai nhé!`,
        actions:
          topicDue.length > 0
            ? [
                { label: "Để mai học tiếp" },
                {
                  label: "Ôn ngay",
                  primary: true,
                  onClick: () => startReviewSession(topicDue),
                },
              ]
            : null,
      });
    } else if (topicDue.length > 0) {
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
  // Số thẻ/phiên luôn cố định tối đa SESSION_MAX_CARDS, do startStudySession()
  // (studyOverlay.js) quyết định — nc có thể đã ít hơn SESSION_MAX_CARDS do bị cắt theo
  // hạn mức từ mới/ngày còn lại (xem newCards() trong fsrs.js), lúc đó phiên sẽ ngắn hơn.
  // nc chỉ gồm thẻ "new" (isLearnable), nên phiên "Học từ mới" luôn thuần từ mới, không
  // trộn thẻ đã từng chấm điểm — thẻ nào tự chấm rồi sẽ chuyển hẳn sang tab Ôn tập.
  startLearnSession(nc);
}
