/* ============================================================
   FSRS SCHEDULER — máy trạng thái thẻ kiểu Anki, dùng công thức ở fsrs-formulas.js
   để tính stability/difficulty/khoảng ôn tiếp theo. Đây là nơi DUY NHẤT ghi/đổi
   progress[id] (qua scheduleCard).
   Depends on: core/utils.js (todayStr), core/state.js (progress, reviewLog,
               reviewsDoneLog, ratingLog, settings), services/storage.js (storeSet),
               algorithms/fsrs-formulas.js

   Mô hình trạng thái thẻ, giống Anki:
     new        -> chưa học lần nào
     learning   -> đang đi qua các bước học (phút, settings.learningSteps), Good/Easy hết bước -> review
     review     -> đã "tốt nghiệp", lịch ôn tính bằng ngày qua FSRS-6
     relearning -> vừa quên (Again khi đang review), đi qua bước ôn lại (phút, settings.relearningSteps) rồi quay lại review

   FSRS chỉ tính stability/difficulty khi:
     - thẻ tốt nghiệp từ learning -> review (S0/D0 theo grade vừa bấm)
     - thẻ bị quên (Again) khi đang ở review -> relearning (công thức "forget")
     - thẻ được ôn thành công khi đang ở review (Hard/Good/Easy) -> công thức "recall"
   Các bước learning/relearning tính bằng phút KHÔNG dùng FSRS, y hệt Anki mặc định.

   Leech: quên liên tiếp đủ settings.leechThreshold lần (mặc định 8, như Anki) khi đang
   ở review -> tự tạm khóa (suspended), thẻ biến mất khỏi hàng đợi tới khi mở lại thủ công.

   reviewsDoneLog: chỉ tăng khi "review thật" (thẻ đã ở state review lúc trả lời), dùng
   để HIỂN THỊ "đã ôn hôm nay" — ôn tập KHÔNG có giới hạn/ngày (khác new cards/day).

   progress[id].ratingCounts: đếm số lần bấm mỗi nút (Again/Hard/Good/Easy) CỘNG DỒN
   suốt đời thẻ, không reset khi đổi state — khác ratingLog (tổng hợp theo NGÀY, cho
   toàn bộ thẻ) và reviewLog/reviewsDoneLog (chỉ đếm lượt, không phân theo nút nào).
   Hiện ở Thư viện (xem library.js) để người dùng biết lịch sử đánh giá của từng từ.

   Ranh giới 2 tab (đơn giản hoá so với hàng đợi hợp nhất thật của Anki, chỉ khác ở UI):
     tab Chủ đề  -> CHỈ thẻ "new" (isLearnable, xem fsrs-queries.js) — học từ mới thuần
                    túy, không trộn thẻ cũ.
     tab Ôn tập  -> MỌI thẻ không còn "new" khi đã tới lượt (isDue): learning/relearning
                    đang đợi bước phút, hoặc review đã tới ngày due. Ngay khi 1 thẻ "new"
                    được tự chấm điểm lần đầu, nó rời tab Chủ đề và thuộc hẳn về tab Ôn
                    tập — FSRS (qua isDue/dueCards) tự quyết định khi nào hỏi lại.
   ============================================================ */

/* ---- Trạng thái thẻ ---- */
function defaultCardState() {
  return {
    state: "new",
    step: 0,
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    due: todayStr(),
    dueAt: null,
    suspended: false,
    ratingCounts: { again: 0, hard: 0, good: 0, easy: 0 }, // lịch sử số lần bấm mỗi nút đánh giá, CỘNG DỒN suốt đời thẻ (không reset khi đổi state) — hiện ở Thư viện
  };
}
function getCardState(id) {
  const st = progress[id];
  return st ? { ...st } : defaultCardState();
}
/* "relearning" PHẢI tính chung công thức với "review", không tách riêng — thẻ vừa
   quên (Again) đã có stability MỚI (đã giảm qua fsrsNextForgetStability) và lastReview
   MỚI ngay tại thời điểm đó, nên khả năng nhớ của nó cũng suy giảm dần theo thời gian y
   hệt thẻ review. Trước đây early-return theo trạng thái != "review" khiến khả năng nhớ
   của thẻ relearning LUÔN LUÔN đứng yên ở 100% (do st.reps > 0) — sai ngay khi 1 thẻ
   relearning bị bỏ quên lâu (đóng app giữa chừng): Thư viện vẫn hiện "Khả năng nhớ:
   100%" cạnh nhãn "Cần ôn" (memoryStatus), một mâu thuẫn hiển thị rõ ràng. */
function computeRetrievability(st, now = new Date()) {
  if (
    (st.state !== "review" && st.state !== "relearning") ||
    !st.lastReview ||
    st.stability <= 0
  )
    return st.reps > 0 ? 1 : 0;
  const elapsed = Math.max(0, (now - new Date(st.lastReview)) / 86400000);
  return fsrsRetrievability(elapsed, st.stability);
}

function graduateToReview(st, grade, now) {
  st.difficulty = fsrsInitialDifficulty(grade);
  st.stability = fsrsInitialStability(grade);
  st.state = "review";
  st.step = 0;
  st.dueAt = null;
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + fsrsNextIntervalDays(st.stability));
  st.due = todayStr(dueDate);
  return st;
}
/* Tính bước kế tiếp trong danh sách learning/relearning steps cho 1 lượt đánh giá.
   idx = bước hiện tại đang chờ trả lời (0-based; thẻ mới coi như đang ở bước 0).
   - Again : luôn quay về bước 0.
   - Hard  : lặp lại CÙNG bước idx, độ trễ = trung bình(bước idx, bước idx+1) hoặc idx*1.5 nếu là bước cuối.
   - Good  : ĐI TIẾP sang bước idx+1, độ trễ = thời gian của chính bước idx+1 đó (không phải bước cũ).
   - Easy  : tốt nghiệp ngay lập tức, bỏ qua các bước còn lại.
   Đây là quy tắc chuẩn Anki dùng cho (re)learning steps. */
