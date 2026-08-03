/* ============================================================
   STORAGE — lưu bền bằng localStorage của trình duyệt (còn nguyên
   sau khi tải lại trang / đóng mở lại trình duyệt). Nếu môi trường
   có sẵn API window.storage riêng (một số sandbox đặc biệt) thì ưu
   tiên dùng cái đó; memoryStore chỉ là phương án cuối cùng khi cả
   hai đều không dùng được (vd trình duyệt chặn localStorage).
   ============================================================ */
const STORAGE_PREFIX = "vocab-app:";
const memoryStore = {};

function hasCustomStorage() {
  return (
    typeof window !== "undefined" &&
    window.storage &&
    typeof window.storage.get === "function"
  );
}

async function storeGet(key) {
  if (hasCustomStorage()) {
    try {
      const r = await window.storage.get(key, false);
      return r ? JSON.parse(r.value) : null;
    } catch (e) {
      /* rơi xuống localStorage */
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw != null ? JSON.parse(raw) : null;
  } catch (e) {
    return memoryStore[key] ?? null;
  }
}

async function storeSet(key, value) {
  memoryStore[key] = value;
  if (hasCustomStorage()) {
    try {
      await window.storage.set(key, JSON.stringify(value), false);
      return;
    } catch (e) {
      /* rơi xuống localStorage */
    }
  }
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    /* hết quota / bị chặn — vẫn còn memoryStore trong phiên này */
  }
}
