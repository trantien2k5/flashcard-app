/* ============================================================
   VOCABULARY SERVICE — load dữ liệu từ vựng từ data/*.json (xem data/README.md
   để biết cách thêm từ/chủ đề), build ALL_CARDS + truy vấn dùng chung.
   Depends on: không phụ thuộc gì khác. Phải gọi loadVocabulary() (await) trước
   khi TOPICS/ALL_CARDS có dữ liệu — core/app.js gọi việc này trong init().
   ============================================================ */
let TOPICS = [];
let ALL_CARDS = [];

/* Data chỉ có tên icon Material (vd "work"), app dùng emoji như bản cũ nên
   map thủ công theo id chủ đề ở đây. Thêm chủ đề mới mà chưa có trong map
   sẽ tự rơi về emoji mặc định. */
const TOPIC_EMOJI = {
  office: "🏢",
  meetings: "🗓️",
  email: "✉️",
  hr: "🧑‍💼",
  banking: "🏦",
};
/* Tên chủ đề trong data đang là tiếng Anh dài (vd "Email & Business
   Correspondence") — app hiển thị tên tiếng Việt ngắn gọn ở đây. Chủ đề mới
   chưa có trong map sẽ tạm dùng nguyên tên tiếng Anh từ data. */
const TOPIC_NAME_VI = {
  office: "Văn phòng",
  meetings: "Họp hành",
  email: "Email",
  hr: "Nhân sự",
  banking: "Ngân hàng",
};

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Không tải được ${path}: ${res.status}`);
  return res.json();
}

async function loadVocabulary() {
  const topicIds = await fetchJSON("data/index.json");
  const topics = await Promise.all(
    topicIds.map((id) => fetchJSON(`data/${id}.json`)),
  );
  TOPICS = topics;
  ALL_CARDS = [];
  TOPICS.forEach((t) => {
    t.icon = TOPIC_EMOJI[t.id] || "📚";
    t.name = TOPIC_NAME_VI[t.id] || t.name;
    t.cardObjs = t.words.map((w) => {
      const obj = {
        id: w.id,
        topicId: t.id,
        en: w.en,
        vi: w.vi,
        exEn: w.ex,
        exVi: "",
        ipa: w.ipa || "",
        pos: w.pos || "",
      };
      ALL_CARDS.push(obj);
      return obj;
    });
  });
}

function cardById(id) {
  return ALL_CARDS.find((c) => c.id === id);
}
function topicById(id) {
  return TOPICS.find((t) => t.id === id);
}
