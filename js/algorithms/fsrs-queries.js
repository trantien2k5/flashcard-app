/* ============================================================
   FSRS QUERIES — phân loại thẻ cho UI (masteryTag/memoryLevel/memoryStatus) và xây
   danh sách thẻ cho phiên học/ôn (isDue/dueCards/isLearnable/newCards/...). CHỈ ĐỌC
   progress, không ghi (xem fsrs-scheduler.js để đổi state thật). Đây là nơi build
   danh sách thẻ cho phiên học/ôn — xem thêm ghi chú "Ranh giới 2 tab" ở đầu
   fsrs-scheduler.js.
   Depends on: core/utils.js (todayStr), core/state.js (progress, newWordsLog, settings),
               services/vocabulary.js (ALL_CARDS, topicById),
               algorithms/fsrs-scheduler.js (getCardState, computeRetrievability)
   ============================================================ */

/* ---- Phân loại / truy vấn thẻ ---- */
/* "Cần củng cố" (trước gọi "Yếu") theo đúng bản chất bộ nhớ mà FSRS-6 đang mô hình
   hóa: Difficulty (khó nhớ) và Stability (chưa ổn định) — KHÔNG dùng Retrievability
   (R) như bản cũ, vì R chỉ phản ánh "sắp quên do lâu chưa ôn tới hạn" (đã có
   memoryStatus() lo việc đó), không phản ánh bản thân từ đó có khó nhớ hay không. Một
   từ Difficulty cao nhưng Stability cũng cao (vd D=9, S=365 ngày) là từ khó nhưng ĐÃ
   THUỘC — không nên gọi "cần củng cố". Ngược lại D thấp + S thấp chỉ là từ mới học,
   cũng chưa chắc cần củng cố. Chỉ khi CẢ HAI cùng xấu (khó nhớ VÀ chưa ổn định) mới
   đáng báo động. reps >= 5 là điều kiện chống nhiễu — dưới 5 lần ôn thì FSRS chưa có
   đủ dữ liệu để Difficulty/Stability đáng tin, chưa nên gắn nhãn. */
function masteryTag(card) {
  const st = getCardState(card.id);
  if (st.suspended) return "leech";
  if (st.state === "new") return "new";
  if (st.state === "learning" || st.state === "relearning") return "learning";
  if (st.reps >= 5 && st.difficulty >= 7 && st.stability <= 14) return "weak";
  if (st.stability >= 21) return "mastered";
  if (st.stability >= 7) return "strong";
  return "learning";
}
/* Điểm xếp hạng mức độ "cần củng cố" — CAO hơn = khó nhớ hơn VÀ kém ổn định hơn, dùng
   để sắp thứ tự trong danh sách lọc "weak" ở Thư viện (từ đáng lo nhất lên đầu) thay vì
   giữ nguyên thứ tự chủ đề mặc định. log2(stability + 2) tăng chậm hơn stability rất
   nhiều (thang log, không tuyến tính) nên Stability vẫn là yếu tố ghì điểm xuống rõ rệt
   khi đã ổn định, mà không làm điểm âm/chia cho 0 khi stability nhỏ. */
function weakScore(card) {
  const st = getCardState(card.id);
  return (st.difficulty * 10) / Math.log2(st.stability + 2);
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
  weak: { label: "🔥 Cần củng cố", color: "var(--danger)", bg: "var(--danger-soft)" },
  leech: { label: "Leech 🔒", color: "#fff", bg: "var(--danger)" },
};
/* Phân loại 5 cấp trí nhớ DÀI HẠN, THUẦN THEO STABILITY của FSRS-6 (số ngày để rơi còn
   90% khả năng nhớ) — không đụng vào thuật toán FSRS, chỉ đọc output (state, stability)
   rồi gắn nhãn cho UI. Khác masteryTag() (dùng difficulty/stability/reps, phục vụ filter
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
/* "Đến hạn ÔN" (tab Ôn tập) — giống Anki: MỌI thẻ không còn "new" đều thuộc hàng đợi
   ôn khi đã tới lượt, FSRS tự quyết định thứ tự xử lý, không quan tâm thẻ đó đang ở
   bước học đầu hay đã tốt nghiệp lâu rồi:
   - learning   : vừa tự chấm lần đầu (từ "new"), đang đợi bước học tiếp theo (phút)
   - relearning : vừa quên (Again) khi đang review, đang đợi bước ôn lại (phút)
   - review     : đã tốt nghiệp, đến ngày due (lịch dài FSRS)
   "new" (chưa từng chạm, chưa tự chấm lần nào) KHÔNG tính vào đây — thuộc tab Chủ đề
   (xem isLearnable), tách bạch hoàn toàn "học từ mới" khỏi "ôn tập". */
