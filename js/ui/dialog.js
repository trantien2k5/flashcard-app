/* ============================================================
   DIALOG — popup xác nhận/thông báo dùng chung thay cho alert()/confirm() mặc định
   của trình duyệt, đồng bộ giao diện với phần còn lại của app.
   Depends on: không phụ thuộc gì khác, tự tạo & tự xóa DOM khi đóng.
   ============================================================ */
function showDialog({
  emoji = "",
  title = "",
  message = "",
  actions = null,
} = {}) {
  const acts =
    actions && actions.length ? actions : [{ label: "Đã hiểu", primary: true }];
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";
  backdrop.innerHTML = `
    <div class="dialog-card">
      ${emoji ? `<div class="emoji">${emoji}</div>` : ""}
      ${title ? `<h3>${title}</h3>` : ""}
      ${message ? `<p>${message}</p>` : ""}
      <div class="dialog-actions">
        ${acts.map((a, i) => `<button class="${a.primary ? "btn-primary" : "btn-secondary"}" data-idx="${i}">${a.label}</button>`).join("")}
      </div>
    </div>`;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelectorAll("[data-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = acts[Number(btn.dataset.idx)];
      close();
      if (action && action.onClick) action.onClick();
    });
  });
  return close;
}
