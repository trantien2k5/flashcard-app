/* ============================================================
   TAB: LIBRARY — tìm kiếm/lọc toàn bộ từ vựng theo mức độ thuộc
   Tối ưu hóa hiệu năng: Áp dụng phân trang động (Pagination/Lazy rendering)
   Hiển thị mặc định 30 từ đầu tiên, bấm "Xem thêm" tải tiếp 50 từ để tránh lag DOM.
   Depends on: core/*, services/*, algorithms/*, core/app.js (mainEl, libraryFilter, librarySearch, libraryLimit)
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

  const displayed = filtered.slice(0, libraryLimit);

  const groups = {};
  displayed.forEach((c) => {
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
            const st = getCardState(c.id);
            // Cấp độ dài hạn (Stability) tách khỏi trạng thái tức thời (Retrievability hôm
            // nay) — 1 từ có thể "Nhớ vững" lâu dài nhưng vẫn "Sắp quên" nếu lâu chưa ôn.
            let statsHtml = "";
            if ((st.state === "review" || st.state === "relearning") && !st.suspended) {
              const R = computeRetrievability(st);
              const statusMeta = MEMORY_STATUS_META[memoryStatus(c)];
              statsHtml = `
              <div class="w-stats">
                <span>S: ${st.stability < 1 ? "<1" : st.stability.toFixed(1)} ngày</span>
                <span>Khả năng nhớ: ${Math.round(R * 100)}%</span>
                <span style="color:${statusMeta.color};">${statusMeta.label}</span>
              </div>`;
            }
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
            ${statsHtml}
            ${tag === "leech" ? `<button class="btn-secondary" data-unsuspend="${c.id}" style="margin-top:10px;">🔓 Bỏ khóa, tiếp tục ôn</button>` : ""}
          </div>
        </div>`;
          })
          .join("");
        return `<div class="section-label">${t.icon} ${t.name}</div>${rows}`;
      })
      .join("");
  }

  let loadMoreHtml = "";
  if (filtered.length > libraryLimit) {
    loadMoreHtml = `
      <div style="text-align: center; margin: 20px 0 24px;">
        <button class="btn-secondary" id="btnLoadMore" style="max-width: 220px; margin: 0 auto; display: block;">Xem thêm (còn ${filtered.length - libraryLimit} từ)</button>
      </div>
    `;
  }

  mainEl.innerHTML = `
    <input class="search-input" id="librarySearch" placeholder="Tìm từ tiếng Anh hoặc nghĩa..." value="${librarySearch}">
    <div class="filter-chips">${chipsHtml}</div>
    ${listHtml}
    ${loadMoreHtml}
  `;

  // Focus and restore cursor position at the end of text
  const searchInput = document.getElementById("librarySearch");
  if (searchInput) {
    if (librarySearch) {
      searchInput.focus();
      searchInput.setSelectionRange(librarySearch.length, librarySearch.length);
    }
  }

  searchInput.addEventListener("input", (e) => {
    librarySearch = e.target.value;
    libraryLimit = 30; // reset limit when searching
    renderLibrary();
    // Re-focus after render
    const input = document.getElementById("librarySearch");
    if (input) {
      input.focus();
      input.setSelectionRange(librarySearch.length, librarySearch.length);
    }
  });

  mainEl.querySelectorAll(".chip").forEach((b) =>
    b.addEventListener("click", () => {
      libraryFilter = b.dataset.f;
      libraryLimit = 30; // reset limit when filter changes
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

  const loadMoreBtn = document.getElementById("btnLoadMore");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      libraryLimit += 50; // load next 50 words
      renderLibrary();
    });
  }
}
