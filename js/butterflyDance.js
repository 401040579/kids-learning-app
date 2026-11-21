// 每一幕的沙滩标志就是乐谱。自由编舞只限制拍数。
const ButterflyDance = (() => {
  const acts = [['jump', 'cha'], ['cha', 'jump', 'cha'], ['jump', 'flip', 'cha', 'flip'], [null, null, null, null]];
  const moves = {
    jump: { icon: '≈', notes: [[0, 392], [.16, 523], [.4, 659]] },
    cha:  { icon: '♫', notes: [[0, 523], [.23, 440], [.46, 523], [.57, 587], [.68, 659]] },
    flip: { icon: '⟳', notes: [[0, 440], [.12, 554], [.24, 659], [.36, 880], [.53, 659]] }
  };
  const dialog = document.getElementById('butterfly-dance');
  const el = selector => dialog.querySelector(selector);
  const t = key => I18n.t('bd.' + key);
  let act = 0, slots = [], selected = 0, beat = -1, playing = false, won = false;
  let sound = true, audio, timer, message, mode;
  const board = ButterflyBoard(dialog, { wakeAudio, melody, silence });
  const free = () => act === acts.length - 1;
  const position = i => 7 + (i + 1) * 84 / slots.length;
  function cue(key, params = {}) {
    message = [key, params];
    el('.bd-cue').textContent = t(key).replace(/\{(\w+)\}/g, (_, k) => k === 'move' ? t(params[k]) : params[k]);
  }
  function silence() {
    if (audio) audio.close().catch(() => {});
    audio = null;
  }
  function stop() {
    clearTimeout(timer);
    playing = false;
    beat = -1;
    dialog.classList.remove('bd-performing');
    el('.bd-dancer').removeAttribute('data-move');
    el('.bd-flight').style.left = '7%';
    silence();
  }
  function setAct(index) {
    stop();
    act = index;
    slots = Array(acts[act].length).fill(null);
    selected = 0;
    won = false;
    cue(free() ? 'free' : 'prompt');
    render();
  }
  function render() {
    el('.bd-acts').setAttribute('aria-label', t('acts'));
    el('.bd-acts').innerHTML = acts.map((_, i) => `<button type="button" data-act="${i}" aria-pressed="${act === i}">${i === 3 ? '✧' : i + 1} · ${t('act' + (i + 1))}</button>`).join('');
    el('.bd-trail').innerHTML = acts[act].map((move, i) =>
      `<span class="bd-mark" data-mark="${move || 'free'}" style="left:${position(i) - (move === 'jump' ? 42 / slots.length : 0)}%">${moves[move]?.icon || '✧'}</span>`).join('');
    el('.bd-stage').dataset.effect = playing && beat >= 0 ? slots[beat] : won ? 'bows' : '';
    // 路线同时以文本提供给读屏；自由编舞没有目标路线。
    el('.bd-stage').setAttribute('role', 'img');
    el('.bd-stage').setAttribute('aria-label', free() ? t('act4') : t('route') + ' · ' + acts[act].map(t).join(' → '));
    el('.bd-slots').innerHTML = slots.map((move, i) =>
      `<button type="button" data-slot="${i}" data-mark="${move || ''}" aria-pressed="${!playing && selected === i}" class="${beat === i ? 'bd-current' : ''}" aria-label="${t('step').replace('{n}', i + 1)} · ${t(move || 'empty')}" ${playing ? 'disabled' : ''}>${moves[move]?.icon || (i + 1)}</button>`).join('');
    el('.bd-moves').innerHTML = Object.entries(moves).map(([id, move]) =>
      `<button type="button" data-add="${id}" data-mark="${id}" ${playing || selected < 0 ? 'disabled' : ''}><b aria-hidden="true">${move.icon}</b>${t(id)}</button>`).join('');
    const play = el('.bd-play');
    play.disabled = !playing && !slots.every(Boolean);
    const next = won && !free();
    play.textContent = (playing ? '■ ' : next ? '➜ ' : '▶ ') + t(playing ? 'stop' : next ? 'next' : won ? 'again' : 'play');
    el('[data-bd="sound"]').textContent = sound ? '🔊' : '🔇';
    el('[data-bd="sound"]').setAttribute('aria-label', t('sound'));
    el('[data-bd="sound"]').setAttribute('aria-pressed', String(sound));
    el('[data-bd="close"]').textContent = '×';
    el('[data-bd="close"]').setAttribute('aria-label', t('close'));
  }
  function wakeAudio() {
    if (!sound) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio ||= new Context();
      audio.resume().catch(() => {});
    } catch { /* 无音频输出时仍可按画面玩。 */ }
  }
  function melody(id) {
    if (!sound || !audio) return;
    const start = audio.currentTime;
    const accents = {
      samba: [[0,392],[.09,523],[.32,659],[.43,523],[.65,784],[.86,659]],
      twirl: [[0,523],[.13,659],[.26,784],[.39,1047],[.57,784],[.76,659],[.9,523]],
      nectar: [[0,587],[.09,740],[.21,880]],
      glide: [[0,392],[.09,494],[.18,587],[.27,740]]
    };
    const notes = moves[id]?.notes || accents[id] || [[0, id === 'forward' ? 440 : 349], [.1, 523]];
    for (const [offset, hz] of notes) {
      const oscillator = audio.createOscillator(), volume = audio.createGain();
      oscillator.type = id === 'cha' ? 'triangle' : 'sine';
      oscillator.frequency.value = hz;
      const at = start + offset;
      volume.gain.setValueAtTime(.001, at);
      volume.gain.exponentialRampToValueAtTime(.12, at + .014);
      volume.gain.exponentialRampToValueAtTime(.001, at + .15);
      oscillator.connect(volume).connect(audio.destination);
      oscillator.start(at);
      oscillator.stop(at + .16);
    }
  }
  function step(i) {
    if (i === slots.length) {
      playing = false;
      won = true;
      beat = -1;
      dialog.classList.remove('bd-performing');
      cue(free() ? 'encore' : 'win');
      render();
      return;
    }
    const move = slots[i];
    if (!free() && move !== acts[act][i]) {
      stop();
      selected = i;
      cue('oops', { n: i + 1, move: acts[act][i] });
      render();
      return;
    }
    beat = i;
    el('.bd-flight').style.left = position(i) + '%';
    const dancer = el('.bd-dancer');
    dancer.removeAttribute('data-move');
    void dancer.offsetWidth; // 连续两步相同也从头播放动作。
    dancer.dataset.move = move;
    melody(move);
    cue('dancing', { n: i + 1, move });
    render();
    timer = setTimeout(() => step(i + 1), 940);
  }
  function perform() {
    stop();
    wakeAudio();
    playing = true;
    won = false;
    selected = -1;
    dialog.classList.add('bd-performing');
    render();
    timer = setTimeout(() => step(0), 180);
  }
  dialog.addEventListener('click', event => {
    const b = event.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.mode) { switchMode(b.dataset.mode); return; }
    if (b.dataset.act !== undefined) {
      setAct(Number(b.dataset.act));
      el(`[data-act="${act}"]`).focus();
    } else if (b.dataset.slot !== undefined && !playing) {
      selected = Number(b.dataset.slot);
      cue('change', { n: selected + 1 });
      render();
      el(`[data-slot="${selected}"]`).focus();
    } else if (b.dataset.add && !playing) {
      if (selected < 0) return;
      slots[selected] = b.dataset.add;
      won = false;
      selected = slots.indexOf(null);
      cue(selected < 0 ? 'ready' : 'change', { n: selected + 1 });
      render();
      (selected < 0 ? el('.bd-play') : el(`[data-add="${b.dataset.add}"]`)).focus();
    } else if (b.dataset.bd === 'play') {
      if (playing) { stop(); cue('ready'); render(); }
      else if (won && !free()) setAct(act + 1);
      else if (slots.every(Boolean)) perform();
    } else if (b.dataset.bd === 'sound') {
      sound = !sound;
      if (!sound) silence();
      if (sound && (playing || board.running())) wakeAudio();
      render();
    } else if (b.dataset.bd === 'close') {
      unlink();
      dialog.close();
    }
  });
  function unlink() {
    if (location.hash === '#butterfly-dance') {
      history.replaceState(history.state, '', location.pathname + location.search);
    }
  }
  dialog.addEventListener('cancel', unlink);
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    board.stop();
    stop();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && board.running()) board.pause();
    if (document.hidden && playing) { stop(); cue('ready'); render(); }
  });
  window.addEventListener('languageChanged', () => {
    if (dialog.open) { render(); cue(...message); if (mode === 'trail') board.translate(); }
  });
  function switchMode(next) {
    board.pause();
    stop();
    mode = next;
    dialog.dataset.mode = mode;
    el('.bd-studio').hidden = mode !== 'studio';
    el('.bt-map').hidden = mode !== 'trail';
    for (const button of dialog.querySelectorAll('[data-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
    if (mode === 'studio') setAct(0);
    else board.translate();
  }
  function open() {
    if (dialog.open) return;
    setAct(0);
    board.open();
    switchMode('trail');
    dialog.showModal();
    RecentlyUsed.track('butterflyDance');
  }
  // 使用 fragment 让已缓存的首页也能直接进入舞台。
  document.addEventListener('learningReady', () => {
    const openLinkedStage = () => {
      if (location.hash === '#butterfly-dance') open();
    };
    queueMicrotask(openLinkedStage);
    window.addEventListener('hashchange', openLinkedStage);
  }, { once: true });
  return { open };
})();
