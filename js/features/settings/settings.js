/* ============================================================
   TAB: SETTINGS — giao diện, mục tiêu học, bước học/ôn lại, leech, xóa tiến độ
   Tối ưu hóa: Bấm vào dòng thiết lập sẽ hiện popup chỉnh sửa chuyên nghiệp.
   Depends on: core/*, services/storage.js, core/app.js (mainEl, pageTitle, activeTab, switchTab, setTheme)
   ============================================================ */
function showEditSettingDialog({ title, desc, inputType, value, onSave }) {
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";
  
  const inputAttr = inputType === "number" 
    ? 'type="number" pattern="[0-9]*" inputmode="numeric"' 
    : 'type="text"';

  backdrop.innerHTML = `
    <div class="dialog-card">
      <h3>${title}</h3>
      <p style="margin-bottom: 16px; font-size:13px; color:var(--ink-soft);">${desc}</p>
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
  
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  
  backdrop.querySelector("#settingCancelBtn").addEventListener("click", close);
  
  backdrop.querySelector("#settingSaveBtn").addEventListener("click", () => {
    const rawVal = inputEl.value.trim();
    if (onSave(rawVal)) {
      close();
      renderSettings();
    }
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const rawVal = inputEl.value.trim();
      if (onSave(rawVal)) {
        close();
        renderSettings();
      }
    } else if (e.key === "Escape") {
      close();
    }
  });
}

function renderSettings() {
  pageTitle.textContent = "Cài đặt";
  pageSub.textContent = "Tùy chỉnh trải nghiệm học của bạn";
  mainEl.innerHTML = `
    <div class="settings-group">
      <div class="settings-row">
        <div><div class="s-label">Giao diện</div><div class="s-desc">Sáng hoặc tối</div></div>
        <div class="theme-switch">
          <button data-theme-opt="light" class="${settings.theme === "light" ? "active" : ""}">☀️ Sáng</button>
          <button data-theme-opt="dark" class="${settings.theme === "dark" ? "active" : ""}">🌙 Tối</button>
        </div>
      </div>
      <div class="settings-row clickable-row" id="rowNewWords">
        <div><div class="s-label">Từ mới mỗi ngày</div><div class="s-desc">Số từ mới muốn học mỗi ngày</div></div>
        <div class="s-val-badge">${settings.newWordsPerDay} từ</div>
      </div>
      <div class="settings-row clickable-row" id="rowDailyGoal">
        <div><div class="s-label">Giới hạn ôn tập/ngày</div><div class="s-desc">Số thẻ review tối đa mỗi ngày (giống Anki)</div></div>
        <div class="s-val-badge">${settings.dailyGoal} thẻ</div>
      </div>
    </div>

    <div class="section-label">Bước học / ôn lại (kiểu Anki)</div>
    <div class="settings-group">
      <div class="settings-row clickable-row" id="rowLearningSteps">
        <div><div class="s-label">Bước học từ mới</div><div class="s-desc">Phút, cách nhau dấu cách. VD: 1 10</div></div>
        <div class="s-val-badge">${settings.learningSteps.join(" ")}m</div>
      </div>
      <div class="settings-row clickable-row" id="rowRelearningSteps">
        <div><div class="s-label">Bước ôn lại khi quên</div><div class="s-desc">Phút, cách nhau dấu cách. VD: 10</div></div>
        <div class="s-val-badge">${settings.relearningSteps.join(" ")}m</div>
      </div>
      <div class="settings-row clickable-row" id="rowLeechThreshold">
        <div><div class="s-label">Ngưỡng Leech</div><div class="s-desc">Số lần quên liên tiếp trước khi tự tạm khóa thẻ</div></div>
        <div class="s-val-badge">${settings.leechThreshold} lần</div>
      </div>
    </div>

    <div class="section-label">Dữ liệu</div>
    <div class="settings-group"><button class="danger-btn" id="resetBtn">Đặt lại toàn bộ tiến độ học</button></div>
    <div class="section-label">Về ứng dụng</div>
    <div class="settings-group"><div class="settings-row"><div class="s-desc">${TOPICS.length} chủ đề · ${ALL_CARDS.length} từ vựng · FSRS-6</div></div></div>
  `;

  document.querySelectorAll("[data-theme-opt]").forEach((b) =>
    b.addEventListener("click", () => {
      setTheme(b.dataset.themeOpt);
      renderSettings();
    }),
  );

  document.getElementById("rowNewWords").addEventListener("click", () => {
    showEditSettingDialog({
      title: "Từ mới mỗi ngày",
      desc: "Nhập số lượng từ mới bạn muốn học mỗi ngày (từ 5 đến 100 từ)",
      inputType: "number",
      value: settings.newWordsPerDay,
      onSave: (val) => {
        const num = Number(val);
        if (Number.isInteger(num) && num >= 5 && num <= 100) {
          settings.newWordsPerDay = num;
          storeSet("settings", settings);
          return true;
        }
        alert("Vui lòng nhập số nguyên hợp lệ từ 5 đến 100.");
        return false;
      }
    });
  });

  document.getElementById("rowDailyGoal").addEventListener("click", () => {
    showEditSettingDialog({
      title: "Giới hạn ôn tập/ngày",
      desc: "Nhập giới hạn số lượng thẻ ôn tập tối đa mỗi ngày (từ 5 đến 500 thẻ)",
      inputType: "number",
      value: settings.dailyGoal,
      onSave: (val) => {
        const num = Number(val);
        if (Number.isInteger(num) && num >= 5 && num <= 500) {
          settings.dailyGoal = num;
          storeSet("settings", settings);
          return true;
        }
        alert("Vui lòng nhập số nguyên hợp lệ từ 5 đến 500.");
        return false;
      }
    });
  });

  const parseSteps = (val, fallback) => {
    const nums = val
      .split(/\s+/)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0);
    return nums.length ? nums : fallback;
  };

  document.getElementById("rowLearningSteps").addEventListener("click", () => {
    showEditSettingDialog({
      title: "Bước học từ mới",
      desc: "Nhập các bước học theo phút, cách nhau bằng dấu cách (Ví dụ: 1 10)",
      inputType: "text",
      value: settings.learningSteps.join(" "),
      onSave: (val) => {
        const steps = parseSteps(val, null);
        if (steps) {
          settings.learningSteps = steps;
          storeSet("settings", settings);
          return true;
        }
        alert("Bước học không hợp lệ. Vui lòng nhập số phút cách nhau bằng dấu cách.");
        return false;
      }
    });
  });

  document.getElementById("rowRelearningSteps").addEventListener("click", () => {
    showEditSettingDialog({
      title: "Bước ôn lại khi quên",
      desc: "Nhập các bước ôn lại theo phút, cách nhau bằng dấu cách (Ví dụ: 10)",
      inputType: "text",
      value: settings.relearningSteps.join(" "),
      onSave: (val) => {
        const steps = parseSteps(val, null);
        if (steps) {
          settings.relearningSteps = steps;
          storeSet("settings", settings);
          return true;
        }
        alert("Bước ôn lại không hợp lệ. Vui lòng nhập số phút cách nhau bằng dấu cách.");
        return false;
      }
    });
  });

  document.getElementById("rowLeechThreshold").addEventListener("click", () => {
    showEditSettingDialog({
      title: "Ngưỡng Leech",
      desc: "Số lần quên liên tiếp trước khi tự động khóa thẻ (từ 2 đến 20 lần)",
      inputType: "number",
      value: settings.leechThreshold,
      onSave: (val) => {
        const num = Number(val);
        if (Number.isInteger(num) && num >= 2 && num <= 20) {
          settings.leechThreshold = num;
          storeSet("settings", settings);
          return true;
        }
        alert("Vui lòng nhập số nguyên hợp lệ từ 2 đến 20.");
        return false;
      }
    });
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Xóa toàn bộ tiến độ học? Hành động này không thể hoàn tác.")) {
      progress = {};
      reviewLog = {};
      reviewsDoneLog = {};
      newWordsLog = {};
      ratingLog = {};
      storeSet("progress", progress);
      storeSet("reviewLog", reviewLog);
      storeSet("reviewsDoneLog", reviewsDoneLog);
      storeSet("newWordsLog", newWordsLog);
      storeSet("ratingLog", ratingLog);
      renderSettings();
    }
  });
}
