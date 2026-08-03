/* ============================================================
   TAB: LIBRARY — tìm kiếm/lọc toàn bộ từ vựng theo mức độ thuộc
   Depends on: core/*, data/vocabulary.js, app.js (mainEl, libraryFilter, librarySearch)
   ============================================================ */
function renderLibrary() {
  pageTitle.textContent = "Thư viện";
  pageSub.textContent = `${ALL_CARDS.length} từ vựng trong ${TOPICS.length} chủ đề`;
  const chips = [
    ["all", "Tất cả"],
    ["new", "Mới"],
    ["learning", "Đang học"],
    ["strong", "Khá tốt"],
    ["mastered", "Đã thuộc"],
    ["weak", "Yếu"],
    ["leech", "Leech"],
  ];
  const chipsHtml = chips
    .map(
      ([k, l]) =>
        `<button class="chip ${libraryFilter === k ? "active" : ""}" data-f="${k}">${l}</button>`,
    )
    .join("");

  let filtered = ALL_CARDS.filter((c) => {
    if (libraryFilter !== "all" && masteryTag(c) !== libraryFilter)
      return false;
    if (librarySearch) {
      const q = librarySearch.toLowerCase();
      if (!c.en.toLowerCase().includes(q) && !c.vi.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const groups = {};
  filtered.forEach((c) => {
    (groups[c.topicId] = groups[c.topicId] || []).push(c);
  });

  let listHtml = "";
  if (filtered.length === 0) {
    listHtml = `<div class="empty-state"><span class="emoji">🔎</span>Không tìm thấy từ nào phù hợp.</div>`;
  } else {
    listHtml = TOPICS.filter((t) => groups[t.id])
      .map((t) => {
        const rows = groups[t.id]
          .map((c) => {
            const tag = masteryTag(c);
            const meta = TAG_META[tag];
            return `
        <div class="word-row" data-id="${c.id}">
          <div class="w-head">
            <div class="w-dot" style="background:${t.color};"></div>
            <div class="w-en">${c.en} <span class="w-pos">(${c.pos})</span></div>
            <div class="w-state" style="color:${meta.color}; background:${meta.bg};">${meta.label}</div>
          </div>
          <div class="w-body">
            <div class="w-vi">${c.vi}</div>
            <div>${c.exEn}<br>${c.exVi}</div>
            ${tag === "leech" ? `<button class="btn-secondary" data-unsuspend="${c.id}" style="margin-top:10px;">🔓 Bỏ khóa, tiếp tục ôn</button>` : ""}
          </div>
        </div>`;
          })
          .join("");
        return `<div class="section-label">${t.icon} ${t.name}</div>${rows}`;
      })
      .join("");
  }

  mainEl.innerHTML = `
    <input class="search-input" id="librarySearch" placeholder="Tìm từ tiếng Anh hoặc nghĩa..." value="${librarySearch}">
    <div class="filter-chips">${chipsHtml}</div>
    ${listHtml}
  `;
  document.getElementById("librarySearch").addEventListener("input", (e) => {
    librarySearch = e.target.value;
    renderLibrary();
    document.getElementById("librarySearch").focus();
    document.getElementById("librarySearch").selectionStart =
      document.getElementById("librarySearch").value.length;
  });
  mainEl.querySelectorAll(".chip").forEach((b) =>
    b.addEventListener("click", () => {
      libraryFilter = b.dataset.f;
      renderLibrary();
    }),
  );
  mainEl.querySelectorAll(".word-row").forEach((el) => {
    el.querySelector(".w-head").addEventListener("click", () =>
      el.classList.toggle("open"),
    );
  });
  mainEl.querySelectorAll("[data-unsuspend]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      unsuspendCard(btn.dataset.unsuspend);
      renderLibrary();
    });
  });
}
