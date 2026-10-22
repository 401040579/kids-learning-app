// 拍照点读：账号书架、本机离线副本与有界语音预加载。切号清除当前播放上下文。
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
  owner() { return LearningAccount.identity?.id || this.offlineOwner; },
  book: null, offlineOwner: null, libraryToken: 0, syncTask: null, saveTimer: null,
  async library() {
    const token=++this.libraryToken, owner=this.owner(), box=this.el('books');
    box.replaceChildren();
    try {
      const local=await PhotoLibrary.books(owner || undefined);
      if (token!==this.libraryToken || !this.isOpen) return;
      if (!owner) {
          const profiles=new Map(local.map(b=>[b.owner,b.accountName]));
          for (const [id,name] of profiles) {
            const b=this.node('button',this.t('offlineShelf',{name})); b.type='button';
            b.onclick=()=>{this.offlineOwner=id;this.library();this.renderBook();};box.append(b);
          }
        return;
      }
      const merged=new Map(local.map(b=>[b.id,b]));
      if (LearningAccount.identity && navigator.onLine) {
        let result;
        try { result=await this.request('books'); } catch(e) { if(token===this.libraryToken)this.bookStatus(typeof e.code==='string'?e.code:'syncFailed'); }
        if (token!==this.libraryToken) return;
        for (const b of result?.books || []) if (!merged.has(b.id) || (!merged.get(b.id).dirty && b.revision>merged.get(b.id).revision)) merged.set(b.id,b);
      }
      if (token!==this.libraryToken) return;
      for (const b of [...merged.values()].sort((a,b)=>(b.updated_at||0)-(a.updated_at||0))) {
        const button=this.node('button',b.title,'pr-book'); button.type='button';button.dataset.book=b.id;
        button.setAttribute('aria-pressed',String(this.book?.id===b.id));
        button.onclick=()=>this.loadBook(b.id);box.append(button);
      }
    } catch(e) { if (token===this.libraryToken) this.bookStatus(this.errorCode(e)); }
  },
  bookStatus(key,vars) { this.el('book-status').textContent=key?this.t(key,vars):''; },
  renderBook() {
    if (document.activeElement!==this.el('book-title')) this.el('book-title').value=this.book?.title || '';
    const editable=!!LearningAccount.identity;
    this.el('book-title').disabled=!editable || !this.book;
    this.el('new-book').disabled=!editable || this.importing || this.recognizing || this.downloading;
    this.el('download').disabled=!this.book || this.downloading || this.recognizing || this.importing;
    this.el('sync').disabled=!editable || !this.book;
    this.el('copy').disabled=!editable || !this.book || this.downloading;
    this.el('delete').disabled=!editable || !this.book || !navigator.onLine || this.downloading;
    this.el('remove-local').disabled=!this.book || this.downloading;
    this.el('book-title').disabled ||= this.downloading;
    this.el('camera').disabled=!editable || this.downloading;
    this.el('album').disabled=this.el('native').disabled=!editable || this.importing || this.downloading;
    this.el('clear').disabled=this.downloading;
    this.el('recognize').disabled ||= !editable || this.downloading;
  },
  async newBook() {
    if (!LearningAccount.identity) { this.status('loginRequired'); return; }
    this.clear();
    const identity=LearningAccount.identity;
    this.book={owner:identity.id,accountName:identity.display_name,id:crypto.randomUUID(),title:this.t('defaultTitle',{date:new Date().toLocaleDateString()}),
      pages:this.pages,revision:0,dirty:true,generation:0,updated_at:Date.now()/1000};
    this.renderBook(); await this.changed(); this.library();
  },
  async changed() {
    if (!this.book || this.book.owner!==LearningAccount.identity?.id) return;
    const book=this.book, epoch=this.epoch;
    book.pages=this.pages; book.dirty=true;book.generation++;book.updated_at=Date.now()/1000;
    this.el('download').disabled=true;
    this.bookStatus('savingLocal');
    try {
      await PhotoLibrary.save(book);
      if (epoch!==this.epoch) return;
      this.bookStatus('savedLocal');
      clearTimeout(this.saveTimer);this.saveTimer=setTimeout(()=>this.syncBook(),650);
      this.offlineState();
    } catch(e) { if (epoch===this.epoch) this.bookStatus(typeof e.code==='string'?e.code:'storageFailed'); }
  },
  async offlineState() {
    const book=this.book,epoch=this.epoch;
    if (!book) return;
    try {
      const complete=await PhotoLibrary.complete(book);
      if (epoch!==this.epoch || this.book!==book) return;
      this.el('offline-state').textContent=this.t(complete?'offlineReady':'offlinePartial');
      this.renderBook();
    } catch { if (epoch===this.epoch) this.bookStatus('storageFailed'); }
  },
  async syncBook() {
    if (this.syncTask) return this.syncTask;
    if (!navigator.onLine || !this.book || this.book.owner!==LearningAccount.identity?.id) return;
    const book=this.book,epoch=this.epoch;
    this.syncTask=(async()=>{
      try {
        await PhotoLibrary.writes.catch(()=>{});
        await PhotoLibrary.save(book);
        while (book.dirty && this.valid(epoch,book.owner)) {
          this.bookStatus('syncingBook');
          if (book.reupload) {
            for (const page of book.pages) {
              const asset=await this.request('assets',{image:page.image});page.image_id=asset.id;
            }
            delete book.reupload;
          }
          if (!book.attempt) {
            // 先上传不可变图片；成功后才原子替换书页清单，避免半本书覆盖旧版本。
            for (const page of book.pages) {
              if (!page.image_id) {
                const result=await this.request('assets',{image:page.image});
                if (!this.valid(epoch,book.owner)) return;
                page.image_id=result.id;
              }
            }
            book.attempt={generation:book.generation,payload:{revision:book.revision,mutation_id:crypto.randomUUID(),title:book.title,
              pages:book.pages.map(p=>({id:p.id,image_id:p.image_id,state:p.state==='processing'?'pending':p.state,
                sentences:p.sentences,review:p.review}))}};
            // 不确定请求结果时保留同一 mutation，重试不会重复创建版本。
            book.attempt=structuredClone(book.attempt);await PhotoLibrary.save(book);
          }
          const result=await this.request('books/'+book.id,book.attempt.payload);
          if (!this.valid(epoch,book.owner)) return;
          book.revision=result.revision;book.dirty=book.generation!==book.attempt.generation;delete book.attempt;
          await PhotoLibrary.save(book);
        }
        if (this.valid(epoch,book.owner)) { this.bookStatus('savedCloud');this.library(); }
      } catch(e) {
        if (e.code==='bookInvalid') book.reupload=true;
        if (this.valid(epoch,book.owner)) this.bookStatus(typeof e.code==='string'?e.code:'syncFailed');
      }
    })().finally(()=>{this.syncTask=null;});
    return this.syncTask;
  },
  async loadBook(id) {
    const owner=this.owner();if (!owner || this.importing || this.recognizing || this.downloading) return;
    await PhotoLibrary.writes.catch(()=>{});
    if (owner!==this.owner() || !this.isOpen) return;
    this.clear();const epoch=this.epoch;
    this.bookStatus('loadingBook');
    try {
      let book=await PhotoLibrary.book(owner,id),localOnly=!LearningAccount.identity || !navigator.onLine;
      if (LearningAccount.identity && navigator.onLine && !book?.dirty) {
        let remote;
        try { remote=(await this.request('books/'+id)).book; } catch(e) { if (!book || e.code==='loginRequired') throw e;localOnly=true; }
        if (remote && (!book || remote.revision!==book.revision)) {
          const prior=book;
          for (const page of remote.pages) {
            const blob=await this.request('assets/'+page.image_id,undefined,{binary:true});
            page.image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
          }
          book={...remote,owner,accountName:LearningAccount.identity.display_name,dirty:false,generation:0,_stamp:prior?._stamp};
          await PhotoLibrary.save(book);
        }
      }
      if (epoch!==this.epoch || owner!==this.owner() || !this.isOpen) return;
      if (!book) throw Object.assign(Error(),{code:'bookMissing'});
      for (const p of book.pages) { if (p.state==='processing') p.state='pending';if(p.state==='error')p.error ||= 'recognitionFailed'; }
      this.book=book;this.pages=book.pages;this.selected=this.pages[0]?.id;
      this.bookStatus(book.dirty?'savedLocal':localOnly?'localCopy':'savedCloud');this.render();this.library();this.offlineState();this.preload(this.pages[0],0);
      if (book.dirty) this.syncBook();
    } catch(e) { if (epoch===this.epoch) this.bookStatus(e.code || 'loadFailed'); }
  },
  async copyBook() {
    if (!this.book || !LearningAccount.identity || this.book.owner!==LearningAccount.identity.id) return;
    const copy=structuredClone(this.book);
    this.clear();
    this.book={...copy,id:crypto.randomUUID(),title:copy.title.slice(0,96)+' (2)',revision:0,generation:0,_stamp:undefined,attempt:undefined};
    this.pages=this.book.pages;this.selected=this.pages[0]?.id;this.render();await this.changed();this.library();
  },
  async removeBook(cloud) {
    const book=this.book;
    if (!book || !confirm(this.t(cloud?'deleteConfirm':'removeConfirm'))) return;
    if (cloud && (!LearningAccount.identity || !navigator.onLine || book.owner!==LearningAccount.identity.id)) return;
    const epoch=this.epoch;
    clearTimeout(this.saveTimer);
    try {
      if (this.syncTask) await this.syncTask;
      if (epoch!==this.epoch) return;
      if (cloud) await this.request('books/'+book.id+'/delete',{revision:book.revision});
      if (epoch!==this.epoch) return;
      this.cancelRequests();const removalEpoch=this.epoch;await PhotoLibrary.remove(book);
      if (removalEpoch===this.epoch) { this.clear();this.library(); }
    } catch(e) { if (epoch===this.epoch) this.bookStatus(typeof e.code==='string'?e.code:'storageFailed'); }
  },
  downloading: false,
  async downloadBook() {
    if (!this.book || this.downloading) return;
    if (!this.pages.length || this.pages.some(p=>p.state!=='ready')) { this.bookStatus('recognizeFirst');return; }
    const epoch=this.epoch,book=this.book;
    this.downloading=true;this.renderBook();
    try {
      await PhotoLibrary.save(book);
      if (navigator.storage?.persist) await navigator.storage.persist().catch(()=>false);
      const rows=[...new Map(book.pages.flatMap(p=>p.sentences).map(r=>[PhotoLibrary.key(r),r])).values()];
      for (let i=0;i<rows.length;i++) {
        if (epoch!==this.epoch || book!==this.book) return;
        this.bookStatus('downloadProgress',{done:i,total:rows.length});
        await this.ensureAudio(rows[i],1);
      }
      if (epoch===this.epoch) { this.bookStatus('downloaded');await this.offlineState(); }
    } catch(e) { if (epoch===this.epoch) this.bookStatus(typeof e.code==='string'?e.code:'downloadFailed'); }
    finally { if (epoch===this.epoch) { this.downloading=false;this.renderBook(); } }
  },
  speechJobs: new Map(), speechQueue: [], runningSpeech: null,
  cancelSpeech() {
    const error=Object.assign(Error(),{code:'cancelled'});
    for (const job of this.speechJobs.values()) { job.epoch=-1;job.controller?.abort();job.reject(error); }
    this.speechJobs.clear();this.speechQueue=[];this.runningSpeech=null;
  },
  ensureAudio(row,priority=0) {
    const owner=this.owner(),key=PhotoLibrary.key(row),epoch=this.epoch;
    if (!owner) return Promise.reject(Object.assign(Error(),{code:'loginRequired'}));
    if (this.speechJobs.get(key)?.epoch!==epoch) this.speechJobs.delete(key);
    if (this.speechJobs.has(key)) {
      const job=this.speechJobs.get(key);job.priority=Math.max(priority,job.priority);
      return job.promise;
    }
    let resolve,reject;
    const promise=new Promise((a,b)=>{resolve=a;reject=b;});
    const job={owner,key,row:{...row},priority,epoch,promise,resolve,reject};
    this.speechJobs.set(key,job);this.speechQueue.push(job);this.pumpSpeech();return promise;
  },
  async pumpSpeech() {
    if (this.runningSpeech || !this.speechQueue.length) return;
    this.speechQueue.sort((a,b)=>b.priority-a.priority);
    const job=this.speechQueue.shift();this.runningSpeech=job;
    try {
      let blob=await PhotoLibrary.audio(job.owner,job.key);
      if (job.epoch!==this.epoch || job.owner!==this.owner()) throw Object.assign(Error(),{code:'cancelled'});
      if (!blob) {
        if (!navigator.onLine || !LearningAccount.identity) throw Object.assign(Error(),{code:'offlineAudio'});
        job.controller=new AbortController();
        blob=await this.request('speech',{text:job.row.text,language:job.row.language},{audio:true,controller:job.controller});
        if (job.epoch!==this.epoch || job.owner!==this.owner()) throw Object.assign(Error(),{code:'cancelled'});
        await PhotoLibrary.saveAudio(job.owner,job.key,blob);
      }
      if (job.epoch!==this.epoch || job.owner!==this.owner()) throw Object.assign(Error(),{code:'cancelled'});
      job.resolve(blob);
    } catch(e) { job.reject(e); }
    finally {
      if (this.speechJobs.get(job.key)===job) this.speechJobs.delete(job.key);
      if (this.runningSpeech===job) { this.runningSpeech=null;this.pumpSpeech(); }
    }
  },
  prioritizeSpeech(key) {
    const running=this.runningSpeech;
    // 点到预加载中的同一句直接复用；不同句的慢请求让位给当前点击。
    if (running && running.key!==key && !this.downloading) {
      running.controller?.abort();
      // 尚未开始网络请求时靠取消标志阻止继续生成。
      running.epoch=-1;
    }
    if (!this.downloading) {
      const keep=[];
      for (const job of this.speechQueue) {
        if (job.key===key) keep.push(job);
        else { this.speechJobs.delete(job.key);job.reject(Object.assign(Error(),{code:'cancelled'})); }
      }
      this.speechQueue=keep;
    }
  },
  preload(page,index) {
    if (!page || page.state!=='ready' || !navigator.onLine || !LearningAccount.identity || document.hidden) return;
    // 限两句；不在后台遍历整本书。完整准备由“下载离线阅读”显式触发。
    for (const row of page.sentences.slice(index,index+2)) this.ensureAudio(row,0).catch(()=>{});
  },
  init() {
    const root = this.node('dialog', undefined, 'photo-reading'); root.id = 'photo-reading';
    root.setAttribute('aria-labelledby', 'pr-title');
    root.innerHTML = `<header class="pr-header"><div><small data-i18n="photo.eyebrow"></small><h2 id="pr-title" data-i18n="photo.title"></h2></div><button id="pr-close" type="button" data-i18n="photo.close"></button></header>
      <p class="pr-note" data-i18n="photo.privacy"></p>
      <section class="pr-library" aria-label="Bookshelf"><div id="pr-books" class="pr-add"></div>
      <div class="pr-add"><button id="pr-new-book" type="button" data-i18n="photo.newBook"></button><label><span data-i18n="photo.bookTitle"></span><input id="pr-book-title" maxlength="100"></label><button id="pr-download" type="button" data-i18n="photo.downloadBook"></button></div>
      <details class="pr-manage"><summary data-i18n="photo.manageBook"></summary><div class="pr-add"><button id="pr-sync" type="button" data-i18n="photo.syncBook"></button><button id="pr-copy" type="button" data-i18n="photo.copyBook"></button><button id="pr-remove-local" type="button" data-i18n="photo.removeDownload"></button><button id="pr-delete" type="button" data-i18n="photo.deleteBook"></button></div></details>
      <p id="pr-book-status" role="status" aria-live="polite"></p><p id="pr-offline-state" class="pr-note"></p></section>
      <div class="pr-add"><button type="button" id="pr-camera" data-i18n="photo.camera"></button><button type="button" id="pr-album" data-i18n="photo.album"></button><button type="button" id="pr-native" data-i18n="photo.nativeCamera"></button><button type="button" id="pr-clear" data-i18n="photo.clear"></button></div>
      <input id="pr-files" type="file" accept="image/*" multiple hidden><input id="pr-capture-file" type="file" accept="image/*" capture="environment" hidden>
      <section id="pr-camera-panel" hidden><video id="pr-video" playsinline autoplay muted></video><div class="pr-add"><button type="button" id="pr-snap" data-i18n="photo.snap"></button><button type="button" id="pr-camera-stop" data-i18n="photo.cameraStop"></button></div></section>
      <p id="pr-status" role="status" aria-live="polite"></p><p id="pr-service" class="pr-note" role="status"></p>
      <div class="pr-workspace"><aside><h3 id="pr-count"></h3><div id="pr-thumbs"></div><button type="button" id="pr-recognize" class="pr-primary" data-i18n="photo.recognize"></button></aside>
      <main><div class="pr-player"><label><span data-i18n="photo.speed"></span> <select id="pr-rate"><option value="0.6">0.6×</option><option value="0.8" selected>0.8×</option><option value="1">1.0×</option><option value="1.2">1.2×</option></select></label><button type="button" id="pr-stop" data-i18n="photo.stop"></button><button type="button" id="pr-resume" hidden data-i18n="photo.tapPlay"></button></div>
      <p id="pr-play-status" role="status" aria-live="polite"></p><div id="pr-content"></div></main></div>`;
    document.body.append(root); this.root = root;
    this.audio = new Audio(); this.audio.preload = 'auto';
    this.el('new-book').onclick=()=>this.newBook();
    this.el('copy').onclick=()=>this.copyBook();
    this.el('delete').onclick=()=>this.removeBook(true);
    this.el('remove-local').onclick=()=>this.removeBook(false);
    this.el('sync').onclick=()=>this.syncBook();
    this.el('download').onclick=()=>this.downloadBook();
    this.el('book-title').onchange=e=>{
      if (!this.book || !e.target.value.trim()) { this.renderBook();return; }
      this.book.title=e.target.value.trim();this.changed();
    };
    window.addEventListener('online',()=>{this.offlineOwner=null;if (this.isOpen) { if (!LearningAccount.identity) this.clear();this.library();this.syncBook();this.render(); }});
    window.addEventListener('offline',()=>{if(this.isOpen)this.library();});
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
    this.el('stop').onclick = () => { this.stopAudio(); this.cancelSpeech(); };
    this.el('rate').onchange = e => { this.rate = Number(e.target.value); this.audio.playbackRate = this.rate; };
    this.el('resume').onclick = () => this.resumeAudio();
    window.addEventListener('accountChanged', () => { this.offlineOwner=null; this.clear(); if (this.isOpen) this.close(); });
    window.addEventListener('languageChanged', () => { if (this.isOpen) { I18n.applyTranslations(); this.render(); this.checkService(); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.stopCamera(); this.stopAudio(); this.cancelSpeech(); } });
    window.addEventListener('pagehide', () => { this.stopCamera(); this.stopAudio(); });
  },
  open() {
    if (this.isOpen) return;
    this.returnFocus = document.activeElement; this.isOpen = true;
    this.previousAnalyticsDisabled = window['ga-disable-G-RCEWX2DDQQ'];
    window['ga-disable-G-RCEWX2DDQQ'] = true;
    this.root.showModal(); I18n.applyTranslations(); this.render(); this.checkService(); this.library(); this.offlineState(); this.syncBook(); this.preload(this.pages.find(p=>p.id===this.selected),0);
  },
  close() {
    this.cancelRequests(); this.stopCamera(); this.stopAudio(); this.isOpen = false;
    this.root.close(); window['ga-disable-G-RCEWX2DDQQ'] = this.previousAnalyticsDisabled;
    this.returnFocus?.focus();
  },
  cancelRequests() {
    this.epoch++; this.libraryToken++; this.cancelSpeech(); this.downloading=false; clearTimeout(this.saveTimer);
    for (const c of this.controllers) c.abort();
    this.controllers.clear(); this.recognizing = false; this.importing = false;
    for (const p of this.pages) if (p.state === 'processing') p.state = 'pending';
  },
  clear() {
    this.cancelRequests(); this.stopCamera(); this.stopAudio();
    for (const item of this.audioCache.values()) URL.revokeObjectURL(item.url);
    this.audioCache.clear(); this.pages = []; this.selected = null; this.book=null;
    this.bookStatus('');this.el('offline-state').textContent='';
    this.status(''); this.render();
  },
  status(key, vars) { this.el('status').textContent = key ? this.t(key, vars) : ''; },
  errorCode(error) { return error.code || (error.name === 'AbortError' ? 'timeout' : 'offline'); },
  valid(epoch, owner) { return this.isOpen && this.epoch === epoch && LearningAccount.identity?.id === owner; },
  async request(path, values, { audio = false, binary = false, controller = new AbortController() } = {}) {
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
      const result = audio || binary ? await response.blob() : await response.json();
      if (!this.valid(epoch, owner)) throw Object.assign(Error(), {code:'accountChanged'});
      if (audio && (!result.type.startsWith('audio/') || result.size > 7 * 1024 * 1024)) throw Object.assign(Error(),{code:'speechFailed'});
      return result;
    } finally { clearTimeout(timer); this.controllers.delete(controller); }
  },
  async checkService() {
    const epoch = this.epoch;
    if (!navigator.onLine) { this.el('service').textContent=this.t('offlineMode');return; }
    try {
      const result = await this.request('status');
      this.el('service').textContent = this.t(result.configured ? 'ready' : 'notConfigured');
    } catch (error) { if (epoch === this.epoch && this.isOpen) this.el('service').textContent = this.t(this.errorCode(error)); }
  },
  async startCamera() {
    if (!this.book && LearningAccount.identity) await this.newBook();
    if (!this.isOpen) return;
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
    if (this.pages.length >= 100) { this.status('pageLimit'); return; }
    const page = {id:crypto.randomUUID(),image:data,state:'pending',sentences:[],review:false,error:''};
    this.pages.push(page); this.changed(); this.selected = page.id; this.render(); this.status('added',{count:this.pages.length});
  },
  snap() {
    if (this.importing || !this.stream) return;
    try { const v = this.el('video'); this.add(this.encode(v,v.videoWidth,v.videoHeight)); }
    catch (e) { this.status(this.errorCode(e)); }
  },
  async importFiles(files) {
    if (!this.book && LearningAccount.identity) await this.newBook();
    if (this.importing || !this.isOpen) return;
    this.importing = true; const epoch = this.epoch; let failures = 0;
    this.render();
    try {
      for (const file of files) {
        if (!this.isOpen || epoch !== this.epoch) break;
        if (this.pages.length >= 100) { this.status('pageLimit'); break; }
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
        this.changed(); this.render();
      }
      this.preload(this.pages.find(p=>p.id===this.selected),0);
    } finally { if (epoch === this.epoch) { this.recognizing = false; this.render(); } }
  },
  stopAudio() {
    this.playToken++;
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
    this.stopAudio(); const token=this.playToken,epoch=this.epoch;
    const row=page.sentences[index],key=PhotoLibrary.key(row);
    this.prioritizeSpeech(key);
    this.activeSentence=page.id+':'+index;this.highlight();
    this.el('play-status').textContent=this.t('generating');
    try {
      if (!this.audioCache.has(key)) {
        const blob=await this.ensureAudio(row,2);
        if (token!==this.playToken || epoch!==this.epoch) return;
        this.audioCache.set(key,{url:URL.createObjectURL(blob),size:blob.size});
        let total=[...this.audioCache.values()].reduce((sum,x)=>sum+x.size,0);
        while (total>24*1024*1024 || this.audioCache.size>40) {
          const first=this.audioCache.keys().next().value,old=this.audioCache.get(first);
          total-=old.size;URL.revokeObjectURL(old.url);this.audioCache.delete(first);
        }
      }
      if (token!==this.playToken || epoch!==this.epoch) return;
      this.audio.src=this.audioCache.get(key).url;this.audio.playbackRate=this.rate;this.audio.preservesPitch=true;
      this.audio.onended=()=>{if(token===this.playToken)this.stopAudio();};
      this.audio.onerror=()=>{if(token===this.playToken){this.stopAudio();this.el('play-status').textContent=this.t('speechFailed');}};
      await this.resumeAudio();if (token===this.playToken && epoch===this.epoch) { this.preload(page,index+1);this.offlineState(); }
    } catch(e) {
      if(token!==this.playToken || epoch!==this.epoch)return;
      this.stopAudio();this.el('play-status').textContent=this.t(typeof e.code==='string'?e.code:'speechFailed');
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
    this.el('snap').disabled = this.importing || this.downloading || this.pages.length >= 100 || !LearningAccount.identity;
    this.renderBook();
    const thumbs = this.el('thumbs'); thumbs.replaceChildren();
    this.pages.forEach((page,index) => {
      const card = this.node('div',undefined,'pr-thumb');
      const select = this.button('page',() => { this.stopAudio(); this.cancelSpeech(); this.selected = page.id; this.render(); this.preload(page,0); });
      select.textContent = ''; select.setAttribute('aria-label',this.t('pageNumber',{number:index+1}));
      select.setAttribute('aria-pressed',String(page.id===this.selected));
      const image = this.node('img'); image.src = page.image; image.alt = ''; select.append(image,this.node('span',this.t('pageNumber',{number:index+1})));
      const remove = this.button('remove',() => {
        this.stopAudio(); this.pages = this.pages.filter(p => p!==page);
        if (this.selected===page.id) this.selected=this.pages[0]?.id; this.changed(); this.render();
      }); remove.disabled = this.recognizing || this.downloading || !LearningAccount.identity;
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
        this.stopAudio(); this.cancelSpeech(); const area = this.node('textarea'); area.value=row.text; area.maxLength=800; area.setAttribute('aria-label',this.t('edit'));
        const language = this.node('select'); language.setAttribute('aria-label',this.t('language'));
        for (const [value,label] of [['zh-CN','中文'],['en-US','English']]) { const o=this.node('option',label); o.value=value; language.append(o); }
        language.value=row.language;
        const save=this.button('save',() => {
          if (!area.value.trim() || area.value.trim().length>800) { this.status('textInvalid'); return; }
          row.text=area.value.trim(); row.language=language.value; row.uncertain=false; this.changed(); this.render();
        });
        section.replaceChildren(area,language,save,this.button('cancel',() => this.render())); area.focus();
      });
      edit.disabled=!LearningAccount.identity || this.downloading;
      section.append(this.node('small',String(index+1).padStart(2,'0')),play,edit);
      if (row.uncertain) section.append(this.node('p',this.t('uncertain'),'pr-error'));
      content.append(section);
    }); this.highlight();
  }
};
document.addEventListener('learningReady', () => PhotoReading.init());
