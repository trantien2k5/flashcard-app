# CLAUDE.md

Vanilla JS + HTML/CSS thuần, **không build tool, không npm, không framework**. Mở bằng local server (vd VSCode Live Server) — mở trực tiếp file `index.html` sẽ lỗi `fetch()` data JSON do CORS.

## Kiến trúc tổng quan

Tất cả biến/hàm là **global** (không module, không import/export). Thứ tự nạp script trong [index.html](index.html) (dòng 78-101) chính là thứ tự phụ thuộc — file sau được dùng bởi file trước nó không tồn tại, chỉ có chiều ngược lại:

```
core/utils.js       → helper thuần (todayStr, clamp, shuffle...), không phụ thuộc gì
core/state.js       → biến state toàn cục: progress, reviewLog, settings...
services/storage.js → storeGet/storeSet (đọc/ghi localStorage, có fallback)
services/vocabulary.js → loadVocabulary() nạp data/*.json vào TOPICS + ALL_CARDS
algorithms/fsrs.js  → FSRS-6 scheduling (không đụng DOM)
algorithms/streak.js→ computeStreak()
components/dialog.js, study-overlay.js → UI dùng chung nhiều feature (phiên học)
features/*.js       → mỗi tab 1 file: topics (tab Chủ đề), review (tab Ôn tập),
                       library (tab Thư viện), stats (tab Thống kê), settings (tab Cài đặt)
core/app.js         → router (switchTab), init() — chạy SAU CÙNG, gọi loadVocabulary()
```

**Khi tìm 1 hàm/biến**: cứ grep tên trong `js/`, không cần đoán qua import vì không có import nào cả.

## State & Data

- **State runtime** (`js/core/state.js`): `progress` (cardId → trạng thái FSRS), `reviewLog`/`reviewsDoneLog`/`newWordsLog`/`ratingLog`/`studyTimeLog` (theo ngày, dùng cho streak/thống kê — `studyTimeLog` tính bằng giây, cộng dồn trong `study-overlay.js` lúc đóng phiên học), `settings` (theme, dailyGoal, newWordsPerDay, learningSteps, relearningSteps, leechThreshold).
- **Persist**: mọi thay đổi state phải gọi `storeSet(key, value)` ([js/services/storage.js](js/services/storage.js)) để lưu localStorage — sửa biến global không tự lưu.
- **Data từ vựng**: `data/index.json` liệt kê id các topic → mỗi topic 1 file `data/<id>.json` chỉ chứa đúng `id`/`name`/`words` (thuần dữ liệu, không icon/màu — xem [data/README.md](data/README.md) để biết cách thêm từ/chủ đề, có bảng prefix ID). Sau khi `loadVocabulary()` chạy, dùng `TOPICS` và `ALL_CARDS` (đã build sẵn, xem [js/services/vocabulary.js](js/services/vocabulary.js)).
- **Trình bày topic** (icon ký tự, tên tiếng Việt, màu badge) định nghĩa tập trung trong 3 map ở đầu `vocabulary.js`: `TOPIC_EMOJI`, `TOPIC_NAME_VI`, `TOPIC_COLOR`. Topic mới thêm vào `data/index.json` mà chưa có trong 3 map này sẽ tự rơi về giá trị mặc định (emoji 📚, tên tiếng Anh gốc, màu xám) — nhớ thêm map nếu muốn tên/icon/màu riêng.

## SRS (FSRS-6) — [js/algorithms/fsrs.js](js/algorithms/fsrs.js)

- `scheduleCard(id, rating)` là entry point chính khi người dùng chấm điểm 1 thẻ (Again/Hard/Good/Easy).
- `dueCards(topicId)`, `newCards(topicId)`, `todaysReviewBatch(topicId)` dùng để build danh sách thẻ cho phiên học.
- **Ranh giới tab Chủ đề / Ôn tập** (đơn giản hoá so với hàng đợi hợp nhất của Anki thật, chỉ khác ở UI): `newCards()`/`isLearnable()` CHỈ trả về thẻ state `"new"` (chưa từng tự chấm điểm lần nào) — tab Chủ đề học từ mới thuần túy, không trộn thẻ cũ. Ngay khi 1 thẻ được tự chấm điểm lần đầu, nó rời "new" và thuộc hẳn về `dueCards()`/`isDue()` (tab Ôn tập) khi tới lượt — dù đang ở bước học dở (`learning`), đang ôn lại sau khi quên (`relearning`), hay đã tốt nghiệp (`review`). Không có khái niệm thẻ "quay lại" tab Chủ đề.
- **2 giới hạn/ngày kiểu Anki, đều là giới hạn CỨNG** (không chỉ hiển thị): `newCardsRemainingToday()` (settings.newWordsPerDay, chặn `newCards()`) và `reviewsRemainingToday()` (settings.dailyGoal, CHỈ chặn thẻ state `"review"` — KHÔNG chặn learning/relearning, giống Anki không giới hạn hàng đợi Learning theo reviews/day). `todaysReviewBatch()` sắp thẻ theo mức độ quá hạn (dueAt/due càng nhỏ lên trước) trước khi cắt theo giới hạn.
- Thuật toán thuần hàm, không đụng DOM — an toàn để test/sửa độc lập với UI.
- Constants cấu hình (learningSteps, leechThreshold...) đọc từ `settings` trong state.js, không hardcode trong fsrs.js.

## UI Flow

- `core/app.js`: `switchTab(tab)` là router duy nhất — nhận key `topics`/`review`/`library`/`stats`/`settings` (khớp `data-tab` trong index.html), render lại `#main` bằng `renderTopics()/renderReviewTab()/renderLibrary()/renderStats()/renderSettings()` (mỗi hàm ở file feature tương ứng). Tab mặc định khi mở app là `review`.
- Tab Ôn tập ([js/features/review.js](js/features/review.js)) gồm 2 thẻ song song (`.today-cards`): **Từ mới** (số từ mới còn được phép học hôm nay + nút "Học từ mới" → sang tab Chủ đề) và **Cần ôn** (`dueCards().length` + nút "Ôn tập" → mở thẳng phiên ôn, disabled nếu không có gì đến hạn). Cả 2 nút cùng mở chung 1 overlay Flashcard (`study-overlay.js`). Retention/độ nhớ và Streak/Thời gian học cố tình KHÔNG đặt ở đây — thuộc tab Thống kê (`.stat-cards`).
- Phiên học (từ tab Chủ đề hoặc Ôn tập) không đổi tab mà mở **overlay** `#studyOverlay` qua `startLearnSession(cards)` / `startReviewSession(cards)` trong [js/components/study-overlay.js](js/components/study-overlay.js).
- Dialog xác nhận/sửa dùng `showDialog({...})` chung ([js/components/dialog.js](js/components/dialog.js)), không tự viết modal riêng.

## Quy ước code

- Không có build/transpile → chỉ viết JS chạy được thẳng trên trình duyệt (ES2020+, không TypeScript, không JSX).
- Comment đầu file theo format `/* ===== TÊN MODULE — mô tả ngắn. Depends on: ... ===== */` — giữ format này khi thêm file mới.
- UI text tiếng Việt, code (tên hàm/biến) tiếng Anh.
- Đặt file mới đúng tầng thư mục theo vai trò (core/services/algorithms/components/features) và **thêm `<script>` vào index.html theo đúng thứ tự phụ thuộc** — quên bước này là lỗi "X is not defined".

## Các topic từ vựng hiện có

office, meetings, email, hr, banking — chi tiết prefix/ID tiếp theo xem bảng trong [data/README.md](data/README.md).
