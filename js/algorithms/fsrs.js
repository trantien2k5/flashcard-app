/* ============================================================
   SRS ENGINE — FSRS-6 (official default weights) + lịch học/ôn kiểu Anki
   Depends on: core/utils.js (todayStr, clamp), core/state.js (progress, reviewLog, reviewsDoneLog,
               ratingLog, settings), services/storage.js (storeSet), services/vocabulary.js (ALL_CARDS, topicById)

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

   Giới hạn ôn/ngày: chỉ tính "review thật" (thẻ đã ở state review lúc trả lời) vào
   reviewsDoneLog, y hệt Anki (không tính learning/relearning steps vào giới hạn này).
   ============================================================ */

/* ---- Tham số FSRS-6 mặc định chính thức (21 trọng số) ---- */
const FSRS_W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
];
const FSRS_DECAY = -FSRS_W[20];
const FSRS_FACTOR = Math.pow(0.9, 1 / FSRS_DECAY) - 1;
const DESIRED_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 36500;

const GRADE = { again: 1, hard: 2, good: 3, easy: 4 };

function learningSteps() {
  return settings.learningSteps && settings.learningSteps.length
    ? settings.learningSteps
    : [1, 10];
}
function relearningSteps() {
  return settings.relearningSteps && settings.relearningSteps.length
    ? settings.relearningSteps
    : [10];
}
function leechThreshold() {
  return settings.leechThreshold || 8;
}

function addMinutes(date, min) {
  return new Date(date.getTime() + min * 60000);
}

/* ---- Công thức toán FSRS-6 ---- */
function fsrsInitialStability(grade) {
  return Math.max(0.1, FSRS_W[grade - 1]);
}
function fsrsInitialDifficulty(grade) {
  return clamp(FSRS_W[4] - Math.exp(FSRS_W[5] * (grade - 1)) + 1, 1, 10);
}
function fsrsMeanReversion(init, current) {
  return FSRS_W[7] * init + (1 - FSRS_W[7]) * current;
}
function fsrsNextDifficulty(d, grade) {
  const next = d - FSRS_W[6] * (grade - 3);
  return clamp(fsrsMeanReversion(fsrsInitialDifficulty(4), next), 1, 10);
}
function fsrsRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FSRS_FACTOR * elapsedDays) / stability, FSRS_DECAY);
}
function fsrsNextRecallStability(d, s, r, grade) {
  const hardPenalty = grade === GRADE.hard ? FSRS_W[15] : 1;
  const easyBonus = grade === GRADE.easy ? FSRS_W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(FSRS_W[8]) *
        (11 - d) *
        Math.pow(s, -FSRS_W[9]) *
        (Math.exp((1 - r) * FSRS_W[10]) - 1) *
        hardPenalty *
        easyBonus)
  );
}
function fsrsNextForgetStability(d, s, r) {
  return Math.min(
    FSRS_W[11] *
      Math.pow(d, -FSRS_W[12]) *
      (Math.pow(s + 1, FSRS_W[13]) - 1) *
      Math.exp((1 - r) * FSRS_W[14]),
    s,
  );
}

