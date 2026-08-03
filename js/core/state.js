/* ============================================================
   APP STATE — persisted data, loaded/saved via storage.js
   ============================================================ */
let progress = {}; // cardId -> FSRS-6 / Anki-style card state
let reviewLog = {}; // 'YYYY-MM-DD' -> mọi lượt trả lời (dùng tính streak, giống Anki heatmap)
let reviewsDoneLog = {}; // 'YYYY-MM-DD' -> số lượt ôn thẻ ĐANG ở trạng thái review (dùng chặn giới hạn dailyGoal, giống Anki reviews/day)
let newWordsLog = {}; // 'YYYY-MM-DD' -> new words learned count
let ratingLog = {}; // 'YYYY-MM-DD' -> {again,hard,good,easy} counts
let settings = {
  theme: "light",
  dailyGoal: 20, // giới hạn cứng số thẻ review/ngày, giống Anki "reviews/day"
  newWordsPerDay: 10,
  learningSteps: [1, 10], // phút — giống Anki "Learning steps"
  relearningSteps: [10], // phút — giống Anki "Relearning steps"
  leechThreshold: 8, // số lần quên liên tiếp trước khi tự tạm khóa (leech)
};
