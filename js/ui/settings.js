/* ============================================================
   TAB: SETTINGS — giao diện, mục tiêu học, bước học/ôn lại, leech, xóa tiến độ
   Depends on: core/*, app.js (mainEl, pageTitle, activeTab, switchTab, setTheme)
   ============================================================ */
function renderSettings(){
  pageTitle.textContent = 'Cài đặt';
  pageSub.textContent = 'Tùy chỉnh trải nghiệm học của bạn';
  mainEl.innerHTML = `
    <div class="settings-group">
      <div class="settings-row">
        <div><div class="s-label">Giao diện</div><div class="s-desc">Sáng hoặc tối</div></div>
        <div class="theme-switch">
          <button data-theme-opt="light" class="${settings.theme==='light'?'active':''}">☀️ Sáng</button>
          <button data-theme-opt="dark" class="${settings.theme==='dark'?'active':''}">🌙 Tối</button>
        </div>
      </div>
      <div class="settings-row">
        <div><div class="s-label">Từ mới mỗi ngày</div><div class="s-desc">Số từ mới muốn học</div></div>
        <div class="stepper"><button id="newMinus">−</button><div class="val" id="newVal">${settings.newWordsPerDay}</div><button id="newPlus">+</button></div>
      </div>
      <div class="settings-row">
        <div><div class="s-label">Giới hạn ôn tập/ngày</div><div class="s-desc">Số thẻ review tối đa mỗi ngày (giống Anki)</div></div>
        <div class="stepper"><button id="goalMinus">−</button><div class="val" id="goalVal">${settings.dailyGoal}</div><button id="goalPlus">+</button></div>
      </div>
    </div>

    <div class="section-label">Bước học / ôn lại (kiểu Anki)</div>
    <div class="settings-group">
      <div class="settings-row">
        <div><div class="s-label">Bước học từ mới</div><div class="s-desc">Phút, cách nhau dấu cách. VD: 1 10</div></div>
        <input class="mini-input" id="learningStepsInput" value="${settings.learningSteps.join(' ')}">
      </div>
      <div class="settings-row">
        <div><div class="s-label">Bước ôn lại khi quên</div><div class="s-desc">Phút, cách nhau dấu cách. VD: 10</div></div>
        <input class="mini-input" id="relearningStepsInput" value="${settings.relearningSteps.join(' ')}">
      </div>
      <div class="settings-row">
        <div><div class="s-label">Ngưỡng Leech</div><div class="s-desc">Số lần quên liên tiếp trước khi tự tạm khóa thẻ</div></div>
        <div class="stepper"><button id="leechMinus">−</button><div class="val" id="leechVal">${settings.leechThreshold}</div><button id="leechPlus">+</button></div>
      </div>
    </div>

    <div class="section-label">Dữ liệu</div>
    <div class="settings-group"><button class="danger-btn" id="resetBtn">Đặt lại toàn bộ tiến độ học</button></div>
    <div class="section-label">Về ứng dụng</div>
    <div class="settings-group"><div class="settings-row"><div class="s-desc">${TOPICS.length} chủ đề · ${ALL_CARDS.length} từ vựng · FSRS-6</div></div></div>
  `;

  document.querySelectorAll('[data-theme-opt]').forEach(b=> b.addEventListener('click', ()=>{ setTheme(b.dataset.themeOpt); renderSettings(); }));
  document.getElementById('newMinus').addEventListener('click', ()=>{ settings.newWordsPerDay=Math.max(5,settings.newWordsPerDay-5); storeSet('settings',settings); renderSettings(); });
  document.getElementById('newPlus').addEventListener('click', ()=>{ settings.newWordsPerDay=Math.min(50,settings.newWordsPerDay+5); storeSet('settings',settings); renderSettings(); });
  document.getElementById('goalMinus').addEventListener('click', ()=>{ settings.dailyGoal=Math.max(5,settings.dailyGoal-5); storeSet('settings',settings); renderSettings(); });
  document.getElementById('goalPlus').addEventListener('click', ()=>{ settings.dailyGoal=Math.min(200,settings.dailyGoal+5); storeSet('settings',settings); renderSettings(); });

  const parseSteps = (val, fallback)=>{
    const nums = val.split(/\s+/).map(Number).filter(n=>Number.isFinite(n) && n>0);
    return nums.length ? nums : fallback;
  };
  document.getElementById('learningStepsInput').addEventListener('change', (e)=>{
    settings.learningSteps = parseSteps(e.target.value, [1,10]);
    storeSet('settings',settings); renderSettings();
  });
  document.getElementById('relearningStepsInput').addEventListener('change', (e)=>{
    settings.relearningSteps = parseSteps(e.target.value, [10]);
    storeSet('settings',settings); renderSettings();
  });
  document.getElementById('leechMinus').addEventListener('click', ()=>{ settings.leechThreshold=Math.max(2,settings.leechThreshold-1); storeSet('settings',settings); renderSettings(); });
  document.getElementById('leechPlus').addEventListener('click', ()=>{ settings.leechThreshold=Math.min(20,settings.leechThreshold+1); storeSet('settings',settings); renderSettings(); });

  document.getElementById('resetBtn').addEventListener('click', ()=>{
    if(confirm('Xóa toàn bộ tiến độ học? Hành động này không thể hoàn tác.')){
      progress={}; reviewLog={}; reviewsDoneLog={}; newWordsLog={}; ratingLog={};
      storeSet('progress',progress); storeSet('reviewLog',reviewLog); storeSet('reviewsDoneLog',reviewsDoneLog);
      storeSet('newWordsLog',newWordsLog); storeSet('ratingLog',ratingLog);
      renderSettings();
    }
  });
}
