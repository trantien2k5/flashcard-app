/* ============================================================
   STUDY OVERLAY ENGINE — flashcard lật + tự đánh giá (Again/Hard/Good/Easy)
   kiểu Anki thật: thẻ learning/relearning quay lại đúng sau N phút thực.
   Dùng chung cho cả 2 tab Học & Ôn tập (chỉ khác nhãn + nguồn thẻ đầu vào).
   Depends on: core/*, services/vocabulary.js, algorithms/srs.js, core/app.js (activeTab, switchTab)
   ============================================================ */
const studyOverlay = document.getElementById("studyOverlay");
const studyContent = document.getElementById("studyContent");
const studyProgressFill = document.getElementById("studyProgressFill");
const studyCount = document.getElementById("studyCount");
const studyModeTag = document.getElementById("studyModeTag");
const studyTopicTag = document.getElementById("studyTopicTag");
document.getElementById("studyClose").addEventListener("click", closeStudy);

const posLabels = {
  n: "Danh từ",
  v: "Động từ",
  adj: "Tính từ",
  adv: "Trạng từ",
  pron: "Đại từ",
  prep: "Giới từ",
  conj: "Liên từ",
  int: "Thán từ"
};
const formatPos = (pos) => pos ? (posLabels[pos.toLowerCase()] || pos) : "";

let queue = []; // id các thẻ còn lại trong phiên (chưa "tốt nghiệp" về review)
let qTotalStart = 0; // tổng số thẻ lúc bắt đầu phiên, dùng tính thanh tiến trình
let touchedIds = new Set(); // id các thẻ đã được trả lời ít nhất 1 lần trong phiên (để thanh tiến trình không "đứng hình" khi thẻ còn đang trong bước học nhiều lượt)
let currentCardId = null;
let waitTimerId = null;

function updateProgressHeader() {
  const touched = touchedIds.size;
  studyProgressFill.style.width =
    Math.round((touched / qTotalStart) * 100) + "%";
  studyCount.textContent = `${touched}/${qTotalStart}`;
}

const audioCache = {};

function prefetchAudio(words) {
  words.forEach((word) => {
    const cleanWord = word.split("(")[0].trim();
    if (!audioCache[cleanWord]) {
      const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanWord)}&type=2`;
      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audioCache[cleanWord] = audio;
    }
  });
}

function fallbackSpeak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.88;
    speechSynthesis.speak(u);
  } catch (e) {}
}

function speak(text) {
  try {
    const cleanWord = text.split("(")[0].trim();
    let audio = audioCache[cleanWord];
    if (!audio) {
      const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanWord)}&type=2`;
      audio = new Audio(audioUrl);
      audioCache[cleanWord] = audio;
    }
    // Dừng tất cả âm thanh khác đang phát để tránh bị đè tiếng
    Object.values(audioCache).forEach((a) => {
      if (a !== audio) {
        a.pause();
        a.currentTime = 0;
      }
    });
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((e) => {
        fallbackSpeak(text);
      });
    }
  } catch (e) {
    fallbackSpeak(text);
  }
}
function clearWaitTimer() {
  if (waitTimerId) {
    clearInterval(waitTimerId);
    waitTimerId = null;
  }
}
function closeStudy() {
  try {
    speechSynthesis.cancel();
  } catch (e) {}
  clearWaitTimer();
  if (studyTopicTag) studyTopicTag.style.display = "none";
  studyOverlay.classList.remove("open");
  switchTab(activeTab);
}

function startLearnSession(cards) {
  startStudySession(cards, "Học từ mới");
}
function startReviewSession(cards) {
  startStudySession(cards, "Ôn tập chủ động");
}

function startStudySession(cards, label) {
  if (!cards || cards.length === 0) return;
  queue = shuffle(cards.map((c) => c.id));
  qTotalStart = queue.length;
  touchedIds = new Set();

  // Tải trước (preload) âm thanh chất lượng cao cho toàn bộ từ trong phiên học
  prefetchAudio(cards.map((c) => c.en));

  studyModeTag.textContent = label;
  studyOverlay.classList.add("open");
  advanceQueue();
}

/* Tìm thẻ tiếp theo đã sẵn sàng (không còn chờ bước phút); nếu chưa có thẻ nào
   sẵn sàng (đều đang đợi timer learning/relearning) thì hiện màn hình chờ. */
function advanceQueue() {
  clearWaitTimer();
  if (queue.length === 0) {
    renderComplete(`Bạn đã hoàn thành ${qTotalStart} thẻ trong phiên này.`);
    return;
  }
  const now = new Date();
  const readyId = queue.find((id) => {
    const st = getCardState(id);
    return !st.dueAt || new Date(st.dueAt) <= now;
  });
  if (!readyId) {
    updateProgressHeader();
    const soonest = queue
      .map(getCardState)
      .reduce((a, b) => (new Date(a.dueAt) < new Date(b.dueAt) ? a : b));
    renderWaiting(new Date(soonest.dueAt));
    return;
  }
  currentCardId = readyId;
  renderStudyCard();
}

