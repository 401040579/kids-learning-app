// 地面上的方向、采蜜与移动分层摆放。播放时地图只读，失败现场保留到下一次起飞。
function ButterflyBoard(dialog, sound) {
  const root = dialog.querySelector('.bt-map');
  const el = s => root.querySelector(s);
  const grid = el('.bt-cells'), actor = el('.bt-actor'), palette = el('.bt-palette');
  const icons = { forward:'↑', left:'↶', right:'↷', back:'⤾', jump:'≈', flip:'⟳', nectar:'🌸', glide:'🌈', cha:'♫', samba:'🥁', twirl:'✧', erase:'⌫' };
  const names = ['north','east','south','west'];
  const turns = ['left','right','back'];
  const {levels, start, isLand, finale} = ButterflyTrail;
  const drafts = new Map();
  let level = 0, program, undo = [], cleared = new Set(), tool = 'forward';
  let pose, padX, padY, run, timer, beat, won, warning, message, pointer, ghost;
  const rows = () => levels[level];
  const coord = key => {
    const [x,y] = key.split(',').map(Number);
    return String.fromCharCode(65+x) + (y+1);
  };
  function t(key, values = {}) {
    return I18n.t('btMap.' + key).replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');
  }
  function say(key, values = {}) {
    message = [key,values];
    el('.bt-status').textContent = t(key,values) + (warning ? t('unsaved') : '');
  }
  function levelMenu() {
    el('.bt-picker').setAttribute('aria-label', t('choose'));
    el('.bt-picker').replaceChildren(...levels.map((r,i) =>
      new Option((cleared.has(i) ? '✓ ' : '') + t('level',{n:i+1}) + ' · ' + t('map'+(i+1)),i)));
    el('.bt-picker').value = level;
    el('.bt-trail-count').textContent = t('clears',{n:cleared.size});
  }
  function available() {
    const list = ['forward'];
    if (level >= 2) list.push('left','right');
    if (level >= 11) list.push('back');
    if (level >= 5) list.push('jump');
    if (rows().some(row=>row.includes('F'))) list.push('nectar');
    if (rows().some(row=>row.includes('*'))) list.push('flip');
    if (rows().some(row=>row.includes('R'))) list.push('glide');
    list.push('cha');
    if (level >= 7) list.push('samba');
    if (level >= 16) list.push('twirl');
    return [...list, 'erase'];
  }
  function controls() {
    for (const b of palette.children) {
      b.disabled = Boolean(run);
      b.setAttribute('aria-pressed', String(b.dataset.tool === tool));
    }
    el('.bt-help').textContent = t('help.'+tool);
    el('.bt-undo').disabled = !!run || !undo.length;
    el('.bt-run').textContent = t(run ? 'stop' : won ? level < levels.length-1 ? 'next' : 'replay' : 'run');
  }
  function makePalette() {
    palette.innerHTML = available().map(id =>
      `<button type="button" data-tool="${id}"><b aria-hidden="true">${icons[id]}</b><span>${t(id)}</span></button>`).join('');
    controls();
  }
  function cell(key) { return grid.querySelector('[data-cell="'+key+'"]'); }
  function labels(c) {
    if (finale[c]) return t('mermaid')+' · '+t(finale[c]);
    if ('^>v<'.includes(c)) return t('start')+' · '+t(names['^>v<'.indexOf(c)]);
    return t(({'*':'mat', F:'flower', R:'rainbow'})[c] || 'sand');
  }
  function paint(key) {
    const b = cell(key), tile = program.get(key) || {};
    const placed = [tile.heading,tile.flower && 'nectar',tile.action].filter(Boolean);
    b.querySelector('.bt-glyphs').textContent = placed.map(id=>icons[id]).join(' ');
    b.classList.toggle('bt-ink', !!placed.length);
    b.setAttribute('aria-label', coord(key)+' · '+labels(b.dataset.terrain)+' · '+placed.map(id=>t(id)).join(' '));
  }
  function terrain(c) {
    if (finale[c]) return `<span class="bt-mermaid">🧜🏽‍♀️</span><span class="bt-invite">${icons[finale[c]]}</span>`;
    if ('^>v<'.includes(c)) return ['↑','→','↓','←']['^>v<'.indexOf(c)];
    return ({'*':'★', F:'🌺', R:'🌈'})[c] || '';
  }
  function board() {
    const map = rows(), w = map[0].length, h = map.length;
    // 小关卡留下沿岸景色；坐标和实际行走仍以地图左上角为原点。
    padX = w <= 3 ? 1 : 0;
    padY = h <= 2 ? 1 : 0;
    const wrapper = el('.bt-board');
    wrapper.style.setProperty('--cols',w+2*padX);
    wrapper.style.setProperty('--rows',h+2*padY);
    grid.setAttribute('aria-label',t('board'));
    grid.replaceChildren();
    for (let y = -padY; y < h+padY; y++) {
      for (let x = -padX; x < w+padX; x++) {
        const c = map[y]?.[x], key = x+','+y;
        if (!isLand(c)) {
          const obstacle = document.createElement('span');
          obstacle.className = !c ? 'bt-edge' : c === '~' ? 'bt-puddle' : 'bt-rock';
          obstacle.textContent = c === '~' ? '≈' : c === '#' ? ['✿','❧','✦','❦'][(x+2*y)%4] : '';
          obstacle.setAttribute('aria-hidden','true');
          grid.append(obstacle);
          continue;
        }
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.cell = key; b.dataset.terrain = c;
        b.className = 'bt-trail-tile' + (finale[c] ? ' bt-goal' : '');
        b.innerHTML = '<small>'+coord(key)+'</small><span class="bt-symbol" aria-hidden="true">'+terrain(c)+'</span><b class="bt-glyphs"></b>';
        grid.append(b); paint(key);
      }
    }
    place(pose, '');
  }
  function place(next, move) {
    pose = next;
    actor.style.left = 'calc(100% * '+(pose.x+padX+.5)+' / var(--cols))';
    actor.style.top = 'calc(100% * '+(pose.y+padY+.5)+' / var(--rows))';
    // 0→3 是向左一拍，连续跨过北方时仍按实际方向旋转。
    const angles = {left:-90,right:90,back:180};
    const angle = angles[move] ? Number(actor.dataset.angle)+angles[move] : move ? Number(actor.dataset.angle) : pose.dir*90;
    actor.dataset.angle = angle;
    actor.style.setProperty('--angle',angle+'deg');
    actor.dataset.pose = [pose.x,pose.y,pose.dir].join(',');
    actor.removeAttribute('data-move');
    if (move) { void actor.offsetWidth; actor.dataset.move = move; }
  }
  function stop() {
    clearTimeout(timer); run = null;
    root.classList.remove('bt-flying','bt-duet');
    actor.removeAttribute('data-move');
    cancelDrag();
    sound.silence();
  }
  function resetScene() {
    grid.querySelectorAll('.bt-fault,.bt-picked,.bt-lit').forEach(b=>b.classList.remove('bt-fault','bt-picked','bt-lit'));
    root.classList.remove('bt-duet');
    place(start(rows()), '');
  }
  function pause() {
    if (!run) return;
    stop(); resetScene(); say('paused'); controls();
  }
  function load(i) {
    stop();
    level = i; tool = 'forward'; won = false; warning = false;
    if (!drafts.has(i)) drafts.set(i, new Map());
    program = drafts.get(i); undo = [];
    pose = start(rows());
    levelMenu(); board(); makePalette();
    const intro = ({0:'first',5:'waterIntro',7:'inviteIntro',8:'flowerIntro',10:'gymIntro',11:'backIntro',13:'glideIntro'})[i] || 'intro';
    say(intro);
  }
  function open() {
    const data = SafeStorage.getObject('kidsLearningData');
    cleared = new Set((Array.isArray(data.butterflyCleared) ? data.butterflyCleared : [])
      .filter(i=>Number.isInteger(i) && i>=0 && i<levels.length));
    const next = levels.findIndex((_,i)=>!cleared.has(i));
    load(next < 0 ? 0 : next);
  }
  function saveClear() {
    const data = SafeStorage.getObject('kidsLearningData');
    cleared.add(level);
    if (SafeStorage.issues.has('kidsLearningData') || (data.butterflyCleared !== undefined && !Array.isArray(data.butterflyCleared))) return false;
    data.butterflyCleared = [...new Set([...(data.butterflyCleared || []),...cleared])];
    return safeSetItem('kidsLearningData',JSON.stringify(data));
  }
  function edit(key, id) {
    if (run || !cell(key)) return;
    const old = program.get(key), value = {...old};
    if (id === 'erase' && !old) return;
    if (turns.includes(id)) value.heading = old?.heading === id ? undefined : id;
    else if (id === 'nectar') value.flower = !old?.flower;
    else if (id !== 'erase') value.action = id;
    if (id !== 'erase' && old?.action === id) return;
    undo.push([key,old]);
    if (id === 'erase' || !value.heading && !value.flower && !value.action) program.delete(key);
    else program.set(key,value);
    won = false; warning = false;
    resetScene(); paint(key); cell(key).classList.add('bt-lit');
    say(!program.has(key) ? 'clearedCell' : value.action ? 'placed' : 'missing',{cell:coord(key)});
    controls();
  }
  function nextBeat() {
    const frame = run.next().value;
    grid.querySelector('.bt-lit')?.classList.remove('bt-lit');
    const key = frame.key || [frame.pose.x,frame.pose.y].join(',');
    const b = cell(key);
    if (frame.error) {
      stop(); b.classList.add('bt-fault');
      const code = frame.error === 'missing' && finale[b.dataset.terrain] ? 'needDance' : frame.error;
      say(code,{cell:coord(key),move:t(frame.wanted || finale[b.dataset.terrain] || 'cha')});
      controls(); return;
    }
    b.classList.add('bt-lit');
    if (frame.harvest) b.classList.add('bt-picked');
    place(frame.pose,frame.move); sound.melody(frame.move); beat++;
    say('beat',{n:beat,cell:coord(key),move:t(frame.move)});
    if (frame.win) {
      root.classList.add('bt-duet');
      root.dataset.dance = frame.move;
      timer = setTimeout(()=>{
        run = null; won = true;
        root.classList.remove('bt-flying');
        warning = !saveClear();
        say(cleared.size === levels.length ? 'all' : 'win',{n:level+1,move:t(frame.move)});
        levelMenu(); controls(); sound.silence();
      },1250);
    } else timer = setTimeout(nextBeat, 520);
  }
  function fly() {
    stop(); won = false; warning = false; beat = 0;
    resetScene(); void actor.offsetWidth;
    run = ButterflyTrail.run(rows(),program);
    root.classList.add('bt-flying'); sound.wakeAudio(); controls();
    timer = setTimeout(nextBeat,150);
  }
  function cancelDrag() {
    ghost?.remove(); ghost = null; pointer = null;
    grid.querySelector('.bt-hover')?.classList.remove('bt-hover');
  }
  palette.addEventListener('pointerdown', e=>{
    const b = e.target.closest('[data-tool]');
    if (!b || run || !e.isPrimary || e.button !== 0) return;
    pointer = { id:e.pointerId, x:e.clientX, y:e.clientY, tool:b.dataset.tool };
    b.setPointerCapture(e.pointerId);
  });
  function under(e) {
    const target = document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-cell]');
    return target && grid.contains(target) ? target : null;
  }
  palette.addEventListener('pointermove', e=>{
    if (!pointer || e.pointerId !== pointer.id) return;
    if (!ghost && Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)<7) return;
    if (!ghost) {
      ghost = document.createElement('span'); ghost.className = 'bt-ghost';
      ghost.textContent = icons[pointer.tool]; dialog.append(ghost);
    }
    ghost.style.left = e.clientX+'px'; ghost.style.top = e.clientY+'px';
    grid.querySelector('.bt-hover')?.classList.remove('bt-hover'); under(e)?.classList.add('bt-hover');
  });
  palette.addEventListener('pointerup', e=>{
    if (!pointer || e.pointerId !== pointer.id) return;
    if (ghost) {
      const target = under(e); tool = pointer.tool;
      if (target) edit(target.dataset.cell,tool);
      controls();
    }
    cancelDrag();
  });
  palette.addEventListener('pointercancel', cancelDrag);
  palette.addEventListener('lostpointercapture', cancelDrag);
  el('.bt-picker').addEventListener('change', e=>load(Number(e.target.value)));
  root.addEventListener('click', e=>{
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.tool) { tool = b.dataset.tool; controls(); }
    if (b.dataset.cell) edit(b.dataset.cell,tool);
    if (b.dataset.map === 'undo' && !run && undo.length) {
      const [key,old] = undo.pop();
      if (old) program.set(key,old); else program.delete(key);
      won = false; warning = false; resetScene(); paint(key); say('undone'); controls();
    }
    if (b.dataset.map === 'run') {
      if (run) pause();
      else if (won && level < levels.length-1) load(level+1);
      else fly();
    }
  });
  function translate() {
    levelMenu(); makePalette();
    for (const key of grid.querySelectorAll('[data-cell]')) paint(key.dataset.cell);
    if (message) say(...message);
  }
  return { open, pause, stop, translate, running:()=>Boolean(run) };
}
