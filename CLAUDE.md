# CLAUDE.md

Vanilla JS + HTML/CSS thuần, **không build tool, không npm, không framework**. Mở bằng local server (vd VSCode Live Server) — mở trực tiếp file `index.html` sẽ lỗi `fetch()` data JSON do CORS.

## Kiến trúc tổng quan

Tất cả biến/hàm là **global** (không module, không import/export, không thư mục con ngoài 5 thư mục vai trò cố định bên dưới). Thứ tự nạp `<script>`/`<link>` trong [index.html](index.html) chính là thứ tự phụ thuộc — file sau được dùng bởi file trước nó không tồn tại, chỉ có chiều ngược lại:

```
core/utils.js            → helper thuần (todayStr, clamp, shuffle...), không phụ thuộc gì
core/state.js             → biến state toàn cục: progress, reviewLog, settings...
services/storage.js       → storeGet/storeSet (đọc/ghi localStorage, có fallback)
services/vocabulary.js    → loadVocabulary() nạp data/*.json vào TOPICS + ALL_CARDS
algorithms/fsrs-formulas.js  → công thức toán FSRS-6 thuần (trọng số, stability/difficulty/retrievability)
algorithms/fsrs-scheduler.js → máy trạng thái thẻ (new→learning→review↔relearning), scheduleCard()
algorithms/fsrs-queries.js   → phân loại (masteryTag/memoryLevel/memoryStatus) + build danh
                                sách thẻ cho phiên học (dueCards/newCards/todaysReviewBatch...)
algorithms/streak.js      → computeStreak()
components/dialog.js       → mọi popup (showDialog/showOptionDialog/showEditSettingDialog)
components/study-audio.js  → phát âm từ vựng (speak/prefetchAudio), tách riêng khỏi overlay
components/study-overlay.js→ máy trạng thái phiên học/ôn (flashcard lật, hàng đợi, timer)
features/*.js              → mỗi tab 1 file: topics (tab Chủ đề), review (tab Ôn tập),
                              library (tab Thư viện), stats (tab Thống kê), settings (tab Cài đặt)
core/app.js                → router (switchTab), init() — chạy SAU CÙNG, gọi loadVocabulary()
```

CSS cũng tách theo đúng vai trò tương ứng, nạp cùng thứ tự (xem toàn bộ `<link>` ở đầu [index.html](index.html)): `base.css` (biến theme + reset) → `layout.css` (header/nav chung) → `components.css` (card/nút/dialog dùng chung) → `study-overlay.css` (UI phiên học) → rồi 1 file `.css` cho mỗi tab, **tên trùng với file JS trong `features/`** (`topics.css`, `review.css`, `library.css`, `stats.css`, `settings.css`). Sửa giao diện tab nào thì luôn tìm file CSS/JS cùng tên đó — không có file CSS/JS nào gộp nhiều tab.

**Khi tìm 1 hàm/biến**: cứ grep tên trong `js/`, không cần đoán qua import vì không có import nào cả. **Khi tìm 1 style**: mở file `css/<tên-tab-hoặc-vai-trò>.css` tương ứng.

## State & Data

- **State runtime** (`js/core/state.js`): `progress` (cardId → trạng thái FSRS), `reviewLog`/`reviewsDoneLog`/`newWordsLog`/`ratingLog`/`studyTimeLog` (theo ngày, dùng cho streak/thống kê — `studyTimeLog` tính bằng giây, cộng dồn trong `study-overlay.js` lúc đóng phiên học), `settings` (theme, dailyGoal, newWordsPerDay, learningSteps, relearningSteps, leechThreshold).
- **Persist**: mọi thay đổi state phải gọi `storeSet(key, value)` ([js/services/storage.js](js/services/storage.js)) để lưu localStorage — sửa biến global không tự lưu.
- **Data từ vựng**: `data/index.json` liệt kê id các topic → mỗi topic 1 file `data/<id>.json` chỉ chứa đúng `id`/`name`/`words` (thuần dữ liệu, không icon/màu — xem [data/README.md](data/README.md) để biết cách thêm từ/chủ đề, có bảng prefix ID). Sau khi `loadVocabulary()` chạy, dùng `TOPICS` và `ALL_CARDS` (đã build sẵn, xem [js/services/vocabulary.js](js/services/vocabulary.js)).
- **Trình bày topic** (icon ký tự, tên tiếng Việt, màu badge) định nghĩa tập trung trong 3 map ở đầu `vocabulary.js`: `TOPIC_EMOJI`, `TOPIC_NAME_VI`, `TOPIC_COLOR`. Topic mới thêm vào `data/index.json` mà chưa có trong 3 map này sẽ tự rơi về giá trị mặc định (emoji 📚, tên tiếng Anh gốc, màu xám) — nhớ thêm map nếu muốn tên/icon/màu riêng.

## SRS (FSRS-6) — `js/algorithms/fsrs-*.js`

3 file, chỉ đọc/ghi qua nhau theo 1 chiều: `fsrs-formulas.js` (công thức toán thuần) ← `fsrs-scheduler.js` (máy trạng thái, ghi `progress`) ← `fsrs-queries.js` (phân loại + build danh sách thẻ, chỉ đọc).

