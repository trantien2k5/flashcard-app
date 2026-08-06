/* ============================================================
   STUDY AUDIO — phát âm từ vựng khi học/ôn: gọi API phát âm dict.youdao.com, cache
   theo (giọng, từ) để không tải lại, dự phòng bằng SpeechSynthesis của trình duyệt
   nếu API lỗi. Tách riêng khỏi study-overlay.js vì đây là 1 hệ con độc lập (không
   đụng tới hàng đợi phiên học), dùng bởi renderStudyCard() ở đó.
   Depends on: core/utils.js (clamp), core/state.js (settings)
   ============================================================ */
const audioCache = {};
/* dict.youdao.com/dictvoice: type=2 -> US, type=1 -> UK (API không chính thức, không có docs
   đảm bảo, nhưng khớp với hành vi mặc định trước đây của app khi còn hardcode type=2 = US). */
const VOICE_TYPE = { us: 2, uk: 1 };

function audioUrlFor(word, accent) {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${VOICE_TYPE[accent] || VOICE_TYPE.us}`;
}
function cacheKeyFor(word, accent) {
  return `${accent}:${word}`;
}

function prefetchAudio(words) {
  const accent = settings.voiceAccent || "us";
  words.forEach((word) => {
    const cleanWord = word.split("(")[0].trim();
    const key = cacheKeyFor(cleanWord, accent);
    if (!audioCache[key]) {
      const audio = new Audio(audioUrlFor(cleanWord, accent));
      audio.preload = "auto";
      audioCache[key] = audio;
    }
  });
}

/* audioCache sống ở module scope nên nếu không dọn sẽ phình to dần suốt vòng đời app
   (mỗi từng chạm qua là 1 Audio giữ mãi) — speak() lại duyệt toàn bộ cache này mỗi lần
   phát âm, cache càng to thì mỗi lần lật thẻ càng lag. Dọn về rỗng khi bắt đầu phiên mới
   để cache luôn chỉ chứa tối đa các từ của phiên hiện tại (≤ SESSION_MAX_CARDS). */
function resetAudioCache() {
  Object.values(audioCache).forEach((a) => {
    a.pause();
    a.src = "";
  });
  Object.keys(audioCache).forEach((k) => delete audioCache[k]);
}

function fallbackSpeak(text) {
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = settings.voiceAccent === "uk" ? "en-GB" : "en-US";
    u.rate = clamp(settings.speechRate || 1, 0.5, 2);
    speechSynthesis.speak(u);
  } catch (e) {}
}

function speak(text) {
  try {
    const cleanWord = text.split("(")[0].trim();
    const accent = settings.voiceAccent || "us";
    const key = cacheKeyFor(cleanWord, accent);
    let audio = audioCache[key];
    if (!audio) {
      audio = new Audio(audioUrlFor(cleanWord, accent));
      audioCache[key] = audio;
    }
    // Dừng tất cả âm thanh khác đang phát để tránh bị đè tiếng
    Object.values(audioCache).forEach((a) => {
      if (a !== audio) {
        a.pause();
        a.currentTime = 0;
      }
    });
    audio.currentTime = 0;
    audio.playbackRate = clamp(settings.speechRate || 1, 0.5, 2);
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
