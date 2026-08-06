/* ============================================================
   DIALOG — mọi popup xác nhận/thông báo/chọn lựa/nhập liệu dùng chung thay cho
   alert()/confirm()/prompt() mặc định của trình duyệt, đồng bộ giao diện với phần
   còn lại của app. 3 biến thể: showDialog (thông báo + tối đa vài nút hành động),
   showOptionDialog (chọn 1 trong nhiều lựa chọn rời rạc), showEditSettingDialog
   (nhập 1 giá trị). KHÔNG tự biết về feature nào gọi mình (không hardcode tên hàm
   renderXxx) — nơi gọi tự lo việc re-render sau khi lưu, qua callback riêng.
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

/* Popup chọn 1 trong nhiều lựa chọn rời rạc (theme, giọng đọc, tốc độ...), dùng lại
   showDialog() sẵn có thay vì tự vẽ dropdown riêng. */
function showOptionDialog({ title, options, value, onSelect }) {
  showDialog({
    title,
    actions: options.map((opt) => ({
      label: opt.value === value ? `✓ ${opt.label}` : opt.label,
      primary: opt.value === value,
      onClick: () => onSelect(opt.value),
    })),
  });
}

/* Popup nhập 1 giá trị (số/chữ). onSave(rawVal) tự quyết định hợp lệ hay không (trả
   về true/false) VÀ tự lo việc re-render lại màn hình gọi mình sau khi lưu thành
   công — dialog chỉ đóng popup, không tự gọi renderXxx() của bất kỳ feature nào. */
function showEditSettingDialog({ title, desc, inputType, value, onSave }) {
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";

  const inputAttr =
    inputType === "number"
      ? 'type="number" pattern="[0-9]*" inputmode="numeric"'
      : 'type="text"';

  backdrop.innerHTML = `
    <div class="dialog-card">
      <h3>${title}</h3>
      ${desc ? `<p style="margin-bottom: 16px; font-size:13px; color:var(--ink-soft);">${desc}</p>` : ""}
      <div style="margin-bottom: 20px;">
        <input class="search-input" id="settingInput" ${inputAttr} value="${value}" style="text-align: center; margin-top: 0; width: 100%;">
      </div>
      <div class="dialog-actions">
        <button class="btn-primary" id="settingSaveBtn">Lưu</button>
        <button class="btn-secondary" id="settingCancelBtn">Hủy</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const inputEl = backdrop.querySelector("#settingInput");
  inputEl.focus();
  inputEl.select();

  const close = () => backdrop.remove();
  const trySave = () => {
    const rawVal = inputEl.value.trim();
    if (onSave(rawVal)) close();
  };

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector("#settingCancelBtn").addEventListener("click", close);
  backdrop.querySelector("#settingSaveBtn").addEventListener("click", trySave);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") trySave();
    else if (e.key === "Escape") close();
  });
}
