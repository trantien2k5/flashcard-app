/* ============================================================
   APP STATE — persisted data, loaded/saved via storage.js
   ============================================================ */
let progress = {}; // cardId -> FSRS-6 / Anki-style card state
let reviewLog = {}; // 'YYYY-MM-DD' -> mọi lượt trả lời (dùng tính streak, giống Anki heatmap)
let reviewsDoneLog = {}; // 'YYYY-MM-DD' -> số lượt ôn thẻ ĐANG ở trạng thái review (dùng chặn giới hạn dailyGoal, giống Anki reviews/day)
let newWordsLog = {}; // 'YYYY-MM-DD' -> new words learned count
let ratingLog = {}; // 'YYYY-MM-DD' -> {again,hard,good,easy} counts
let studyTimeLog = {}; // 'YYYY-MM-DD' -> tổng số giây đã học/ôn trong ngày (xem study-overlay.js)
let topicRecency = {}; // topicId -> ISO timestamp lần cuối học/ôn chủ đề đó (dùng đẩy chủ đề gần đây lên đầu tab Chủ đề)
let settings = {
  theme: "system", // "light" | "dark" | "system"
  dailyGoal: 20, // giới hạn cứng số thẻ review/ngày, giống Anki "reviews/day" — không còn lộ ra UI, giữ mặc định an toàn
  newWordsPerDay: 10, // hiện ra UI dưới tên "Mục tiêu mỗi ngày"
  learningSteps: [1, 10], // phút — giống Anki "Learning steps" — không còn lộ ra UI, giữ mặc định
  relearningSteps: [10], // phút — giống Anki "Relearning steps" — không còn lộ ra UI, giữ mặc định
  leechThreshold: 8, // số lần quên liên tiếp trước khi tự tạm khóa (leech) — không còn lộ ra UI, giữ mặc định
  autoSpeak: true, // tự động phát âm khi lật thẻ xem nghĩa
  voiceAccent: "us", // "us" | "uk" — giọng đọc từ vựng
  speechRate: 1.0, // tốc độ phát âm (1.0 = bình thường)
};