function nextStepResult(idx, grade, steps) {
  if (grade === GRADE.again) {
    return { step: 0, delayMin: steps[0] };
  }
  if (grade === GRADE.easy) {
    return { graduate: true };
  }
  if (grade === GRADE.hard) {
    const cur = steps[idx],
      next = steps[idx + 1];
    const delayMin = next !== undefined ? (cur + next) / 2 : cur * 1.5;
    return { step: idx, delayMin };
  }
  // good — đi tiếp sang bước kế
  const nextIdx = idx + 1;
  if (nextIdx >= steps.length) return { graduate: true };
  return { step: nextIdx, delayMin: steps[nextIdx] };
}

/* Bước chung cho learning & relearning: trả về state mới, KHÔNG ghi progress (dùng cho preview + schedule) */
function computeNextState(old, grade, now) {
  let st = { ...old };
  st.reps = old.reps + 1;
  st.lastReview = now.toISOString();

  const inLearningPhase = old.state === "new" || old.state === "learning";
  const inRelearningPhase = old.state === "relearning";

  if (inLearningPhase) {
    const steps = learningSteps();
    const idx = old.state === "new" ? 0 : old.step;
    const result = nextStepResult(idx, grade, steps);
    if (result.graduate) {
      st = graduateToReview(st, grade, now);
    } else {
      st.state = "learning";
      st.step = result.step;
      st.dueAt = addMinutes(now, result.delayMin).toISOString();
    }
  } else if (old.state === "review") {
    const R = computeRetrievability(old, now);
    if (grade === GRADE.again) {
      st.lapses = old.lapses + 1;
      st.stability = fsrsNextForgetStability(old.difficulty, old.stability, R);
      st.difficulty = fsrsNextDifficulty(old.difficulty, grade);
      st.state = "relearning";
      st.step = 0;
      st.dueAt = addMinutes(now, relearningSteps()[0]).toISOString();
      if (st.lapses >= leechThreshold()) st.suspended = true;
    } else {
      st.stability = fsrsNextRecallStability(
        old.difficulty,
        old.stability,
        R,
        grade,
      );
      st.difficulty = fsrsNextDifficulty(old.difficulty, grade);
      st.state = "review";
      st.dueAt = null;
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + fsrsNextIntervalDays(st.stability));
      st.due = todayStr(dueDate);
    }
  } else if (inRelearningPhase) {
    const steps = relearningSteps();
    const result = nextStepResult(old.step, grade, steps);
    if (result.graduate) {
      st.state = "review";
      st.dueAt = null;
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + fsrsNextIntervalDays(old.stability));
      st.due = todayStr(dueDate);
    } else {
      st.state = "relearning";
      st.step = result.step;
      st.dueAt = addMinutes(now, result.delayMin).toISOString();
    }
  }
  return st;
}

function scheduleCard(id, rating) {
  const grade = GRADE[rating];
  const old = getCardState(id);
  const now = new Date();
  const st = computeNextState(old, grade, now);
  // Thẻ tạo trước khi có ratingCounts (dữ liệu localStorage cũ) sẽ chưa có field này —
  // mặc định 0 cho cả 4 nút thay vì lỗi khi cộng dồn.
  st.ratingCounts = {
    ...(old.ratingCounts || { again: 0, hard: 0, good: 0, easy: 0 }),
  };
  st.ratingCounts[rating] = (st.ratingCounts[rating] || 0) + 1;
  progress[id] = st;
  storeSet("progress", progress);

  const day = todayStr();
  reviewLog[day] = (reviewLog[day] || 0) + 1;
  storeSet("reviewLog", reviewLog);
  if (old.state === "review") {
    reviewsDoneLog[day] = (reviewsDoneLog[day] || 0) + 1;
    storeSet("reviewsDoneLog", reviewsDoneLog);
  }
  ratingLog[day] = ratingLog[day] || { again: 0, hard: 0, good: 0, easy: 0 };
  ratingLog[day][rating] += 1;
  storeSet("ratingLog", ratingLog);
  return st;
}

function unsuspendCard(id) {
  const st = getCardState(id);
  st.suspended = false;
  progress[id] = st;
  storeSet("progress", progress);
}

/* Xem trước nhãn thời gian cho 4 nút đánh giá, không thay đổi state thật */
function formatIntervalLabel(st, now) {
  if (st.dueAt) {
    const mins = Math.round((new Date(st.dueAt) - now) / 60000);
    return mins < 60
      ? `${Math.max(1, mins)} phút`
      : `${Math.round(mins / 60)} giờ`;
  }
  const days = Math.round(
    (new Date(st.due + "T00:00:00Z") - new Date(todayStr(now) + "T00:00:00Z")) /
      86400000,
  );
  if (days < 1) return "<1 ngày";
  if (days < 30) return `${days} ngày`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${(days / 365).toFixed(1)} năm`;
}
function previewIntervals(id) {
  const old = getCardState(id);
  const now = new Date();
  const labels = {};
  Object.keys(GRADE).forEach((name) => {
    const st = computeNextState(old, GRADE[name], now);
    labels[name] = formatIntervalLabel(st, now);
  });
  return labels;
}
