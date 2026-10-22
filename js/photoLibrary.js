// 私有设备上的书架副本和语音；不混入 localStorage 学习备份，也不作为服务端身份凭证。
const PhotoLibrary = {
  database: null, writes: Promise.resolve(),
  open() {
    if (!this.database) this.database = new Promise((resolve,reject) => {
      const r = indexedDB.open('kids-photo-library',1);
      r.onupgradeneeded = () => {
        for (const [name,key] of [['books','id'],['audio','key']]) {
          r.result.createObjectStore(name,{keyPath:['owner',key]}).createIndex('owner','owner');
        }
      };
      r.onerror = r.onblocked = () => reject(Object.assign(Error('storage'),{code:'storageFailed'}));
      r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); this.database=null; }; resolve(r.result); };
    }).catch(e => { this.database=null; throw e; });
    return this.database;
  },
  async tx(name,mode,run) {
    const db=await this.open();
    return new Promise((resolve,reject) => {
      const tx=db.transaction(name,mode); let value;
      tx.oncomplete=()=>resolve(value);
      tx.onabort=()=>reject(Object.assign(Error('storage'),{code:tx.error?'storageFailed':'localConflict'}));tx.onerror=()=>{};
      try { run(tx.objectStore(name),v=>{value=v;}); } catch(e) { tx.abort(); reject(e); }
    });
  },
  books(owner) {
    return this.tx('books','readonly',(s,set)=>{const r=owner?s.index('owner').getAll(owner):s.getAll();r.onsuccess=()=>set(r.result);});
  },
  book(owner,id) { return this.tx('books','readonly',(s,set)=>{const r=s.get([owner,id]);r.onsuccess=()=>set(r.result);}); },
  save(book) {
    const work=this.writes.catch(()=>{}).then(async()=>{
      const copy=structuredClone(book), stamp=crypto.randomUUID();
      await this.tx('books','readwrite',s=>{
        const r=s.get([copy.owner,copy.id]);
        r.onsuccess=()=>{
          if ((r.result?._stamp || null)!==(copy._stamp || null)) { s.transaction.abort(); return; }
          s.put({...copy,_stamp:stamp});
        };
      });
      book._stamp=stamp;
    });
    this.writes=work; return work;
  },
  key(row) { return 'verbatim-v1\n'+row.language+'\n'+row.text; },
  audio(owner,key) { return this.tx('audio','readonly',(s,set)=>{const r=s.get([owner,key]);r.onsuccess=()=>set(r.result?.blob);}); },
  saveAudio(owner,key,blob) { return this.tx('audio','readwrite',s=>s.put({owner,key,blob})); },
  audioKeys(owner) { return this.tx('audio','readonly',(s,set)=>{const r=s.index('owner').getAllKeys(owner);r.onsuccess=()=>set(new Set(r.result.map(k=>k[1])));}); },
  async complete(book) {
    const keys=await this.audioKeys(book.owner);
    return book.pages.length>0 && book.pages.every(p=>p.image && p.state==='ready' && p.sentences.every(r=>keys.has(this.key(r))));
  },
  async remove(book) {
    await this.writes.catch(()=>{});
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(['books','audio'],'readwrite');
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error || Error('storage'));tx.onerror=()=>{};
      const books=tx.objectStore('books'),audio=tx.objectStore('audio');
      const r=books.index('owner').getAll(book.owner);
      r.onsuccess=()=>{
        const others=r.result.filter(b=>b.id!==book.id);
        const keep=new Set(others.flatMap(b=>b.pages.flatMap(p=>p.sentences.map(r=>this.key(r)))));
        // 清理本账号已无书本引用的语音，包括编辑过的旧句子。
        const keys=audio.index('owner').getAllKeys(book.owner);
        keys.onsuccess=()=>{for (const key of keys.result) if(!keep.has(key[1]))audio.delete(key);};
        books.delete([book.owner,book.id]);
      };
    });
  }
};
