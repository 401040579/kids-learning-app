// ========== 作业本 ==========
// 家长把学校作业 PDF 导入到这台设备（不进仓库、不上传），孩子按作业翻页，用 Apple Pencil 或手指直接写。
// - PDF 用本地 PDF.js（js/vendor/pdfjs）渲染；每页页眉「日期 | 老师 | 作业名 n/m」自动分组成作业。
// - 笔迹按「作业 + 作业内页码」保存在 IndexedDB kids-homework，换成更新后的 PDF 时同一份作业的笔迹会保留。
// - Apple Pencil：Pointer Events 的 pen 才画线并读压力；一旦用过笔，手指改为滚动（防手掌误触），可手动切换。
// 设备级数据：不进 DataBackup / 账号云同步，不发 Analytics 事件。

const Homework = {
  DB_NAME: 'kids-homework',
  PDFJS_URL: 'js/vendor/pdfjs/pdf.min.mjs',
  WORKER_URL: 'js/vendor/pdfjs/pdf.worker.min.mjs',
  COLORS: ['#1f2937', '#e03131', '#1c7ed6', '#2f9e44', '#f08c00'],
  // 笔的粗细：以页面宽度为 1 的比例；页宽 612pt 时约 1.5 / 3 / 6 pt
  SIZES: [0.0025, 0.005, 0.01],
  ZOOMS: [1, 1.5, 2, 3],
  ERASER_RADIUS: 10, // CSS 像素
  MAX_CANVAS_PIXELS: 10e6, // iOS 单个 canvas 内存上限约 16.7M 像素，留余量

  // ========== 纯逻辑（有回归测试） ==========

  // 「2026-09-25 | 虞老师 | 第 4 周作业包 1/12」→ 结构；没有页眉返回 null
  parseHeader(text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    const m = t.match(/^(\d{4}-\d{2}-\d{2}(?:\s*\/\s*\d{2}-\d{2})?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*(\d+)\s*\/\s*(\d+)$/);
    if (!m) return null;
    return { date: m[1], teacher: m[2], title: m[3], n: Number(m[4]), total: Number(m[5]) };
  },

  kindOf(title) {
    if (/答案|answer key/i.test(title)) return 'answer';
    if (/阅读参考|reference/i.test(title)) return 'reading';
    return 'homework';
  },

  // 每页页眉文字 → 作业分组（页码从 0 开始，start/end 含两端）
  groupPages(headers) {
    const groups = [];
    headers.forEach((text, page) => {
      const h = this.parseHeader(text);
      const key = h ? `${h.date}|${h.teacher}|${h.title}` : null;
      const last = groups[groups.length - 1];
      if (last && last.key === key && (!h || h.n === page - last.start + 1)) {
        last.end = page;
        return;
      }
      groups.push(h
        ? { key, date: h.date, teacher: h.teacher, title: h.title, kind: this.kindOf(h.title), start: page, end: page }
        : { key: null, date: '', teacher: '', title: '封面和目录', kind: 'other', start: page, end: page });
    });
    // 同一作业被拆开（极少见）时加序号，避免笔迹键冲突
    const seen = new Map();
    for (const g of groups) {
      if (!g.key) continue;
      const k = seen.get(g.key) || 0;
      seen.set(g.key, k + 1);
      if (k) g.key += `#${k + 1}`;
    }
    return groups;
  },

  // 孩子先看到最新的作业
  sections(groups) {
    const byDateDesc = (a, b) => b.date.localeCompare(a.date) || a.start - b.start;
    return {
      homework: groups.filter(g => g.kind === 'homework').sort(byDateDesc),
      reading: groups.filter(g => g.kind === 'reading'),
      parent: groups.filter(g => g.kind === 'answer' || g.kind === 'other')
    };
  },

  inkKey(fileId, group, page) {
    return group && group.key ? `${group.key}#p${page - group.start + 1}` : `${fileId}#p${page + 1}`;
  },

  // 笔用压力（0–1）调粗细；手指/鼠标没有压力，按 0.5 处理
  strokeWidth(size, pressure, pointerType) {
    const p = pointerType === 'pen' && pressure > 0 ? Math.min(1, pressure) : 0.5;
    return size * (0.35 + p * 1.3);
  },

  // 点 (x,y) 离笔画任一线段的距离 ≤ r 即命中（坐标都已按页宽归一）
  hitStroke(stroke, x, y, r) {
    const p = stroke.pts;
    const r2 = (r + stroke.w * 0.8) ** 2; // 笔画最粗约 1.65 倍 w，半宽约 0.8w
    if (p.length === 3) return (p[0] - x) ** 2 + (p[1] - y) ** 2 <= r2;
    for (let i = 0; i + 5 < p.length; i += 3) {
      const ax = p[i], ay = p[i + 1], dx = p[i + 3] - ax, dy = p[i + 4] - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
      if ((ax + t * dx - x) ** 2 + (ay + t * dy - y) ** 2 <= r2) return true;
    }
    return false;
  },

  round(v) { return Math.round(v * 1e4) / 1e4; },

  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  // ========== IndexedDB ==========
  // files: 当前 PDF（只保留一份）；ink: 每页笔迹；done: 作业完成标记
  _db: null,
  db() {
    if (!this._db) this._db = new Promise((resolve, reject) => {
      const r = indexedDB.open(this.DB_NAME, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('files', { keyPath: 'id' });
        r.result.createObjectStore('ink', { keyPath: 'key' });
        r.result.createObjectStore('done', { keyPath: 'key' });
      };
      r.onerror = r.onblocked = () => reject(r.error || new Error('indexedDB'));
      r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); this._db = null; }; resolve(r.result); };
    }).catch(e => { this._db = null; throw e; });
    return this._db;
  },
  async tx(stores, mode, run) {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let value;
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('transaction'));
      run(tx, v => { value = v; });
    });
  },
  getAll(store) {
    return this.tx([store], 'readonly', (tx, set) => { const r = tx.objectStore(store).getAll(); r.onsuccess = () => set(r.result); });
  },
  get(store, key) {
    return this.tx([store], 'readonly', (tx, set) => { const r = tx.objectStore(store).get(key); r.onsuccess = () => set(r.result); });
  },

  // ========== 状态 ==========
  file: null,      // { id, name, size, importedAt, pageCount, groups, blob }
  doc: null,       // PDF.js 文档
  done: new Set(),
  inkPages: new Set(),
  group: null,
  page: 0,
  strokes: [],
  history: [],     // 撤销栈：{type:'add'|'erase'|'clear', ...}
  tool: 'pen',
  color: 0,
  size: 1,
  zoom: 0,
  penSeen: false,
  fingerMode: 'draw', // 'draw' 手指写字 | 'move' 手指滚动
  active: null,    // 正在画的 { id, stroke } 或正在擦的 { id, erased }
  pan: null,       // 手指滚动中的 { id, x, y, left, top }
  _render: 0,
  _renderTask: null,
  _saveTimer: 0,
  _pdfjs: null,

  el(id) { return document.getElementById(id); },

  // PDF.js 6 只在 loadingTask 上提供 destroy
  closeDoc() { this.doc?.loadingTask?.destroy(); this.doc = null; },

  // ========== 打开 / 关闭 ==========
  async open() {
    const modal = this.el('homework-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (!modal.dataset.bound) {
      modal.dataset.bound = '1';
      modal.addEventListener('click', e => this.onClick(e));
      modal.addEventListener('change', e => { if (e.target.id === 'hw-file-input') this.importFile(e.target.files[0]); });
      window.addEventListener('resize', () => { if (this.group) this.renderPage(); });
    }
    if (typeof RecentlyUsed !== 'undefined') RecentlyUsed.track('homework');
    this.renderShelf('<p class="hw-hint">正在打开… Loading…</p>');
    try {
      await this.loadState();
      this.renderShelf();
    } catch (e) {
      console.warn('[Homework] 读取失败', e);
      this.renderShelf('<p class="hw-hint hw-error">读不到作业本数据，请确认浏览器没有禁用网站存储。</p>');
    }
  },

  async close() {
    await this.flushSave();
    this.releasePage();
    this.group = null;
    this.el('homework-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
  },

  async loadState() {
    const [files, done, ink] = await Promise.all([
      this.getAll('files'), this.getAll('done'),
      this.tx(['ink'], 'readonly', (tx, set) => { const r = tx.objectStore('ink').getAllKeys(); r.onsuccess = () => set(r.result); })
    ]);
    files.sort((a, b) => b.importedAt - a.importedAt);
    if (this.file?.id !== files[0]?.id) { this.closeDoc(); }
    this.file = files[0] || null;
    this.done = new Set(done.map(d => d.key));
    this.inkPages = new Set(ink);
  },

  // ========== 作业列表 ==========
  renderShelf(message) {
    const modal = this.el('homework-modal');
    modal.dataset.view = 'shelf';
    const f = this.file;
    let body = message || '';
    if (!message && !f) {
      body = `
        <div class="hw-empty">
          <div class="hw-empty-icon">📒</div>
          <p>还没有作业 PDF。<br>请爸爸妈妈点下面的按钮，从「文件」里选老师发的作业 PDF。</p>
          <p class="hw-small">PDF 只存在这台设备上，不会上传。No upload: the PDF stays on this device.</p>
        </div>`;
    } else if (!message) {
      const s = this.sections(f.groups);
      const card = g => {
        const pages = g.end - g.start + 1;
        const written = this.countInk(g);
        const done = g.key && this.done.has(g.key);
        return `<button class="hw-card${done ? ' is-done' : ''} hw-kind-${g.kind}" data-hw-group="${g.start}">
          <span class="hw-card-title">${this.esc(g.title)}</span>
          <span class="hw-card-meta">${this.esc(g.date)}${g.teacher ? ' · ' + this.esc(g.teacher) : ''} · ${pages} 页</span>
          <span class="hw-card-state">${done ? '✅ 做完啦' : written ? `✏️ 写了 ${written} 页` : ''}</span>
        </button>`;
      };
      const todo = s.homework.filter(g => !this.done.has(g.key)).length;
      body = `
        <p class="hw-intro">${todo ? `还有 <b>${todo}</b> 份作业没做完，加油！` : '作业都做完啦，真棒！🎉'}</p>
        <h3 class="hw-sec">📝 作业 Homework</h3>
        <div class="hw-grid">${s.homework.map(card).join('') || '<p class="hw-hint">没有找到作业页。</p>'}</div>
        ${s.reading.length ? `<h3 class="hw-sec">📖 阅读参考 Reading</h3><div class="hw-grid">${s.reading.map(card).join('')}</div>` : ''}
        ${s.parent.length ? `<details class="hw-parent"><summary>👨‍👩‍👧 家长：答案和目录</summary><div class="hw-grid">${s.parent.map(card).join('')}</div></details>` : ''}
        <p class="hw-small">${this.esc(f.name)} · ${f.pageCount} 页 · 导入于 ${new Date(f.importedAt).toLocaleDateString()}</p>`;
    }
    modal.innerHTML = `
      <div class="hw-top">
        <button class="hw-round" data-hw-act="close" aria-label="关闭">✕</button>
        <h2>📒 作业本 <small>Homework</small></h2>
        <span class="hw-round-spacer"></span>
      </div>
      <div class="hw-shelf">
        ${body}
        <div class="hw-parent-actions">
          <label class="hw-btn hw-import">
            📥 ${f ? '换成新的作业 PDF' : '导入作业 PDF'}
            <input type="file" id="hw-file-input" accept="application/pdf,.pdf" hidden>
          </label>
          ${f ? '<button class="hw-btn hw-btn-ghost" data-hw-act="remove">🗑️ 删除 PDF 和笔迹</button>' : ''}
        </div>
      </div>`;
  },

  countInk(g) {
    let n = 0;
    for (let p = g.start; p <= g.end; p++) if (this.inkPages.has(this.inkKey(this.file.id, g, p))) n++;
    return n;
  },

  // ========== 导入 PDF ==========
  async loadPdfjs() {
    if (!this._pdfjs) {
      this._pdfjs = import(new URL(this.PDFJS_URL, document.baseURI).href).then(m => {
        m.GlobalWorkerOptions.workerSrc = new URL(this.WORKER_URL, document.baseURI).href;
        return m;
      }).catch(e => { this._pdfjs = null; throw e; });
    }
    return this._pdfjs;
  },

  async openDoc(data) {
    const pdfjs = await this.loadPdfjs();
    return pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false }).promise;
  },

  // 每页顶部 7% 的文字按 x 排序拼成一行，作为页眉
  async readHeaders(doc, onProgress) {
    const headers = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      const top = [];
      for (const it of tc.items) {
        if (!it.str) continue;
        const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
        if (y < vp.height * 0.07) top.push([x, it.str]);
      }
      top.sort((a, b) => a[0] - b[0]);
      headers.push(top.map(t => t[1]).join(''));
      page.cleanup();
      if (i % 10 === 0) onProgress?.(i, doc.numPages);
    }
    return headers;
  },

  async importFile(blob) {
    if (!blob) return;
    if (this.file && !confirm('换成新的 PDF？同一份作业写过的字会保留。')) return;
    this.renderShelf('<p class="hw-hint">正在读取 PDF… Reading PDF…</p>');
    try {
      const buf = await blob.arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256', buf);
      const id = Array.from(new Uint8Array(hash).slice(0, 12), b => b.toString(16).padStart(2, '0')).join('');
      const doc = await this.openDoc(new Uint8Array(buf.slice(0)));
      const headers = await this.readHeaders(doc, (i, n) => {
        const hint = document.querySelector('#homework-modal .hw-hint');
        if (hint) hint.textContent = `正在整理作业… ${i}/${n}`;
      });
      const file = {
        id, name: blob.name || 'homework.pdf', size: blob.size, importedAt: Date.now(),
        pageCount: doc.numPages, groups: this.groupPages(headers),
        blob: new Blob([buf], { type: 'application/pdf' })
      };
      await this.tx(['files'], 'readwrite', tx => {
        const s = tx.objectStore('files');
        s.clear();
        s.put(file);
      });
      if (navigator.storage?.persist) navigator.storage.persist().catch(() => false);
      await this.loadState();
      if (this.doc !== doc) this.closeDoc(); // 重新导入同一份也要释放旧文档
      this.doc = doc;
      this.renderShelf();
    } catch (e) {
      console.warn('[Homework] 导入失败', e);
      await this.loadState().catch(() => {});
      this.renderShelf(`<p class="hw-hint hw-error">这个 PDF 打不开或没存进去（${this.esc(e.message || e)}）。原来的作业不受影响。</p>`);
    }
  },

  async removeAll() {
    if (!confirm('删除这台设备上的作业 PDF、所有笔迹和完成标记？删除后不能恢复。')) return;
    await this.tx(['files', 'ink', 'done'], 'readwrite', tx => {
      ['files', 'ink', 'done'].forEach(s => tx.objectStore(s).clear());
    });
    this.closeDoc();
    await this.loadState();
    this.renderShelf();
  },

  // ========== 写作业页 ==========
  async openGroup(start) {
    const g = this.file?.groups.find(x => x.start === start);
    if (!g) return;
    this.group = g;
    this.zoom = 0;
    const modal = this.el('homework-modal');
    modal.dataset.view = 'page';
    modal.innerHTML = `
      <div class="hw-top hw-top-page">
        <button class="hw-round" data-hw-act="shelf" aria-label="返回">‹</button>
        <h2><span id="hw-title"></span><small id="hw-sub"></small></h2>
        <button class="hw-done-btn" data-hw-act="done" id="hw-done"></button>
      </div>
      <div class="hw-scroll" id="hw-scroll">
        <div class="hw-paper" id="hw-paper">
          <canvas id="hw-pdf"></canvas>
          <canvas id="hw-ink"></canvas>
          <div class="hw-loading" id="hw-loading">正在打开这一页…</div>
        </div>
      </div>
      <div class="hw-tools" role="toolbar" aria-label="书写工具">
        <button class="hw-tool" data-hw-tool="pen" aria-label="笔">✏️</button>
        <button class="hw-tool" data-hw-tool="eraser" aria-label="橡皮">🧽</button>
        <span class="hw-colors">${this.COLORS.map((c, i) => `<button class="hw-color" data-hw-color="${i}" style="--c:${c}" aria-label="颜色 ${i + 1}"></button>`).join('')}</span>
        <span class="hw-sizes">${this.SIZES.map((_, i) => `<button class="hw-size" data-hw-size="${i}" aria-label="粗细 ${i + 1}"><i style="--d:${4 + i * 4}px"></i></button>`).join('')}</span>
        <button class="hw-tool" data-hw-act="undo" aria-label="撤销">↩️</button>
        <button class="hw-tool" data-hw-act="clear" aria-label="清空这一页">🧹</button>
        <button class="hw-tool hw-finger" data-hw-act="finger" id="hw-finger"></button>
        <button class="hw-tool" data-hw-act="zoom" id="hw-zoom" aria-label="放大"></button>
        <span class="hw-nav">
          <button class="hw-tool" data-hw-act="prev" aria-label="上一页">◀</button>
          <span id="hw-pageno"></span>
          <button class="hw-tool" data-hw-act="next" aria-label="下一页">▶</button>
        </span>
      </div>`;
    this.bindInk();
    try {
      if (!this.doc) this.doc = await this.openDoc(new Uint8Array(await this.file.blob.arrayBuffer()));
    } catch (e) {
      console.warn('[Homework] 打开 PDF 失败', e);
      this.el('hw-loading').textContent = '这个 PDF 打不开了，请家长重新导入。';
      return;
    }
    await this.goPage(g.start);
  },

  async goPage(page) {
    if (!this.group) return;
    await this.flushSave();
    const g = this.group;
    this.page = Math.max(g.start, Math.min(g.end, page));
    this.history = [];
    this.active = null;
    this.pan = null;
    const row = await this.get('ink', this.inkKey(this.file.id, g, this.page)).catch(() => null);
    this.strokes = row?.strokes || [];
    this.updateBar();
    await this.renderPage();
  },

  updateBar() {
    const g = this.group;
    if (!g) return;
    const n = this.page - g.start + 1, total = g.end - g.start + 1;
    this.el('hw-title').textContent = g.title;
    this.el('hw-sub').textContent = [g.date, g.teacher].filter(Boolean).join(' · ');
    this.el('hw-pageno').textContent = `${n} / ${total}`;
    const done = g.key && this.done.has(g.key);
    const btn = this.el('hw-done');
    btn.hidden = !g.key;
    btn.textContent = done ? '✅ 做完啦' : '做完了';
    btn.classList.toggle('is-done', !!done);
    document.querySelectorAll('[data-hw-tool]').forEach(b => b.classList.toggle('is-on', b.dataset.hwTool === this.tool));
    document.querySelectorAll('[data-hw-color]').forEach(b => b.classList.toggle('is-on', +b.dataset.hwColor === this.color));
    document.querySelectorAll('[data-hw-size]').forEach(b => b.classList.toggle('is-on', +b.dataset.hwSize === this.size));
    this.el('hw-finger').textContent = this.fingerMode === 'draw' ? '☝️ 手指写' : '✋ 手指移';
    this.el('hw-finger').setAttribute('aria-label', this.fingerMode === 'draw' ? '手指用来写字，点一下改成手指滚动' : '手指用来滚动，点一下改成手指写字');
    this.el('hw-zoom').textContent = `🔍 ${this.ZOOMS[this.zoom]}×`;
    document.querySelector('[data-hw-act="prev"]').disabled = this.page <= g.start;
  },

  async renderPage() {
    const token = ++this._render;
    const scroll = this.el('hw-scroll'), pdfCanvas = this.el('hw-pdf'), ink = this.el('hw-ink');
    if (!scroll || !this.doc) return;
    this._renderTask?.cancel();
    const page = await this.doc.getPage(this.page + 1);
    if (token !== this._render) return;
    const base = page.getViewport({ scale: 1 });
    const fit = Math.min((scroll.clientWidth - 16) / base.width, (scroll.clientHeight - 16) / base.height);
    const cssScale = Math.max(0.1, fit) * this.ZOOMS[this.zoom];
    const cssW = Math.floor(base.width * cssScale), cssH = Math.floor(base.height * cssScale);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cssW * cssH * dpr * dpr > this.MAX_CANVAS_PIXELS) dpr = Math.sqrt(this.MAX_CANVAS_PIXELS / (cssW * cssH));
    const vp = page.getViewport({ scale: cssScale * dpr });
    // 先在离屏 canvas 渲染，完成后再贴上去，翻页/缩放时不闪白
    const off = document.createElement('canvas');
    off.width = Math.floor(vp.width);
    off.height = Math.floor(vp.height);
    this.el('hw-loading').hidden = false;
    const task = this._renderTask = page.render({ canvas: off, canvasContext: off.getContext('2d'), viewport: vp });
    try {
      await task.promise;
    } catch (e) {
      if (e?.name !== 'RenderingCancelledException') console.warn('[Homework] 渲染失败', e);
      off.width = off.height = 0;
      return;
    }
    if (token !== this._render) { off.width = off.height = 0; return; }
    const paper = this.el('hw-paper');
    paper.style.width = cssW + 'px';
    paper.style.height = cssH + 'px';
    pdfCanvas.width = off.width;
    pdfCanvas.height = off.height;
    pdfCanvas.getContext('2d').drawImage(off, 0, 0);
    off.width = off.height = 0; // iOS 及时释放 canvas 内存
    ink.width = pdfCanvas.width;
    ink.height = pdfCanvas.height;
    this.cssW = cssW;
    this.el('hw-loading').hidden = true;
    page.cleanup();
    this.redraw();
  },

  releasePage() {
    this._render++;
    this._renderTask?.cancel();
    for (const id of ['hw-pdf', 'hw-ink']) {
      const c = this.el(id);
      if (c) c.width = c.height = 0;
    }
  },

  // ========== 笔迹绘制 ==========
  redraw() {
    const ink = this.el('hw-ink');
    if (!ink) return;
    const ctx = ink.getContext('2d');
    ctx.clearRect(0, 0, ink.width, ink.height);
    for (const s of this.strokes) this.drawStroke(ctx, s, 0);
  },

  // 从第 from 个点开始画（实时书写时只补最新的几段）
  drawStroke(ctx, s, from) {
    const W = ctx.canvas.width, p = s.pts;
    ctx.strokeStyle = ctx.fillStyle = s.c;
    ctx.lineCap = ctx.lineJoin = 'round';
    if (p.length === 3) {
      ctx.beginPath();
      ctx.arc(p[0] * W, p[1] * W, Math.max(0.5, this.strokeWidth(s.w, p[2], s.t) * W / 2), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // 中点二次曲线平滑，每段按两端压力取粗细
    for (let i = Math.max(3, from); i < p.length; i += 3) {
      const x0 = i >= 6 ? (p[i - 6] + p[i - 3]) / 2 : p[i - 3], y0 = i >= 6 ? (p[i - 5] + p[i - 2]) / 2 : p[i - 2];
      const x1 = (p[i - 3] + p[i]) / 2, y1 = (p[i - 2] + p[i + 1]) / 2;
      ctx.lineWidth = Math.max(0.5, this.strokeWidth(s.w, (p[i - 1] + p[i + 2]) / 2, s.t) * W);
      ctx.beginPath();
      ctx.moveTo(x0 * W, y0 * W);
      ctx.quadraticCurveTo(p[i - 3] * W, p[i - 2] * W, i + 3 >= p.length ? p[i] * W : x1 * W, i + 3 >= p.length ? p[i + 1] * W : y1 * W);
      ctx.stroke();
    }
  },

  // ========== Apple Pencil / 手指输入 ==========
  bindInk() {
    const ink = this.el('hw-ink');
    // Safari：笔落下时拦住 touchstart，页面就不会跟着笔滚动；手指不拦，照常滚动
    ink.addEventListener('touchstart', e => {
      const stylus = Array.from(e.changedTouches).some(t => t.touchType === 'stylus');
      if (stylus) e.preventDefault();
    }, { passive: false });
    ink.addEventListener('touchmove', e => { if (this.active) e.preventDefault(); }, { passive: false });
    ink.addEventListener('pointerdown', e => this.onDown(e));
    ink.addEventListener('pointermove', e => this.onMove(e));
    ink.addEventListener('pointerup', e => this.onUp(e));
    ink.addEventListener('pointercancel', e => this.onUp(e));
    ink.addEventListener('contextmenu', e => e.preventDefault());
  },

  point(e) {
    const r = this.el('hw-ink').getBoundingClientRect();
    return [this.round((e.clientX - r.left) / r.width), this.round((e.clientY - r.top) / r.width), this.round(e.pressure || 0)];
  },

  onDown(e) {
    if (e.pointerType === 'pen' && !this.penSeen) {
      this.penSeen = true;
      this.fingerMode = 'move'; // 用过笔就把手指交给滚动，手掌压在屏幕上也不会乱画
      this.updateBar();
    }
    if (e.pointerType === 'pen') this.pan = null; // 笔落下就停止手掌/手指带来的平移
    if (e.pointerType === 'touch' && this.fingerMode === 'move') {
      // 画布始终 touch-action:none（Chrome 里笔也受 touch-action 影响），手指滚动自己做
      if (!this.active && !this.pan) {
        const sc = this.el('hw-scroll');
        this.pan = { id: e.pointerId, x: e.clientX, y: e.clientY, left: sc.scrollLeft, top: sc.scrollTop };
      }
      return;
    }
    if (this.active || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try { this.el('hw-ink').setPointerCapture(e.pointerId); } catch { /* 指针已抬起时会抛错，不影响书写 */ }
    const pt = this.point(e);
    if (this.tool === 'eraser') {
      this.active = { id: e.pointerId, erased: [] };
      this.eraseAt(pt);
      return;
    }
    const stroke = { c: this.COLORS[this.color], w: this.SIZES[this.size], t: e.pointerType, pts: pt };
    this.active = { id: e.pointerId, stroke };
    this.drawStroke(this.el('hw-ink').getContext('2d'), stroke, 0);
  },

  onMove(e) {
    const pan = this.pan;
    if (pan && pan.id === e.pointerId) {
      const sc = this.el('hw-scroll');
      sc.scrollLeft = pan.left - (e.clientX - pan.x);
      sc.scrollTop = pan.top - (e.clientY - pan.y);
      return;
    }
    const a = this.active;
    if (!a || a.id !== e.pointerId) return;
    e.preventDefault();
    const events = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
    const list = events.length ? events : [e];
    if (a.erased) { list.forEach(ev => this.eraseAt(this.point(ev))); return; }
    const s = a.stroke, from = s.pts.length;
    for (const ev of list) {
      const pt = this.point(ev);
      const n = s.pts.length;
      if (Math.abs(pt[0] - s.pts[n - 3]) + Math.abs(pt[1] - s.pts[n - 2]) < 0.0004) continue; // 去掉几乎重合的点
      s.pts.push(...pt);
    }
    if (s.pts.length > from) this.drawStroke(this.el('hw-ink').getContext('2d'), s, Math.max(3, from - 3));
  },

  onUp(e) {
    if (this.pan?.id === e.pointerId) this.pan = null;
    const a = this.active;
    if (!a || a.id !== e.pointerId) return;
    this.active = null;
    if (a.erased) {
      if (a.erased.length) { this.history.push({ type: 'erase', items: a.erased }); this.scheduleSave(); }
      return;
    }
    this.strokes.push(a.stroke);
    this.history.push({ type: 'add' });
    this.redraw(); // 把实时画的分段统一重绘，接缝更平滑
    this.scheduleSave();
  },

  eraseAt([x, y]) {
    const r = this.ERASER_RADIUS / (this.cssW || 1);
    let hit = false;
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      if (this.hitStroke(this.strokes[i], x, y, r)) {
        this.active.erased.push({ index: i, stroke: this.strokes[i] });
        this.strokes.splice(i, 1);
        hit = true;
      }
    }
    if (hit) this.redraw();
  },

  undo() {
    const h = this.history.pop();
    if (!h) return;
    if (h.type === 'add') this.strokes.pop();
    else if (h.type === 'erase') h.items.slice().reverse().forEach(({ index, stroke }) => this.strokes.splice(index, 0, stroke));
    else if (h.type === 'clear') this.strokes = h.strokes;
    this.redraw();
    this.scheduleSave();
  },

  clearPage() {
    if (!this.strokes.length || !confirm('清空这一页写的字？可以按 ↩️ 撤销。')) return;
    this.history.push({ type: 'clear', strokes: this.strokes });
    this.strokes = [];
    this.redraw();
    this.scheduleSave();
  },

  // ========== 保存 ==========
  scheduleSave() {
    clearTimeout(this._saveTimer);
    this._pending = { key: this.inkKey(this.file.id, this.group, this.page), strokes: this.strokes.slice() };
    this._saveTimer = setTimeout(() => this.flushSave(), 600);
  },

  async flushSave() {
    clearTimeout(this._saveTimer);
    const p = this._pending;
    if (!p) return;
    this._pending = null;
    try {
      await this.tx(['ink'], 'readwrite', tx => {
        const s = tx.objectStore('ink');
        if (p.strokes.length) s.put({ key: p.key, strokes: p.strokes, updatedAt: Date.now() });
        else s.delete(p.key);
      });
      if (p.strokes.length) this.inkPages.add(p.key); else this.inkPages.delete(p.key);
    } catch (e) {
      console.warn('[Homework] 笔迹保存失败', e);
      this.toast('⚠️ 没保存上，请别关掉这一页，再写一笔试试');
    }
  },

  async toggleDone() {
    const g = this.group;
    if (!g?.key) return;
    const was = this.done.has(g.key);
    try {
      await this.tx(['done'], 'readwrite', tx => {
        if (was) tx.objectStore('done').delete(g.key);
        else tx.objectStore('done').put({ key: g.key, at: Date.now() });
      });
    } catch (e) {
      this.toast('⚠️ 没记上，再点一次试试');
      return;
    }
    if (was) this.done.delete(g.key); else this.done.add(g.key);
    this.updateBar();
    if (!was) this.celebrate();
  },

  celebrate() {
    this.toast('太棒了！作业做完啦 🎉 Great job!');
    const layer = document.createElement('div');
    layer.className = 'hw-confetti';
    layer.innerHTML = Array.from({ length: 18 }, (_, i) =>
      `<span style="left:${(i * 37) % 100}%;animation-delay:${(i % 6) * 0.08}s">${['⭐', '🎉', '🌈', '💖', '✨', '🏅'][i % 6]}</span>`).join('');
    this.el('homework-modal').appendChild(layer);
    setTimeout(() => layer.remove(), 2200);
  },

  toast(text) {
    const modal = this.el('homework-modal');
    modal.querySelector('.hw-toast')?.remove();
    const t = document.createElement('div');
    t.className = 'hw-toast';
    t.textContent = text;
    modal.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  },

  // ========== 按钮 ==========
  async onClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const d = btn.dataset;
    if (d.hwGroup !== undefined) return this.openGroup(Number(d.hwGroup));
    if (d.hwTool) { this.tool = d.hwTool; return this.updateBar(); }
    if (d.hwColor !== undefined) { this.color = Number(d.hwColor); this.tool = 'pen'; return this.updateBar(); }
    if (d.hwSize !== undefined) { this.size = Number(d.hwSize); this.tool = 'pen'; return this.updateBar(); }
    switch (d.hwAct) {
      case 'close': return this.close();
      case 'shelf':
        await this.flushSave();
        this.releasePage();
        this.group = null;
        return this.renderShelf();
      case 'remove': return this.removeAll();
      case 'undo': return this.undo();
      case 'clear': return this.clearPage();
      case 'done': return this.toggleDone();
      case 'finger':
        this.fingerMode = this.fingerMode === 'draw' ? 'move' : 'draw';
        return this.updateBar();
      case 'zoom':
        this.zoom = (this.zoom + 1) % this.ZOOMS.length;
        this.updateBar();
        return this.renderPage();
      case 'prev': return this.goPage(this.page - 1);
      case 'next':
        if (this.page < this.group.end) return this.goPage(this.page + 1);
        if (this.group.key && !this.done.has(this.group.key)) this.toast('最后一页啦！做完了就点右上角「做完了」');
        else this.toast('这是最后一页');
    }
  }
};

function showHomework() { Homework.open(); }