- `scheduleCard(id, rating)` (fsrs-scheduler.js) là entry point chính khi người dùng chấm điểm 1 thẻ (Again/Hard/Good/Easy).
- `dueCards(topicId)`, `newCards(topicId)`, `todaysReviewBatch(topicId)` (fsrs-queries.js) dùng để build danh sách thẻ cho phiên học.
- **Ranh giới tab Chủ đề / Ôn tập** (đơn giản hoá so với hàng đợi hợp nhất của Anki thật, chỉ khác ở UI): `newCards()`/`isLearnable()` CHỈ trả về thẻ state `"new"` (chưa từng tự chấm điểm lần nào) — tab Chủ đề học từ mới thuần túy, không trộn thẻ cũ. Ngay khi 1 thẻ được tự chấm điểm lần đầu, nó rời "new" và thuộc hẳn về `dueCards()`/`isDue()` (tab Ôn tập) khi tới lượt — dù đang ở bước học dở (`learning`), đang ôn lại sau khi quên (`relearning`), hay đã tốt nghiệp (`review`). Không có khái niệm thẻ "quay lại" tab Chủ đề.
- **2 giới hạn/ngày kiểu Anki, đều là giới hạn CỨNG** (không chỉ hiển thị): `newCardsRemainingToday()` (settings.newWordsPerDay, chặn `newCards()`) và `reviewsRemainingToday()` (settings.dailyGoal, CHỈ chặn thẻ state `"review"` — KHÔNG chặn learning/relearning, giống Anki không giới hạn hàng đợi Learning theo reviews/day). `todaysReviewBatch()` sắp thẻ theo mức độ quá hạn (dueAt/due càng nhỏ lên trước) trước khi cắt theo giới hạn.
- Thuật toán thuần hàm, không đụng DOM — an toàn để test/sửa độc lập với UI.
- Constants cấu hình (learningSteps, leechThreshold...) đọc từ `settings` trong state.js, không hardcode trong fsrs-formulas.js.

## UI Flow

- `core/app.js`: `switchTab(tab)` là router duy nhất — nhận key `topics`/`review`/`library`/`stats`/`settings` (khớp `data-tab` trong index.html), render lại `#main` bằng `renderTopics()/renderReviewTab()/renderLibrary()/renderStats()/renderSettings()` (mỗi hàm ở file feature tương ứng). Tab mặc định khi mở app là `review`.
- Tab Ôn tập ([js/features/review.js](js/features/review.js)): banner mở đầu (`.review-hero`) → 4 thẻ số liệu "Hôm nay" (`.today-stat-grid`: Từ cần ôn/Từ quá hạn (`overdueCards()`)/Từ yếu/Thời gian ước tính) → thẻ tiến độ (`.review-progress-row`: đã ôn/tổng hôm nay) → mẹo học tập xoay theo ngày (`.tip-banner`) → nút hành động lớn cuối trang (`.review-cta`, tự đổi "Bắt đầu ôn tập" ⇄ "Học từ mới" tuỳ có gì đến hạn không). CHỈ hiện số liệu THẬT có trong app — không có điểm thưởng/XP/streak-leaderboard. Retention/độ nhớ và Streak/Thời gian học chi tiết vẫn thuộc tab Thống kê (`.stat-cards`).
- Phiên học (từ tab Chủ đề hoặc Ôn tập) không đổi tab mà mở **overlay** `#studyOverlay` qua `startLearnSession(cards)` / `startReviewSession(cards)` trong [js/components/study-overlay.js](js/components/study-overlay.js) — phát âm (`speak`, `prefetchAudio`) tách riêng ở [js/components/study-audio.js](js/components/study-audio.js), nạp trước.
- Dialog/popup dùng chung ([js/components/dialog.js](js/components/dialog.js)), không tự viết modal riêng: `showDialog({...})` (thông báo + nút hành động), `showOptionDialog({...})` (chọn 1 trong nhiều lựa chọn), `showEditSettingDialog({...})` (nhập 1 giá trị). Cả 3 KHÔNG tự biết feature nào gọi mình — nơi gọi tự `renderXxx()` lại sau khi lưu qua callback (`onSelect`/`onSave`), không hardcode trong dialog.js.

## Quy ước code

- Không có build/transpile → chỉ viết JS chạy được thẳng trên trình duyệt (ES2020+, không TypeScript, không JSX).
- Comment đầu file theo format `/* ===== TÊN MODULE — mô tả ngắn. Depends on: ... ===== */` — giữ format này khi thêm file mới.
- UI text tiếng Việt, code (tên hàm/biến) tiếng Anh.
- Đặt file mới đúng tầng thư mục theo vai trò (core/services/algorithms/components/features) và **thêm `<script>` vào index.html theo đúng thứ tự phụ thuộc** — quên bước này là lỗi "X is not defined". CSS tương ứng thêm `<link>` cùng tên file, không nhất thiết theo thứ tự (CSS không có vấn đề "chưa định nghĩa" như JS, nhưng vẫn nên đặt gần khối cùng vai trò cho dễ tìm).
- **Không tạo thư mục con mới** ngoài 5 thư mục vai trò cố định (core/services/algorithms/components/features) và `css/` (luôn phẳng, không thư mục con). File to dần theo thời gian thì **tách thêm file MỚI cùng thư mục** (vd `fsrs.js` → `fsrs-formulas.js`/`fsrs-scheduler.js`/`fsrs-queries.js` trong `algorithms/`), không gom vào thư mục con.
- Trước khi thêm 1 tab/feature mới: tạo cả `js/features/<tên>.js` VÀ `css/<tên>.css` cùng lúc, cùng tên — giữ quy ước 1 tab = 1 cặp file JS+CSS dễ tìm.

## Các topic từ vựng hiện có

office, meetings, email, hr, banking — chi tiết prefix/ID tiếp theo xem bảng trong [data/README.md](data/README.md).
