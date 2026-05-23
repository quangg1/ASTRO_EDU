/**
 * DEMO ONLY — chạy trong DevTools Console trên trang decoration (vd. avatardecoration.com).
 * Cuộn để lazy-load hết → gom URL overlay → tải PNG/WebP/GIF (không tải avatar/wumpus).
 *
 * Cách dùng:
 * 1. Mở trang, tab Console (F12)
 * 2. Dán toàn bộ file này, Enter
 * 3. Chờ log "Xong" — file tải về thư mục Downloads
 *
 * Lưu ý: chỉ dùng demo cá nhân; asset có thể thuộc bên thứ ba.
 */
(async function downloadDecorationOverlays() {
  const CONFIG = {
    scrollDelayMs: 700,
    maxScrollRounds: 80,
    stableRoundsToStop: 4,
    downloadDelayMs: 350,
    /** Selector vùng lưới decoration (sửa nếu site đổi layout) */
    scrollRoot: null, // null = window; hoặc '#decorations-grid'
    excludeUrl: /wumpus|\/avatar[s]?\/|profile-pic|default.*avatar|placeholder.*user/i,
    includeExt: /\.(png|webp|gif)(\?|$)/i,
  };

  const urls = new Set();

  function maybeAdd(raw) {
    if (!raw || typeof raw !== 'string') return;
    try {
      const u = new URL(raw, location.href).href;
      if (!CONFIG.includeExt.test(u)) return;
      if (CONFIG.excludeUrl.test(u)) return;
      urls.add(u);
    } catch {
      /* ignore */
    }
  }

  function harvestDom() {
    document.querySelectorAll('img[src], img[data-src], source[src]').forEach((el) => {
      maybeAdd(el.currentSrc || el.src || el.getAttribute('data-src'));
    });
  }

  function harvestPerformance() {
    performance.getEntriesByType('resource').forEach((e) => maybeAdd(e.name));
  }

  /** Bắt request mới khi cuộn lazy-load */
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const input = args[0];
    const url = typeof input === 'string' ? input : input?.url;
    maybeAdd(url);
    return origFetch.apply(this, args);
  };

  const observer = new MutationObserver(() => harvestDom());
  observer.observe(document.body, { childList: true, subtree: true });

  function getScrollEl() {
    if (!CONFIG.scrollRoot) return null;
    return document.querySelector(CONFIG.scrollRoot);
  }

  async function scrollPass() {
    const el = getScrollEl();
    if (el) {
      el.scrollTop = el.scrollHeight;
    } else {
      window.scrollTo(0, document.body.scrollHeight);
    }
    await new Promise((r) => setTimeout(r, CONFIG.scrollDelayMs));
    harvestDom();
    harvestPerformance();
    document.querySelectorAll('button, a[role="button"]').forEach((btn) => {
      const t = (btn.textContent || '').toLowerCase();
      if (/load more|show more|xem thêm|more decoration/i.test(t)) btn.click();
    });
  }

  console.log('[deco-dl] Bắt đầu cuộn để load lazy decorations…');
  let lastCount = 0;
  let stable = 0;
  for (let i = 0; i < CONFIG.maxScrollRounds; i++) {
    await scrollPass();
    const n = urls.size;
    if (n === lastCount) stable += 1;
    else {
      stable = 0;
      lastCount = n;
    }
    console.log(`[deco-dl] vòng ${i + 1}: ${n} URL`);
    if (stable >= CONFIG.stableRoundsToStop) break;
  }

  observer.disconnect();
  window.fetch = origFetch;

  const list = [...urls].sort();
  console.log(`[deco-dl] Tổng ${list.length} file overlay:`, list);

  if (!list.length) {
    console.warn('[deco-dl] Không thấy URL. Thử sửa CONFIG.excludeUrl hoặc cuộn tay rồi chạy lại.');
    return;
  }

  async function downloadOne(url, index) {
    const name = decodeURIComponent(url.split('/').pop().split('?')[0] || `overlay_${index}.png`);
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      console.log(`[deco-dl] ✓ ${name}`);
    } catch (err) {
      console.warn(`[deco-dl] ✗ ${name}`, err.message, '— mở tab:', url);
      window.open(url, '_blank');
    }
    await new Promise((r) => setTimeout(r, CONFIG.downloadDelayMs));
  }

  console.log('[deco-dl] Đang tải… (trình duyệt có thể hỏi cho phép nhiều file)');
  for (let i = 0; i < list.length; i++) {
    await downloadOne(list[i], i);
  }
  console.log('[deco-dl] Xong.');
})();