function renderWaiting(untilDate) {
  if (studyTopicTag) studyTopicTag.style.display = "none";
  studyContent.innerHTML = `
    <div class="study-complete">
      <div class="emoji">⏳</div>
      <h2>Thẻ tiếp theo chưa sẵn sàng</h2>
      <p>Còn <b id="waitCountdown">--:--</b> nữa mới đến hạn xem lại (giống bước học ngắn trong Anki).<br>Bạn có thể chờ hoặc quay lại ôn sau.</p>
      <button class="btn-secondary" id="waitCloseBtn" style="max-width:220px;">Đóng, ôn sau</button>
    </div>`;
  document.getElementById("waitCloseBtn").addEventListener("click", closeStudy);
  const tick = () => {
    const ms = untilDate - new Date();
    if (ms <= 0) {
      advanceQueue();
      return;
    }
    const s = Math.ceil(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0"),
      ss = String(s % 60).padStart(2, "0");
    const el = document.getElementById("waitCountdown");
    if (el) el.textContent = `${mm}:${ss}`;
  };
  tick();
  waitTimerId = setInterval(tick, 1000);
}

function renderStudyCard() {
  const card = cardById(currentCardId);
  const topic = topicById(card.topicId);
  updateProgressHeader();
  if (studyTopicTag) {
    studyTopicTag.textContent = `${topic.icon} ${topic.name}`;
    studyTopicTag.style.display = "block";
  }

  studyContent.innerHTML = `
    <div class="study-body">
      <div class="card-stack">
        <div class="flip-card" id="flipCard">
          <div class="face front">
            <button class="speak-btn" id="speakFront">🔊</button>
            <div class="word">${card.en}</div>
            <div class="hint">Chạm để xem nghĩa</div>
          </div>
          <div class="face back">
            <button class="speak-btn" id="speakBack">🔊</button>
            <div class="back-word">${card.en}</div>
            <div class="back-meta">
              ${card.ipa ? `<span class="back-ipa">${card.ipa}</span>` : ""}
              ${card.pos ? `<span class="back-pos">${formatPos(card.pos)}</span>` : ""}
            </div>
            <div class="back-meaning">${card.vi}</div>
            <div class="back-example">
              <div class="ex-en">${card.exEn}</div>
              ${card.exVi ? `<div class="ex-vi">${card.exVi}</div>` : ""}
            </div>
          </div>
        </div>
      </div>
      <div class="study-actions">
        <div class="rate-hint" id="rateHint">Chạm vào thẻ để xem nghĩa</div>
        <div class="rate-row" id="rateRow" style="visibility:hidden;">
          <button class="rate-btn rate-again" data-r="again"><span class="lbl">Lại</span><span class="sub"></span></button>
          <button class="rate-btn rate-hard" data-r="hard"><span class="lbl">Khó</span><span class="sub"></span></button>
          <button class="rate-btn rate-good" data-r="good"><span class="lbl">Tốt</span><span class="sub"></span></button>
          <button class="rate-btn rate-easy" data-r="easy"><span class="lbl">Dễ</span><span class="sub"></span></button>
        </div>
      </div>
    </div>
  `;

  const flipEl = document.getElementById("flipCard");
  document.getElementById("speakFront").addEventListener("click", (e) => {
    e.stopPropagation();
    speak(card.en);
  });
  document.getElementById("speakBack").addEventListener("click", (e) => {
    e.stopPropagation();
    speak(card.en);
  });
  let revealed = false;
  flipEl.addEventListener("click", () => {
    flipEl.classList.toggle("flipped");
    if (revealed) return; // đã hiện đáp án + nút đánh giá rồi, chỉ lật qua lại để xem lại, không setup lại
    revealed = true;
    speak(card.en);
    document.getElementById("rateHint").textContent =
      "Bạn nhớ từ này tốt đến đâu?";
    const row = document.getElementById("rateRow");
    row.style.visibility = "visible";
    const preview = previewIntervals(currentCardId);
    row.querySelectorAll(".rate-btn").forEach((btn) => {
      btn.querySelector(".sub").textContent = preview[btn.dataset.r];
      btn.addEventListener("click", () => rateCurrentCard(btn.dataset.r), {
        once: true,
      });
    });
  });
}

function rateCurrentCard(rating) {
  const cardId = currentCardId;
  const wasNew = getCardState(cardId).state === "new";
  touchedIds.add(cardId);
  const st = scheduleCard(cardId, rating);
  if (wasNew) {
    const day = todayStr();
    newWordsLog[day] = (newWordsLog[day] || 0) + 1;
    storeSet("newWordsLog", newWordsLog);
  }
  if (st.state === "review") {
    const idx = queue.indexOf(cardId);
    if (idx > -1) queue.splice(idx, 1);
  }
  advanceQueue();
}

function renderComplete(message) {
  studyProgressFill.style.width = "100%";
  studyCount.textContent = `${qTotalStart}/${qTotalStart}`;
  if (studyTopicTag) studyTopicTag.style.display = "none";
  studyContent.innerHTML = `
    <div class="study-complete">
      <div class="emoji">🎉</div>
      <h2>Hoàn thành!</h2>
      <p>${message}</p>
      <button class="btn-primary" id="doneBtn" style="max-width:220px;">Xong</button>
    </div>`;
  document.getElementById("doneBtn").addEventListener("click", closeStudy);
}
