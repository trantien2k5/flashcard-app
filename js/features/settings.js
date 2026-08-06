/* ============================================================
   TAB: SETTINGS — tối giản, mỗi dòng 1 icon + nhãn + giá trị, gộp theo nhóm.
   Depends on: core/*, services/storage.js, core/app.js (mainEl, applyTheme, setTheme),
               components/dialog.js (showDialog, showOptionDialog, showEditSettingDialog)
   ============================================================ */
const APP_VERSION = "1.0.0";
const THEME_LABEL = { light: "Sáng", dark: "Tối", system: "Hệ thống" };
const ACCENT_LABEL = { us: "US", uk: "UK" };
const RATE_LABEL = { 0.75: "0.75×", 1: "1.0×", 1.25: "1.25×", 1.5: "1.5×" };

/* ---- Xuất / nhập toàn bộ dữ liệu ra 1 file JSON ---- */
function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    progress,
    reviewLog,
    reviewsDoneLog,
    newWordsLog,
    ratingLog,
    topicRecency,
    settings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vocab-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importDataFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (e) {
      alert("File không hợp lệ — không đọc được JSON.");
      return;
    }
    progress = data.progress || {};
    reviewLog = data.reviewLog || {};
    reviewsDoneLog = data.reviewsDoneLog || {};
    newWordsLog = data.newWordsLog || {};
    ratingLog = data.ratingLog || {};
    topicRecency = data.topicRecency || {};
    settings = { ...settings, ...(data.settings || {}) };
    Promise.all([
      storeSet("progress", progress),
      storeSet("reviewLog", reviewLog),
      storeSet("reviewsDoneLog", reviewsDoneLog),
      storeSet("newWordsLog", newWordsLog),
      storeSet("ratingLog", ratingLog),
      storeSet("topicRecency", topicRecency),
      storeSet("settings", settings),
    ]).then(() => location.reload());
  };
  reader.readAsText(file);
}

