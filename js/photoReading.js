// 拍照点读仅保留本次页面内存；切号清空，原文不进入统计、学习日志或云备份。
const PhotoReading = {
  pages: [], selected: null, epoch: 0, playToken: 0, cameraToken: 0,
  stream: null, importing: false, recognizing: false, isOpen: false,
  controllers: new Set(), audioCache: new Map(), rate: 0.8,
  t(key, vars = {}) {
    let value = I18n.t('photo.' + key);
    for (const [k,v] of Object.entries(vars)) value = value.replaceAll('{' + k + '}', String(v));
    return value;
  },
  el(id) { return document.getElementById('pr-' + id); },
  node(tag, text, cls) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  },
  button(key, action) {
    const button = this.node('button', this.t(key)); button.type = 'button';
    button.addEventListener('click', action); return button;
  },
  init() {
    const root = this.node('dialog', undefined, 'photo-reading'); root.id = 'photo-reading';
    root.setAttribute('aria-labelledby', 'pr-title');
    root.innerHTML = `<header class="pr-header"><div><small data-i18n="photo.eyebrow"></small><h2 id="pr-title" data-i18n="photo.title"></h2></div><button id="pr-close" type="button" data-i18n="photo.close"></button></header>
      <p class="pr-note" data-i18n="photo.privacy"></p>
      <div class="pr-add"><button type="button" id="pr-camera" data-i18n="photo.camera"></button><button type="button" id="pr-album" data-i18n="photo.album"></button><button type="button" id="pr-native" data-i18n="photo.nativeCamera"></button><button type="button" id="pr-clear" data-i18n="photo.clear"></button></div>
      <input id="pr-files" type="file" accept="image/*" multiple hidden><input id="pr-capture-file" type="file" accept="image/*" capture="environment" hidden>
      <section id="pr-camera-panel" hidden><video id="pr-video" playsinline autoplay muted></video><div class="pr-add"><button type="button" id="pr-snap" data-i18n="photo.snap"></button><button type="button" id="pr-camera-stop" data-i18n="photo.cameraStop"></button></div></section>
      <p id="pr-status" role="status" aria-live="polite"></p><p id="pr-service" class="pr-note" role="status"></p>
      <div class="pr-workspace"><aside><h3 id="pr-count"></h3><div id="pr-thumbs"></div><button type="button" id="pr-recognize" class="pr-primary" data-i18n="photo.recognize"></button></aside>
      <main><div class="pr-player"><label><span data-i18n="photo.speed"></span> <select id="pr-rate"><option value="0.6">0.6×</option><option value="0.8" selected>0.8×</option><option value="1">1.0×</option><option value="1.2">1.2×</option></select></label><button type="button" id="pr-stop" data-i18n="photo.stop"></button><button type="button" id="pr-resume" hidden data-i18n="photo.tapPlay"></button></div>
      <p id="pr-play-status" role="status" aria-live="polite"></p><div id="pr-content"></div></main></div>`;
    document.body.append(root); this.root = root;
    this.audio = new Audio(); this.audio.preload = 'auto';
    this.el('close').onclick = () => this.close();
    root.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.el('camera').onclick = () => this.startCamera();
    this.el('camera-stop').onclick = () => this.stopCamera();
    this.el('snap').onclick = () => this.snap();
    this.el('album').onclick = () => this.el('files').click();
    this.el('native').onclick = () => this.el('capture-file').click();
    for (const id of ['files', 'capture-file']) this.el(id).onchange = e => {
      const files = Array.from(e.target.files); e.target.value = ''; this.importFiles(files);
    };
    this.el('clear').onclick = () => { if (confirm(this.t('clearConfirm'))) this.clear(); };
    this.el('recognize').onclick = () => this.recognize();
    this.el('stop').onclick = () => this.stopAudio();
    this.el('rate').onchange = e => { this.rate = Number(e.target.value); this.audio.playbackRate = this.rate; };
    this.el('resume').onclick = () => this.resumeAudio();
    window.addEventListener('accountChanged', () => { this.clear(); if (this.isOpen) this.close(); });
    window.addEventListener('languageChanged', () => { if (this.isOpen) { I18n.applyTranslations(); this.render(); this.checkService(); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.stopCamera(); this.stopAudio(); } });
    window.addEventListener('pagehide', () => { this.stopCamera(); this.stopAudio(); });
  },
  open() {
    if (this.isOpen) return;
    this.returnFocus = document.activeElement; this.isOpen = true;
    this.previousAnalyticsDisabled = window['ga-disable-G-RCEWX2DDQQ'];
    window['ga-disable-G-RCEWX2DDQQ'] = true;
    this.root.showModal(); I18n.applyTranslations(); this.render(); this.checkService();
  },
  close() {
    this.cancelRequests(); this.stopCamera(); this.stopAudio(); this.isOpen = false;
    this.root.close(); window['ga-disable-G-RCEWX2DDQQ'] = this.previousAnalyticsDisabled;
    this.returnFocus?.focus();
  },
  cancelRequests() {
    this.epoch++;
    for (const c of this.controllers) c.abort();
    this.controllers.clear(); this.recognizing = false; this.importing = false;
    for (const p of this.pages) if (p.state === 'processing') p.state = 'pending';
  },
  clear() {
    this.cancelRequests(); this.stopCamera(); this.stopAudio();
    for (const item of this.audioCache.values()) URL.revokeObjectURL(item.url);
    this.audioCache.clear(); this.pages = []; this.selected = null;
    this.status(''); this.render();
  },
  status(key, vars) { this.el('status').textContent = key ? this.t(key, vars) : ''; },
  errorCode(error) { return error.code || (error.name === 'AbortError' ? 'timeout' : 'offline'); },
  valid(epoch, owner) { return this.isOpen && this.epoch === epoch && LearningAccount.identity?.id === owner; },
  async request(path, values, { audio = false, controller = new AbortController() } = {}) {
    const owner = LearningAccount.identity?.id, epoch = this.epoch;
    if (!owner || !LearningAccount.base) throw Object.assign(Error(), {code:'loginRequired'});
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), 85000);
    try {
      const response = await fetch(LearningAccount.base + '/api/photo-reading/' + path, {
        method: values ? 'POST' : 'GET', credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: {'Content-Type':'application/json','X-CSRF-Token':LearningAccount.identity.csrf},
        ...(values ? {body:JSON.stringify({...values, expected_account_id:owner})} : {})
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const code = response.status === 401 ? 'loginRequired' : response.status === 404 ? 'notConfigured' : result.detail?.code || 'providerUnavailable';
        throw Object.assign(Error(), {code});
      }
      const result = audio ? await response.blob() : await response.json();
      if (!this.valid(epoch, owner)) throw Object.assign(Error(), {code:'accountChanged'});
      if (audio && (!result.type.startsWith('audio/') || result.size > 7 * 1024 * 1024)) throw Object.assign(Error(),{code:'speechFailed'});
      return result;
    } finally { clearTimeout(timer); this.controllers.delete(controller); }
  },
  async checkService() {
    const epoch = this.epoch;
    try {
      const result = await this.request('status');
      this.el('service').textContent = this.t(result.configured ? 'ready' : 'notConfigured');
    } catch (error) { if (epoch === this.epoch && this.isOpen) this.el('service').textContent = this.t(this.errorCode(error)); }
  },
  async startCamera() {
    this.stopCamera(); this.stopAudio();
    if (!navigator.mediaDevices?.getUserMedia) { this.status('cameraUnavailable'); return; }
    const token = this.cameraToken; this.el('camera').disabled = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:2048},height:{ideal:1536}},audio:false});
      if (!this.isOpen || token !== this.cameraToken || document.hidden) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream; this.el('camera-panel').hidden = false; this.el('video').srcObject = stream;
      await this.el('video').play(); this.status('cameraHint');
    } catch { if (token === this.cameraToken) { this.stopCamera(); this.status('cameraUnavailable'); } }
    finally { if (token === this.cameraToken) this.el('camera').disabled = false; }
  },
  stopCamera() {
    this.cameraToken++; this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    this.el('camera-panel').hidden = true; this.el('video').srcObject = null; this.el('camera').disabled = false;
  },
  encode(source, width, height) {
    if (!width || !height || width * height > 50_000_000) throw Object.assign(Error(), {code:'imageInvalid'});
    const scale = Math.min(1, 2048 / Math.max(width,height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(width*scale); canvas.height = Math.round(height*scale);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(source,0,0,canvas.width,canvas.height);
    const data = canvas.toDataURL('image/jpeg',0.88); canvas.width = canvas.height = 0;
    if (data.length > 4 * 1024 * 1024) throw Object.assign(Error(),{code:'imageInvalid'});
    return data;
  },
  add(data) {
    if (this.pages.length >= 10) { this.status('pageLimit'); return; }
    const page = {id:crypto.randomUUID(),image:data,state:'pending',sentences:[],review:false,error:''};
    this.pages.push(page); this.selected = page.id; this.render(); this.status('added',{count:this.pages.length});
  },
  snap() {
    if (this.importing || !this.stream) return;
    try { const v = this.el('video'); this.add(this.encode(v,v.videoWidth,v.videoHeight)); }
    catch (e) { this.status(this.errorCode(e)); }
  },
  async importFiles(files) {
    if (this.importing || !this.isOpen) return;
    this.importing = true; const epoch = this.epoch; let failures = 0;
    this.render();
    try {
      for (const file of files) {
        if (!this.isOpen || epoch !== this.epoch) break;
        if (this.pages.length >= 10) { this.status('pageLimit'); break; }
        let url;
        try {
          if (file.size > 25 * 1024 * 1024 || !file.type.startsWith('image/')) throw Error();
          url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
          if (this.isOpen && epoch === this.epoch) this.add(this.encode(img,img.naturalWidth,img.naturalHeight));
        } catch { failures++; }
        finally { if (url) URL.revokeObjectURL(url); }
      }
      if (failures && epoch === this.epoch) this.status('importFailed',{count:failures});
    } finally { if (epoch === this.epoch) { this.importing = false; this.render(); } }
  },
  async recognize(only) {
    if (this.recognizing || this.importing) return;
    if (!LearningAccount.identity) { this.status('loginRequired'); return; }
    this.stopCamera(); this.stopAudio(); this.status('');
    const epoch = this.epoch, owner = LearningAccount.identity.id;
    const queue = only ? [only] : this.pages.filter(p => p.state !== 'ready');
    this.recognizing = true; this.render();
    try {
      for (const page of queue) {
        if (!this.valid(epoch,owner)) break;
        page.state = 'processing'; page.error = ''; this.render();
        try {
          const result = await this.request('recognize',{image:page.image});
          if (!this.valid(epoch,owner) || !this.pages.includes(page)) break;
          page.sentences = result.sentences; page.review = result.needs_review; page.usage = result.usage;
          page.state = 'ready';
        } catch (error) {
          if (!this.valid(epoch,owner)) break;
          page.state = 'error'; page.error = this.errorCode(error);
          if (['loginRequired','notConfigured','limitReached','providerUnavailable','offline'].includes(page.error)) break;
        }
        this.render();
      }
    } finally { if (epoch === this.epoch) { this.recognizing = false; this.render(); } }
  },
  stopAudio() {
    this.playToken++; this.speechController?.abort(); this.speechController = null;
    this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load();
    this.audio.onended = this.audio.onerror = null; this.activeSentence = null;
    this.el('resume').hidden = true; this.el('play-status').textContent = ''; this.highlight();
  },
  highlight() {
    this.root.querySelectorAll('[data-sentence]').forEach(el => {
      const active = el.dataset.sentence === this.activeSentence;
      el.classList.toggle('pr-speaking',active); el.setAttribute('aria-pressed',String(active));
    });
  },
  async play(page,index) {
    this.stopAudio(); const token = this.playToken, epoch = this.epoch;
    const row = page.sentences[index], key = row.language + '\n' + row.text;
    this.activeSentence = page.id + ':' + index; this.highlight();
    this.el('play-status').textContent = this.t('generating');
    try {
      if (!this.audioCache.has(key)) {
        const controller = new AbortController(); this.speechController = controller;
        const blob = await this.request('speech',{text:row.text,language:row.language},{audio:true,controller});
        if (token !== this.playToken || epoch !== this.epoch) return;
        this.audioCache.set(key,{url:URL.createObjectURL(blob),size:blob.size});
        let total = [...this.audioCache.values()].reduce((sum,x) => sum+x.size,0);
        while (total > 24 * 1024 * 1024 || this.audioCache.size > 40) {
          const first = this.audioCache.keys().next().value, old = this.audioCache.get(first);
          total -= old.size; URL.revokeObjectURL(old.url); this.audioCache.delete(first);
        }
      }
      if (token !== this.playToken) return;
      this.audio.src = this.audioCache.get(key).url; this.audio.playbackRate = this.rate; this.audio.preservesPitch = true;
      this.audio.onended = () => { if (token === this.playToken) this.stopAudio(); };
      this.audio.onerror = () => { if (token === this.playToken) { this.stopAudio(); this.el('play-status').textContent = this.t('speechFailed'); } };
      await this.resumeAudio();
    } catch (error) {
      if (token !== this.playToken || epoch !== this.epoch) return;
      this.stopAudio(); this.el('play-status').textContent = this.t(this.errorCode(error));
    }
  },
  async resumeAudio() {
    const token = this.playToken;
    try {
      await this.audio.play();
      if (token === this.playToken) { this.el('resume').hidden = true; this.el('play-status').textContent = this.t('playing'); }
    } catch (error) {
      if (token !== this.playToken) return;
      if (error.name === 'NotAllowedError') { this.el('resume').hidden = false; this.el('play-status').textContent = this.t('tapPlay'); }
      else { this.stopAudio(); this.el('play-status').textContent = this.t('speechFailed'); }
    }
  },
  renderImage(page, content) {
    const controls = this.node('div',undefined,'pr-image-tools');
    controls.append(this.node('strong',this.t('imageRead')));
    const label = this.node('label',this.t('zoom') + ' '), zoom = this.node('select');
    zoom.setAttribute('aria-label',this.t('zoom'));
    for (const value of [1,1.5,2,3]) {
      const option = this.node('option',value === 1 ? this.t('fit') : value + '×');
      option.value = value; zoom.append(option);
    }
    zoom.value = page.zoom || 1; label.append(zoom); controls.append(label);
    const viewport = this.node('div',undefined,'pr-image-viewport');
    const stage = this.node('div',undefined,'pr-image-stage');
    stage.style.width = ((page.zoom || 1) * 100) + '%';
    zoom.onchange = () => { page.zoom = Number(zoom.value); stage.style.width = (page.zoom * 100) + '%'; };
    const img = this.node('img'); img.src = page.image; img.alt = this.t('original'); img.className='pr-original';
    stage.append(img);
    let mapped = 0;
    page.sentences.forEach((row,index) => {
      let hasRegion = false;
      for (const box of Array.isArray(row.regions) ? row.regions.slice(0,16) : []) {
        if (!box) continue;
        const {x1,y1,x2,y2} = box;
        if (![x1,y1,x2,y2].every(n => Number.isFinite(n) && n >= 0 && n <= 1000) || x2 <= x1 || y2 <= y1) continue;
        const hit = this.node('button',undefined,'pr-image-sentence'); hit.type='button';
        hit.dataset.sentence = page.id+':'+index; hit.lang=row.language;
        hit.setAttribute('aria-label',this.t('readSentence',{number:index+1,text:row.text})); hit.title=row.text;
        Object.assign(hit.style,{left:x1/10+'%',top:y1/10+'%',width:(x2-x1)/10+'%',height:(y2-y1)/10+'%'});
        hit.onclick = () => this.play(page,index); stage.append(hit); hasRegion=true;
      }
      if (hasRegion) mapped++;
    });
    viewport.append(stage); content.append(controls,viewport);
    if (page.state === 'ready' && page.sentences.length) {
      content.append(this.node('p',this.t(mapped === page.sentences.length ? 'imageHint' : 'mappingPartial'),'pr-note'));
    }
  },
  renderUsage(page, content) {
    const usage = page.usage;
    if (!usage) return;
    const details = this.node('details',undefined,'pr-usage');
    details.append(this.node('summary',this.t('usageTitle')));
    details.append(this.node('p',this.t('usageTokens',{input:usage.input_tokens,output:usage.output_tokens,
      cached:usage.cached_input_tokens,writes:usage.cache_write_tokens || 0,total:usage.total_tokens}),'pr-note'));
    const cost = Number.isFinite(usage.estimated_usd) ? this.t('usageCost',{cost:usage.estimated_usd.toFixed(6),date:usage.price_date}) : this.t('usageUnknown');
    details.append(this.node('p',usage.cache_hit ? this.t('usageCached') : cost,'pr-note'));
    if (usage.cache_hit) details.append(this.node('p',this.t('usageOriginal') + ' ' + cost,'pr-note'));
    content.append(details);
  },
  render() {
    this.el('count').textContent = this.t('pages',{count:this.pages.length});
    this.el('recognize').disabled = this.recognizing || this.importing || !this.pages.some(p => p.state !== 'ready');
    this.el('album').disabled = this.importing; this.el('native').disabled = this.importing;
    this.el('snap').disabled = this.importing || this.pages.length >= 10;
    const thumbs = this.el('thumbs'); thumbs.replaceChildren();
    this.pages.forEach((page,index) => {
      const card = this.node('div',undefined,'pr-thumb');
      const select = this.button('page',() => { this.stopAudio(); this.selected = page.id; this.render(); });
      select.textContent = ''; select.setAttribute('aria-label',this.t('pageNumber',{number:index+1}));
      select.setAttribute('aria-pressed',String(page.id===this.selected));
      const image = this.node('img'); image.src = page.image; image.alt = ''; select.append(image,this.node('span',this.t('pageNumber',{number:index+1})));
      const remove = this.button('remove',() => {
        this.stopAudio(); this.pages = this.pages.filter(p => p!==page);
        if (this.selected===page.id) this.selected=this.pages[0]?.id; this.render();
      }); remove.disabled = this.recognizing;
      card.append(select,this.node('small',this.t(page.state)),remove); thumbs.append(card);
    });
    const content = this.el('content'); content.replaceChildren();
    const page = this.pages.find(p => p.id===this.selected);
    if (!page) { content.append(this.node('div','📖','pr-empty-icon'),this.node('h3',this.t('empty')),this.node('p',this.t('emptyHint'),'pr-note')); return; }
    this.renderImage(page,content);
    if (page.state==='error') {
      content.append(this.node('p',this.t(page.error),'pr-error'));
      const retry = this.button('retry',() => this.recognize(page)); retry.disabled=this.recognizing; content.append(retry);
    }
    if (page.state!=='ready') { content.append(this.node('p',this.t(page.state))); return; }
    this.renderUsage(page,content);
    if (!page.sentences.length) content.append(this.node('p',this.t('noText')));
    if (page.review) content.append(this.node('p',this.t('review'),'pr-error'));
    if (page.sentences.length) content.append(this.node('h3',this.t('sentenceList')));
    page.sentences.forEach((row,index) => {
      const section = this.node('section',undefined,'pr-sentence');
      const play = this.node('button',row.text,'pr-sentence-play'); play.type='button'; play.lang=row.language;
      play.dataset.sentence = page.id+':'+index; play.onclick=() => this.play(page,index);
      const edit = this.button('edit',() => {
        this.stopAudio(); const area = this.node('textarea'); area.value=row.text; area.maxLength=800; area.setAttribute('aria-label',this.t('edit'));
        const language = this.node('select'); language.setAttribute('aria-label',this.t('language'));
        for (const [value,label] of [['zh-CN','中文'],['en-US','English']]) { const o=this.node('option',label); o.value=value; language.append(o); }
        language.value=row.language;
        const save=this.button('save',() => {
          if (!area.value.trim() || area.value.trim().length>800) { this.status('textInvalid'); return; }
          row.text=area.value.trim(); row.language=language.value; row.uncertain=false; this.render();
        });
        section.replaceChildren(area,language,save,this.button('cancel',() => this.render())); area.focus();
      });
      section.append(this.node('small',String(index+1).padStart(2,'0')),play,edit);
      if (row.uncertain) section.append(this.node('p',this.t('uncertain'),'pr-error'));
      content.append(section);
    }); this.highlight();
  }
};
document.addEventListener('learningReady', () => PhotoReading.init());