/* ---- Khoảng ôn tiếp theo (ngày), có "fuzz" ngẫu nhiên nhẹ giống Anki ---- */
const FUZZ_RANGES = [
  { start: 2.5, end: 7.0, factor: 0.15 },
  { start: 7.0, end: 20.0, factor: 0.1 },
  { start: 20.0, end: Infinity, factor: 0.05 },
];
function fuzzedInterval(interval) {
  if (interval < 2.5) return Math.max(1, Math.round(interval));
  let delta = 1.0;
  FUZZ_RANGES.forEach((r) => {
    delta += r.factor * Math.max(0, Math.min(interval, r.end) - r.start);
  });
  const lo = Math.max(1, Math.round(interval - delta));
  const hi = Math.min(MAX_INTERVAL_DAYS, Math.round(interval + delta));
  return lo + Math.floor(Math.random() * (Math.max(lo, hi) - lo + 1));
}
function fsrsNextIntervalDays(stability, retention = DESIRED_RETENTION) {
  const raw =
    (stability / FSRS_FACTOR) * (Math.pow(retention, 1 / FSRS_DECAY) - 1);
  return fuzzedInterval(clamp(raw, 1, MAX_INTERVAL_DAYS));
}

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
  };
}
function getCardState(id) {
  const st = progress[id];
  return st ? { ...st } : defaultCardState();
}
function computeRetrievability(st, now = new Date()) {
  if (st.state !== "review" || !st.lastReview || st.stability <= 0)
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

/* ---- Phân loại / truy vấn thẻ ---- */
function masteryTag(card) {
  const st = getCardState(card.id);
  if (st.suspended) return "leech";
  if (st.state === "new") return "new";
  if (st.state === "learning" || st.state === "relearning") return "learning";
  const R = computeRetrievability(st);
  if (st.lapses >= 2 || R < 0.7) return "weak";
  if (st.stability >= 21) return "mastered";
  if (st.stability >= 7) return "strong";
  return "learning";
}
const TAG_META = {
  new: { label: "Mới", color: "var(--ink-faint)", bg: "transparent" },
  learning: {
    label: "Đang học",
    color: "var(--accent-soft-ink)",
    bg: "var(--accent-soft)",
  },
  strong: { label: "Khá tốt", color: "var(--sky)", bg: "var(--sky-soft)" },
  mastered: {
    label: "Đã thuộc",
    color: "var(--success)",
    bg: "var(--success-soft)",
  },
  weak: { label: "Yếu", color: "var(--danger)", bg: "var(--danger-soft)" },
  leech: { label: "Leech 🔒", color: "#fff", bg: "var(--danger)" },
};
/* Phân loại 5 cấp trí nhớ DÀI HẠN, THUẦN THEO STABILITY của FSRS-6 (số ngày để rơi còn
   90% khả năng nhớ) — không đụng vào thuật toán FSRS, chỉ đọc output (state, stability)
   rồi gắn nhãn cho UI. Khác masteryTag() (dùng lapses/retrievability, phục vụ filter
   Thư viện). Ngưỡng 3/21/90 ngày KHÔNG phải ngưỡng chính thức của FSRS-6 — đó là quy
   tắc UX tự chọn, giãn cách kiểu log (~7x rồi ~4.3x) vì stability tăng theo cấp số nhân
   chứ không tuyến tính, chia đều theo ngày sẽ lệch phân bố.
   Đây là cấp độ DÀI HẠN — không đổi theo từng ngày; trạng thái "sắp quên hôm nay" do
   Retrievability tụt (dù S vẫn cao) là chuyện khác, xem memoryStatus() bên dưới.
   Trả về null cho thẻ state "new" (reps=0, CHƯA TỪNG được xem qua 1 lần nào) —
   cố tình loại khỏi biểu đồ vì nếu tính cả sẽ ra số từ-chưa-chạm-tới của TOÀN BỘ
   thư viện (hàng trăm từ), không phản ánh gì về hành trình học thật của người dùng. */
function memoryLevel(card) {
  const st = getCardState(card.id);
  if (st.suspended) return "leech";
  if (st.state === "new") return null;
  if (st.state === "learning") return "fresh";
  // review hoặc relearning đều đã có stability tính được (relearning giữ nguyên S
  // vừa giảm sau lần quên gần nhất, vẫn phản ánh đúng mức độ nhớ hiện tại).
  if (st.stability < 3) return "familiar";
  if (st.stability < 21) return "remembered";
  if (st.stability < 90) return "solid";
  return "fluent";
}

/* Trạng thái TỨC THỜI (đổi theo từng ngày) — dựa trên Retrievability hôm nay, tách biệt
   khỏi memoryLevel() ở trên. Một từ "Nhớ vững" (S=47 ngày) vẫn có thể "Sắp quên" nếu lâu
   chưa ôn, R tụt xuống gần ngưỡng desired retention (90%). Không tính cho thẻ new/leech
   (chưa có R hoặc đã khóa). */
function memoryStatus(card) {
  const st = getCardState(card.id);
  // Chỉ có ý nghĩa cho thẻ đã tốt nghiệp lần đầu (review/relearning) — thẻ "new"/"learning"
  // chưa có stability thật, retrievability lúc đó chỉ là giá trị mặc định, không phản ánh gì.
  if (st.suspended || (st.state !== "review" && st.state !== "relearning"))
    return null;
  if (isDue(card)) return "due"; // Cần ôn — đã tới/quá hạn
  const R = computeRetrievability(st);
  if (R < DESIRED_RETENTION) return "fading"; // Sắp quên — R đã tụt dưới mốc tham chiếu
  return "good"; // Nhớ tốt
}
const MEMORY_STATUS_META = {
  good: { label: "Nhớ tốt", color: "var(--success)" },
  fading: { label: "Sắp quên", color: "var(--warning)" },
  due: { label: "Cần ôn", color: "var(--danger)" },
};
const MEMORY_LEVEL_META = {
  fresh: {
    label: "Mới gặp",
    desc: "Chưa có lịch sử ôn đáng kể",
    color: "var(--ink-soft)",
  },
  familiar: {
    label: "Làm quen",
    desc: "Stability còn thấp",
    color: "var(--danger)",
  },
  remembered: {
    label: "Đã nhớ",
    desc: "Đã hình thành trí nhớ tương đối ổn định",
    color: "var(--accent)",
  },
  solid: {
    label: "Nhớ vững",
    desc: "Stability cao, khoảng cách ôn dài",
    color: "var(--sky)",
  },
  fluent: {
    label: "Thành thạo",
    desc: "Stability rất cao",
    color: "var(--success)",
  },
};
const MEMORY_LEVEL_ORDER = ["fresh", "familiar", "remembered", "solid", "fluent"];

function isNewCard(card) {
  return getCardState(card.id).state === "new";
}
/* "Đến hạn ÔN" (tab Ôn tập) chỉ tính thẻ đã tốt nghiệp qua review ít nhất 1 lần:
   - review     : đến ngày due (lịch dài FSRS)
   - relearning : vừa quên (Again) khi đang review, đang đợi bước ôn lại theo phút
   KHÔNG tính "learning" (từ mới đang học dở, chưa tốt nghiệp lần đầu) — thẻ dạng này
   thuộc về tab Chủ đề (xem isLearnable), tránh lẫn "từ mới học dở" vào "từ đến hạn ôn". */
function isDue(card) {
  const st = getCardState(card.id);
  if (st.suspended) return false;
  if (st.state === "review") return st.due <= todayStr();
  if (st.state === "relearning")
    return !!st.dueAt && new Date(st.dueAt) <= new Date();
  return false;
}
function dueCards(topicId) {
  const pool = topicId ? topicById(topicId).cardObjs : ALL_CARDS;
  return pool.filter(isDue);
}
/* Thẻ tab Chủ đề có thể học/học tiếp: "new" (chưa từng chạm) HOẶC "learning" đã đến giờ
   bước tiếp theo (vd người dùng đóng phiên học giữa chừng lúc thẻ đang đợi 10 phút) —
   để thẻ dở dang đó quay lại đúng tab Chủ đề thay vì rơi vào tab Ôn tập. */
function isLearnable(card) {
  const st = getCardState(card.id);
  if (st.suspended) return false;
  if (st.state === "new") return true;
  if (st.state === "learning")
    return !st.dueAt || new Date(st.dueAt) <= new Date();
  return false;
}
function newCards(topicId) {
  const pool = topicId ? topicById(topicId).cardObjs : ALL_CARDS;
  return pool.filter(isLearnable);
}

/* ---- Giới hạn ôn/ngày kiểu Anki "reviews/day" ---- */
function reviewsRemainingToday() {
  return Math.max(0, settings.dailyGoal - (reviewsDoneLog[todayStr()] || 0));
}
function todaysReviewBatch(topicId) {
  return dueCards(topicId).slice(0, reviewsRemainingToday());
}

/* Lượt đến hạn gần nhất trong TƯƠNG LAI (chưa due) CHO ÔN TẬP, dùng cho đếm ngược khi
   hàng đợi ôn tập trống. Chỉ xét review/relearning (giống isDue) — không tính "learning"
   vì thẻ đó thuộc tab Chủ đề, không phải "sắp đến hạn ôn". */
function nextUpcomingDue() {
  let soonest = null;
  const targets = [];
  ALL_CARDS.forEach((card) => {
    const st = getCardState(card.id);
    if (st.suspended) return;
    let t = null;
    if (st.state === "relearning" && st.dueAt) {
      const d = new Date(st.dueAt);
      if (d.getTime() > Date.now()) t = d.getTime();
    } else if (st.state === "review" && st.due > todayStr()) {
      t = new Date(st.due + "T00:00:00").getTime();
    }
    if (t != null) targets.push(t);
  });
  if (targets.length === 0) return null;
  soonest = Math.min(...targets);
  const count = targets.filter((t) => t === soonest).length;
  return { at: new Date(soonest), count };
}