function isDue(card) {
  const st = getCardState(card.id);
  if (st.suspended) return false;
  if (st.state === "review") return st.due <= todayStr();
  if (st.state === "learning" || st.state === "relearning")
    return !st.dueAt || new Date(st.dueAt) <= new Date();
  return false;
}
function dueCards(topicId) {
  const pool = topicId ? topicById(topicId).cardObjs : ALL_CARDS;
  return pool.filter(isDue);
}
/* Thẻ tab Chủ đề có thể học: CHỈ "new" (chưa từng chạm, chưa tự chấm lần nào) — giống
   Anki, "Học từ mới" là từ mới thuần túy, không trộn lẫn thẻ đã từng chấm điểm (dù đang
   ở bước học dở hay đã tốt nghiệp). Ngay khi tự chấm điểm lần đầu, thẻ rời khỏi đây và
   thuộc hẳn về tab Ôn tập (xem isDue) — không quay lại tab Chủ đề nữa. */
function isLearnable(card) {
  const st = getCardState(card.id);
  return !st.suspended && st.state === "new";
}
/* ---- Giới hạn từ mới/ngày kiểu Anki "new cards/day" — GIỚI HẠN CỨNG, không chỉ hiển thị ---- */
function newCardsRemainingToday() {
  return Math.max(0, settings.newWordsPerDay - (newWordsLog[todayStr()] || 0));
}
/* Cắt theo đúng THỨ TỰ CỐ ĐỊNH của pool (không xáo trộn ở đây) — giống Anki lấy thẻ mới
   theo đúng vị trí trong deck, không random cả kho. Việc xáo trộn thứ tự HIỂN THỊ trong
   phiên học do startStudySession() (studyOverlay.js) đảm nhận sau khi đã chọn xong tập. */
function newCards(topicId) {
  const pool = topicId ? topicById(topicId).cardObjs : ALL_CARDS;
  return pool.filter(isLearnable).slice(0, newCardsRemainingToday());
}

/* Ôn tập KHÔNG có giới hạn/ngày (khác "học từ mới" — xem newCardsRemainingToday):
   thẻ đã học rồi thì FSRS đã cam kết lịch ôn, trễ hẹn sẽ càng khó nhớ hơn, nên tất cả
   thẻ đến hạn đều được đưa vào hàng đợi, không cắt bớt.
   Thứ tự giống Anki: learning/relearning (đang đợi bước phút) lên trước, sort theo
   dueAt càng gần càng trước; rồi tới review (đã tốt nghiệp), sort theo due càng quá
   hạn càng lên đầu. */
function todaysReviewBatch(topicId) {
  const withState = dueCards(topicId).map((c) => ({ c, st: getCardState(c.id) }));
  const urgent = withState
    .filter((x) => x.st.state !== "review")
    .sort((a, b) => new Date(a.st.dueAt) - new Date(b.st.dueAt))
    .map((x) => x.c);
  const reviews = withState
    .filter((x) => x.st.state === "review")
    .sort((a, b) => (a.st.due < b.st.due ? -1 : a.st.due > b.st.due ? 1 : 0))
    .map((x) => x.c);
  return urgent.concat(reviews);
}
