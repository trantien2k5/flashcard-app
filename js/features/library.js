/* ============================================================
   TAB: LIBRARY — tìm kiếm/lọc toàn bộ từ vựng theo mức độ thuộc
   Phân trang cố định 20 từ/trang (đánh số 1 2 3...) thay vì "xem thêm" — dễ nhảy
   tới trang bất kỳ khi có tới hàng trăm từ ở bộ lọc "Tất cả". Bộ lọc mức độ thuộc
   dùng menu xổ xuống (native <select>) thay vì hàng chip cuộn ngang cho gọn.
   Depends on: core/*, services/*, algorithms/*, core/app.js (mainEl, libraryFilter, librarySearch, libraryPage)
   ============================================================ */
const LIBRARY_PAGE_SIZE = 20;

/* Danh sách số trang kiểu "1 … 4 5 6 … 42" — hiện đủ khi ít trang, rút gọn bằng
   dấu "…" quanh trang hiện tại khi nhiều trang, tránh tràn hàng trên màn hình hẹp. */
function buildPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [1];
  if (current > 3) pages.push("…");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

/* Ngày ôn tiếp theo CỤ THỂ cho 1 từ đã vào lịch ôn (review/relearning):
   - review     : st.due là ngày (YYYY-MM-DD) — hiện dd/mm/yyyy + nhãn tương đối.
   - relearning : st.dueAt là mốc giờ:phút trong bước ôn lại ngắn hạn — hiện giờ:phút,
     kèm ngày nếu vô tình lệch sang ngày khác (relearningSteps cấu hình dài bất thường). */
function formatNextReviewLabel(st) {
  if (st.state === "relearning" && st.dueAt) {
    const t = new Date(st.dueAt);
    const hhmm = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
    return todayStr(t) === todayStr() ? `${hhmm} hôm nay` : `${formatDateVi(todayStr(t))} ${hhmm}`;
  }
  const dateLabel = formatDateVi(st.due);
  const dayDiff = Math.round(
    (new Date(st.due + "T00:00:00") - new Date(todayStr() + "T00:00:00")) /
      86400000,
  );
  if (dayDiff <= 0) return `${dateLabel} (đến hạn)`;
  if (dayDiff === 1) return `${dateLabel} (ngày mai)`;
  return `${dateLabel} (còn ${dayDiff} ngày)`;
}

function renderLibrary() {
  pageTitle.textContent = "Thư viện";
  pageSub.textContent = `${ALL_CARDS.length} từ vựng trong ${TOPICS.length} chủ đề`;

  // Đếm số từ theo TỪNG mức độ thuộc trên toàn bộ thư viện (không phụ thuộc ô tìm
  // kiếm) — hiện kèm số lượng ngay trong option để biết trước "Đang học" có bao
  // nhiêu từ mà không cần chọn thử.
  const filterCounts = {
    all: ALL_CARDS.length,
    new: 0,
    learning: 0,
    strong: 0,
    mastered: 0,
    weak: 0,
    leech: 0,
  };
  ALL_CARDS.forEach((c) => filterCounts[masteryTag(c)]++);

  const filterOptions = [
    ["all", "Tất cả"],
    ["new", "Mới"],
    ["learning", "Đang học"],
    ["strong", "Khá tốt"],
    ["mastered", "Đã thuộc"],
    ["weak", "Yếu"],
    ["leech", "Leech"],
  ];
  const filterSelectHtml = `
    <select class="filter-select" id="libraryFilterSelect">
      ${filterOptions
        .map(
          ([k, l]) =>
            `<option value="${k}" ${libraryFilter === k ? "selected" : ""}>${l} (${filterCounts[k]})</option>`,
        )
        .join("")}
    </select>
  `;

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIBRARY_PAGE_SIZE));
  libraryPage = clamp(libraryPage, 1, totalPages);
  const displayed = filtered.slice(
    (libraryPage - 1) * LIBRARY_PAGE_SIZE,
    libraryPage * LIBRARY_PAGE_SIZE,
  );

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
                <span>Ôn tiếp: ${formatNextReviewLabel(st)}</span>
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

  let paginationHtml = "";
  if (totalPages > 1) {
    const numsHtml = buildPageNumbers(libraryPage, totalPages)
      .map((p) =>
        p === "…"
          ? `<span class="page-ellipsis">…</span>`
          : `<button class="page-btn ${p === libraryPage ? "active" : ""}" data-page="${p}">${p}</button>`,
      )
      .join("");
    paginationHtml = `
      <div class="pagination">
        <button class="page-btn" id="pagePrev" ${libraryPage === 1 ? "disabled" : ""} aria-label="Trang trước">‹</button>
        ${numsHtml}
        <button class="page-btn" id="pageNext" ${libraryPage === totalPages ? "disabled" : ""} aria-label="Trang sau">›</button>
      </div>
    `;
  }

  mainEl.innerHTML = `
    <input class="search-input" id="librarySearch" placeholder="Tìm từ tiếng Anh hoặc nghĩa..." value="${librarySearch}">
    ${filterSelectHtml}
    ${listHtml}
    ${paginationHtml}
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
    libraryPage = 1; // reset về trang đầu khi đổi từ khóa tìm kiếm
    renderLibrary();
    // Re-focus after render
    const input = document.getElementById("librarySearch");
    if (input) {
      input.focus();
      input.setSelectionRange(librarySearch.length, librarySearch.length);
    }
  });

  document.getElementById("libraryFilterSelect").addEventListener("change", (e) => {
    libraryFilter = e.target.value;
    libraryPage = 1; // reset về trang đầu khi đổi bộ lọc
    renderLibrary();
  });

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

  const goToPage = (p) => {
    libraryPage = p;
    renderLibrary();
    window.scrollTo({ top: 0 });
  };
  mainEl.querySelectorAll(".page-btn[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => goToPage(parseInt(btn.dataset.page, 10)));
  });
  const pagePrev = document.getElementById("pagePrev");
  if (pagePrev)
    pagePrev.addEventListener("click", () => goToPage(Math.max(1, libraryPage - 1)));
  const pageNext = document.getElementById("pageNext");
  if (pageNext)
    pageNext.addEventListener("click", () =>
      goToPage(Math.min(totalPages, libraryPage + 1)),
    );
}