function renderSettings() {
  pageTitle.textContent = "Cài đặt";
  pageSub.textContent = "";
  mainEl.innerHTML = `
    <div class="section-label">Học tập</div>
    <div class="settings-group">
      <div class="settings-row clickable-row" id="rowNewWords">
        <div class="s-label"><span class="row-icon">🎯</span> Mục tiêu mỗi ngày</div>
        <div class="row-right"><div class="s-val-badge">${settings.newWordsPerDay} từ</div><div class="row-chevron">›</div></div>
      </div>
      <div class="settings-row clickable-row" id="rowAutoSpeak">
        <div class="s-label"><span class="row-icon">🔊</span> Tự động phát âm</div>
        <div class="toggle-switch ${settings.autoSpeak ? "on" : ""}" id="autoSpeakToggle"><div class="knob"></div></div>
      </div>
    </div>

    <div class="section-label">Âm thanh</div>
    <div class="settings-group">
      <div class="settings-row clickable-row" id="rowVoice">
        <div class="s-label"><span class="row-icon">🗣</span> Giọng đọc</div>
        <div class="row-right"><div class="s-val-badge">${ACCENT_LABEL[settings.voiceAccent] || "US"}</div><div class="row-chevron">›</div></div>
      </div>
      <div class="settings-row clickable-row" id="rowSpeed">
        <div class="s-label"><span class="row-icon">🔉</span> Tốc độ</div>
        <div class="row-right"><div class="s-val-badge">${RATE_LABEL[settings.speechRate] || `${settings.speechRate}×`}</div><div class="row-chevron">›</div></div>
      </div>
    </div>

    <div class="section-label">Giao diện</div>
    <div class="settings-group">
      <div class="settings-row clickable-row" id="rowTheme">
        <div class="s-label"><span class="row-icon">🌙</span> Chủ đề</div>
        <div class="row-right"><div class="s-val-badge">${THEME_LABEL[settings.theme] || "Hệ thống"}</div><div class="row-chevron">›</div></div>
      </div>
    </div>

    <div class="section-label">Dữ liệu</div>
    <div class="settings-group">
      <div class="settings-row clickable-row" id="rowExport">
        <div class="s-label"><span class="row-icon">📤</span> Xuất dữ liệu</div>
        <div class="row-right"><div class="row-chevron">›</div></div>
      </div>
      <div class="settings-row clickable-row" id="rowImport">
        <div class="s-label"><span class="row-icon">📥</span> Nhập dữ liệu</div>
        <div class="row-right"><div class="row-chevron">›</div></div>
      </div>
      <div class="settings-row clickable-row" id="rowReset">
        <div class="s-label" style="color:var(--danger);"><span class="row-icon">🗑</span> Đặt lại tiến độ</div>
        <div class="row-right"><div class="row-chevron">›</div></div>
      </div>
    </div>
    <input type="file" id="importFileInput" accept="application/json" style="display:none;">

    <div class="section-label">Thông tin</div>
    <div class="settings-group">
      <div class="settings-row clickable-row" id="rowHelp">
        <div class="s-label"><span class="row-icon">❓</span> Hướng dẫn</div>
        <div class="row-right"><div class="row-chevron">›</div></div>
      </div>
      <div class="settings-row">
        <div class="s-label"><span class="row-icon">ℹ️</span> Phiên bản</div>
        <div class="row-right"><div class="s-val-badge">${APP_VERSION}</div></div>
      </div>
    </div>
  `;

  document.getElementById("rowNewWords").addEventListener("click", () => {
    showEditSettingDialog({
      title: "Mục tiêu mỗi ngày",
      desc: "Số từ mới muốn học mỗi ngày (từ 5 đến 100 từ)",
      inputType: "number",
      value: settings.newWordsPerDay,
      onSave: (val) => {
        const num = Number(val);
        if (Number.isInteger(num) && num >= 5 && num <= 100) {
          settings.newWordsPerDay = num;
          storeSet("settings", settings);
          renderSettings();
          return true;
        }
        alert("Vui lòng nhập số nguyên hợp lệ từ 5 đến 100.");
        return false;
      },
    });
  });

  document.getElementById("rowAutoSpeak").addEventListener("click", () => {
    settings.autoSpeak = !settings.autoSpeak;
    storeSet("settings", settings);
    renderSettings();
  });

  document.getElementById("rowVoice").addEventListener("click", () => {
    showOptionDialog({
      title: "Giọng đọc",
      value: settings.voiceAccent,
      options: [
        { value: "us", label: "🇺🇸 US — Giọng Mỹ" },
        { value: "uk", label: "🇬🇧 UK — Giọng Anh" },
      ],
      onSelect: (v) => {
        settings.voiceAccent = v;
        storeSet("settings", settings);
        renderSettings();
      },
    });
  });

  document.getElementById("rowSpeed").addEventListener("click", () => {
    showOptionDialog({
      title: "Tốc độ phát âm",
      value: settings.speechRate,
      options: [0.75, 1.0, 1.25, 1.5].map((v) => ({
        value: v,
        label: `${v}×`,
      })),
      onSelect: (v) => {
        settings.speechRate = v;
        storeSet("settings", settings);
        renderSettings();
      },
    });
  });

  document.getElementById("rowTheme").addEventListener("click", () => {
    showOptionDialog({
      title: "Chủ đề",
      value: settings.theme,
      options: [
        { value: "light", label: "☀️ Sáng" },
        { value: "dark", label: "🌙 Tối" },
        { value: "system", label: "💻 Hệ thống" },
      ],
      onSelect: (v) => {
        setTheme(v);
        renderSettings();
      },
    });
  });

  document.getElementById("rowExport").addEventListener("click", exportData);

  const importInput = document.getElementById("importFileInput");
  document.getElementById("rowImport").addEventListener("click", () => {
    if (
      confirm(
        "Nhập dữ liệu sẽ GHI ĐÈ toàn bộ tiến độ hiện tại bằng nội dung trong file. Tiếp tục?",
      )
    ) {
      importInput.click();
    }
  });
  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    if (file) importDataFromFile(file);
  });

  document.getElementById("rowReset").addEventListener("click", () => {
    if (confirm("Xóa toàn bộ tiến độ học? Hành động này không thể hoàn tác.")) {
      progress = {};
      reviewLog = {};
      reviewsDoneLog = {};
      newWordsLog = {};
      ratingLog = {};
      topicRecency = {};
      storeSet("progress", progress);
      storeSet("reviewLog", reviewLog);
      storeSet("reviewsDoneLog", reviewsDoneLog);
      storeSet("newWordsLog", newWordsLog);
      storeSet("ratingLog", ratingLog);
      storeSet("topicRecency", topicRecency);
      renderSettings();
    }
  });

  document.getElementById("rowHelp").addEventListener("click", () => {
    showDialog({
      emoji: "❓",
      title: "Hướng dẫn nhanh",
      message: `<b>Chủ đề</b>: học từ mới theo chủ đề, đánh giá Lại/Khó/Tốt/Dễ sau khi xem nghĩa.<br><br>
      <b>Ôn tập</b>: ôn lại từ đã học đến hạn (SRS FSRS-6) để nhớ lâu dài.<br><br>
      <b>Thư viện</b>: tra cứu, lọc theo mức độ thuộc.<br><br>
      <b>Thống kê</b>: theo dõi chuỗi ngày học và thống kê.`,
    });
  });
}
