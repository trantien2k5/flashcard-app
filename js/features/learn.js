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
  const remaining = Math.max(
    0,
    settings.newWordsPerDay - (newWordsLog[todayStr()] || 0),
  );
  let batch = shuffle(nc);
  if (remaining > 0) batch = batch.slice(0, remaining);
  else batch = batch.slice(0, 5); // soft cap override
  startLearnSession(batch);
}
