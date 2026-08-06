/* ============================================================
   VOCABULARY SERVICE — load dữ liệu từ vựng từ data/*.json (xem data/README.md
   để biết cách thêm từ/chủ đề), build ALL_CARDS + truy vấn dùng chung.
   Depends on: không phụ thuộc gì khác. Phải gọi loadVocabulary() (await) trước
   khi TOPICS/ALL_CARDS có dữ liệu — core/app.js gọi việc này trong init().
   ============================================================ */
let TOPICS = [];
let ALL_CARDS = [];

/* File data/<id>.json chỉ chứa dữ liệu từ vựng thuần (id, name, words) — mọi thứ
   thuộc về TRÌNH BÀY (icon ký tự, tên tiếng Việt, màu) định nghĩa tập trung ở đây
   theo id chủ đề, không rải trong data. Thêm chủ đề mới mà chưa có trong các map
   dưới sẽ tự rơi về giá trị mặc định (emoji 📚, tên tiếng Anh gốc, màu xám trung tính). */
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
  meetings: "Họp & Thuyết trình",
  email: "Email",
  hr: "Nhân sự",
  banking: "Tài chính & Ngân hàng",
};
/* color: dùng cho badge/thanh tiến trình/chấm màu của chủ đề.
   container: nền nhạt (hiện chưa nơi nào dùng tới, giữ lại cho UI sau này). */
const TOPIC_COLOR = {
  office: { color: "#9334E6", container: "#F3E8FD" },
  meetings: { color: "#0284C7", container: "#E0F2FE" },
  email: { color: "#16A34A", container: "#DCFCE7" },
  hr: { color: "#EA580C", container: "#FFEDD5" },
  banking: { color: "#0D9488", container: "#CCFBF1" },
};
const TOPIC_COLOR_DEFAULT = { color: "#64748b", container: "#f1f5f9" };

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
    const colorMeta = TOPIC_COLOR[t.id] || TOPIC_COLOR_DEFAULT;
    t.color = colorMeta.color;
    t.container = colorMeta.container;
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

/* Đánh dấu vừa học/ôn 1 chủ đề — dùng để đẩy chủ đề gần đây lên đầu danh sách trong tab Chủ đề. */
function touchTopicRecency(topicId) {
  if (!topicId) return;
  topicRecency[topicId] = new Date().toISOString();
  storeSet("topicRecency", topicRecency);
}

/* Sắp xếp topics theo lần học/ôn gần nhất trước, chủ đề chưa từng đụng tới giữ nguyên thứ tự gốc. */
function topicsByRecency() {
  return [...TOPICS].sort((a, b) => {
    const ta = topicRecency[a.id] ? new Date(topicRecency[a.id]).getTime() : -1;
    const tb = topicRecency[b.id] ? new Date(topicRecency[b.id]).getTime() : -1;
    return tb - ta;
  });
}
