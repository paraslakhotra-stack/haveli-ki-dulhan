// Phone screens — one per step kind. mount(root, view, ctx) → { update(view), destroy(), fx(event) }.
import { h, clear, add } from '/shared/dom.js';
import { face, nameOf } from '/shared/photos.js';
import { runeSvg, glassSvg, brideSvg, clockSvg, candleSvg } from '/shared/figures.js';
import { audio, LULLABY } from '/shared/audio.js';
import { drawVesper } from '/tv/fx.js';
import nipplejs from '/vendor/nipplejs.mjs';

const ROMAN = ['I', 'II', 'III'];
const card = (...kids) => h('div', { class: 'card' }, ...kids);
const title = (kicker, text) => h('div', { class: 'p-head' }, h('div', { class: 'p-kicker' }, kicker), text ? h('div', { class: 'p-title' }, text) : null);
const watch = (text = 'Eyes on the TV') => h('div', { class: 'watch' }, h('div', { class: 'eye' }, '👁'), h('div', {}, text));
function timer(remaining) {
  const el = h('div', { class: 'p-timer' });
  const end = performance.now() + (remaining || 0);
  const tick = () => { if (!el.isConnected) return; const left = Math.max(0, end - performance.now()); el.textContent = `${Math.ceil(left / 1000)}`; el.classList.toggle('low', left < 10000); if (left > 0) requestAnimationFrame(tick); };
  if (remaining != null) requestAnimationFrame(tick);
  return el;
}
function rerender(render) {
  return (root, v, ctx) => {
    const box = h('div', { class: 'p-screen' });
    add(root, box);
    let state = {};
    const draw = (vv) => { clear(box); render(box, vv, ctx, state); };
    draw(v);
    return { update: draw, destroy() { state.destroy?.(); box.remove(); } };
  };
}
// Hold-to-press buttons (used by the candle & the possessed reveal) — pointer + touch safe.
function holdButton(el, onDown, onUp) {
  let down = false;
  const start = (e) => { e.preventDefault(); if (down) return; down = true; onDown(); };
  const end = () => { if (!down) return; down = false; onUp(); };
  el.addEventListener('pointerdown', start);
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, end);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return () => end();
}

// ------------------------------------------------------------------ LOBBY
const lobby = rerender((box, v, ctx) => {
  add(box, 
    h('div', { class: 'brand small' }, h('div', { class: 'brand-n' }, 'NIGHTFALL')),
    card(face(v.me.id, 120, { ring: '#ffb35c' }), h('div', { class: 'p-title' }, v.me.name), h('div', { class: 'fine' }, 'Your name is in the guest book.'),
      h('button', { class: 'btn ghost sm', onclick: ctx.changePhoto }, v.me.photo ? '📷 Retake photo' : '📷 Add your photo')),
  );
  if (v.me.isHost) {
    add(box, card(h('div', { class: 'p-title' }, '♛ You are the host'), h('p', { class: 'fine' }, "Tell the manor who the groom is, then begin the night. You'll also get pause & skip controls."),
      h('button', { class: 'btn big blood', onclick: () => document.getElementById('host-btn').click() }, 'Set up the night')));
  } else {
    add(box, watch('Waiting for the host to begin the night…'));
  }
  add(box, h('details', { class: 'fold' }, h('summary', {}, '📲 Keep Nightfall on your home screen'),
    h('p', { class: 'fine' }, 'iPhone: tap Share → "Add to Home Screen". Android: tap ⋮ → "Add to Home screen" / "Install app". It opens full-screen, like an app.')),
  h('button', { class: 'link', onclick: () => { if (confirm('Leave the guest book?')) ctx.leave(); } }, 'Not you? Leave'));
});

// ------------------------------------------------------------------ STORY
function story(root, v, ctx) {
  const box = h('div', { class: 'p-screen story' });
  add(root, box);
  const line = h('div', { class: 'p-line' });
  add(box, title(v.chapter.numeral ? `Chapter ${v.chapter.numeral}` : v.chapter.title, ''), watch('Eyes on the TV'), line);
  const timers = [];
  const lines = v.step.lines || [];
  const elapsed = Math.max(0, (v.step.total || 0) - (v.remaining ?? 0));
  lines.forEach((l, i) => {
    const at = l.at - elapsed;
    if (at + l.ms < 0) return;
    timers.push(setTimeout(() => {
      line.className = `p-line ${l.sp === 'v' ? 'vesper' : ''}`;
      line.textContent = l.sp === 'b' ? '' : l.text;
      if (l.sp === 'v') ctx.buzz([30, 40, 30]);
      if (l.sp === 'b') incomingCall(box, v, l, ctx);
      if (v.step.fx === 'rise' && i === lines.length - 1) { ctx.flash('rgba(160,0,20,.9)', 900); ctx.buzz([200, 80, 200, 80, 400]); audio.groan(1.2, 0, 0.8); }
      if (v.step.fx === 'win' && i === lines.length - 1) { ctx.flash('rgba(255,240,210,.8)', 1200); ctx.buzz([60, 60, 60]); }
    }, Math.max(0, at)));
  });
  return { update() {}, destroy() { timers.forEach(clearTimeout); box.remove(); } };
}
function incomingCall(box, v, l, ctx) {
  const ov = h('div', { class: 'call' }, h('div', { class: 'call-avatar' }, '👰'), h('div', { class: 'call-name' }, v.bride), h('div', { class: 'call-sub' }, 'incoming call…'));
  const answer = h('button', { class: 'call-btn yes' }, '📞');
  const decline = h('button', { class: 'call-btn no' }, '📞');
  const text = h('div', { class: 'call-text hidden' });
  const pick = () => {
    ring.forEach(clearTimeout);
    answer.remove(); decline.remove();
    ov.querySelector('.call-sub').textContent = 'connected · 00:0' + Math.floor(Math.random() * 9);
    text.classList.remove('hidden');
    let i = 0;
    const chars = [...l.text];
    const type = () => { if (!text.isConnected) return; text.textContent = chars.slice(0, ++i).join(''); if (i < chars.length) setTimeout(type, 38); };
    type();
    audio.static(1.5, 0.8);
  };
  answer.addEventListener('click', pick);
  decline.addEventListener('click', pick); // she calls back. she always calls back.
  add(ov, text, h('div', { class: 'call-btns' }, decline, answer));
  add(box, ov);
  const ring = [];
  for (let k = 0; k < 4; k++) ring.push(setTimeout(() => { ctx.buzz([400, 200, 400]); audio.ring(1.5); }, k * 1500));
  setTimeout(() => { if (!text.classList.contains('hidden')) return; pick(); }, Math.min(5000, l.ms * 0.4));
  setTimeout(() => { ov.classList.add('drop'); ctx.flash('rgba(0,0,0,.95)', 600); setTimeout(() => ov.remove(), 700); }, l.ms + 400);
}

// ------------------------------------------------------------------ CHAPTER TITLE / SORTING / CHAPTER END
const chapterTitle = rerender((box, v) => {
  box.classList.add('center');
  add(box, h('div', { html: clockSvg(v.step.clock, 140) }), h('div', { class: 'p-kicker' }, v.step.numeral ? `Chapter ${v.step.numeral}` : v.step.id === 'prologue' ? 'Prologue' : 'Epilogue'), h('div', { class: 'p-title big' }, v.step.title));
});

function sorting(root, v, ctx) {
  const box = h('div', { class: 'p-screen center' }, h('div', { html: candleSvg(true, '#ffb35c', 140) }), h('div', { class: 'p-title' }, 'The candles are choosing…'));
  add(root, box);
  const t = setTimeout(() => {
    const tc = v.me.teamColor || '#efe6d8';
    clear(box);
    add(box, h('div', { html: candleSvg(true, tc, 160) }), h('div', { class: 'p-kicker' }, 'Your coven'), h('div', { class: 'p-title big', style: { color: tc } }, v.me.teamName || '—'), h('p', { class: 'fine' }, 'Find your coven-mates. You win and lose together tonight.'));
    ctx.buzz([60, 40, 160]);
    audio.musicBoxNote(81, 0, 1.4);
  }, v.step.revealIn || 0);
  return { update() {}, destroy() { clearTimeout(t); box.remove(); } };
}

const chapterEnd = rerender((box, v, ctx) => {
  const s = v.step;
  box.classList.add('center');
  add(box, title(`${v.chapter.title} — complete`, s.rank != null ? `Your coven: ${['1st', '2nd', '3rd'][s.rank]}` : ''));
  add(box, card(h('div', { class: 'big-num', style: { color: v.me.teamColor } }, `+${s.souls}`), h('div', { class: 'fine' }, 'Souls for your coven')));
  if (s.relic && s.relic.team === v.me.team) add(box, card(h('div', { class: 'p-kicker' }, 'Relic won'), h('div', { class: 'p-title' }, s.relic.name), h('div', { class: 'fine' }, s.relic.desc)));
  if (s.gotClue) {
    add(box, card(h('div', { class: 'p-kicker' }, `Ring Piece ${s.piece}`), h('div', {}, 'An engraving was whispered to you alone.'), h('button', { class: 'btn ghost sm', onclick: () => document.getElementById('inv-btn').click() }, '📜 Read it (keep it secret)')));
    ctx.buzz([30, 30, 30, 30, 90]);
  }
});

const forfeit = rerender((box, v, ctx) => {
  const s = v.step;
  if (s.sub === 'none') { add(box, watch()); return; }
  add(box, title("Vesper's Dues", ''));
  if (s.mine && s.sub === 'offer') {
    ctx.buzz([200, 100, 200]);
    add(box, card(h('div', { class: 'p-kicker' }, 'The lowest score must pay…'), h('div', { class: 'ff' }, s.card),
      h('div', { class: 'row' }, h('button', { class: 'btn blood', onclick: () => ctx.send({ type: 'forfeit', accept: true }) }, 'Accept (+50 Souls)'), h('button', { class: 'btn ghost', onclick: () => ctx.send({ type: 'forfeit', accept: false }) }, 'Pass'))));
  } else if (s.sub === 'perform') {
    add(box, card(h('div', { class: 'ff' }, s.card), h('div', { class: 'fine' }, s.mine ? 'Perform it now! Tap when the debt is paid.' : `${s.name} is paying their dues…`),
      s.mine || v.me.isHost ? h('button', { class: 'btn', onclick: () => ctx.send({ type: 'forfeitDone' }) }, '✓ Done') : null));
  } else {
    add(box, card(face(s.pid, 90), h('div', { class: 'ff small' }, s.card), h('div', { class: 'fine' }, s.sub === 'passed' ? `${s.name} passed.` : s.sub === 'done' ? 'Debt paid.' : `${s.name} must decide…`)));
  }
});

// ------------------------------------------------------------------ SÉANCE
function seance(root, v, ctx) {
  const box = h('div', { class: 'p-screen' });
  add(root, box);
  let lastTapper = null;
  let lastProgress = 0;
  const draw = (vv) => {
    const s = vv.step;
    clear(box);
    add(box, title(`The Séance · Round ${s.round}`, s.sub === 'reveal' ? 'The circle has spoken' : ''));
    if (s.spectator || s.member === false) { add(box, watch('Help your coven by talking — you\'ll get runes next round.')); return; }
    if (s.sub === 'reveal' || s.done) { add(box, card(h('div', { class: 'p-title' }, s.done ? '✦ Your sigil is complete' : 'The candle drowned in wax…'))); return; }
    add(box, h('div', { class: 'p-row' }, timer(vv.remaining), h('div', { class: 'progress' }, Array.from({ length: s.length }, (_, i) => h('span', { class: i < s.progress ? 'on' : '' })))));
    if (s.clues.length) {
      add(box, h('div', { class: 'pages' }, h('div', { class: 'p-kicker' }, 'Your torn diary pages — read them aloud'), s.clues.map((c) => h('div', { class: 'page' }, c.text))));
    } else add(box, h('div', { class: 'fine center' }, 'You hold no pages this round — listen, and tap when you hold the candle.'));
    const status = s.stunned ? h('div', { class: 'tapper bad' }, '☠ The dead are awake… wait') : s.isTapper ? h('div', { class: 'tapper me' }, '🕯 YOU hold the candle — tap the next rune') : h('div', { class: 'tapper' }, `🕯 ${s.tapperName} holds the candle — tell them what to tap`);
    add(box, status);
    const pad = h('div', { class: `pad ${s.isTapper && !s.stunned ? 'live' : ''}` });
    for (const r of s.pad) {
      const lit = false;
      const b = h('button', { class: `rune ${lit ? 'lit' : ''}`, disabled: !(s.isTapper && !s.stunned) ? 'disabled' : null, html: runeSvg(r, { size: 54, color: '#efe6d8', stroke: 6 }) });
      b.addEventListener('click', () => { ctx.send({ type: 'rune', rune: r }); audio.ui('tap'); ctx.buzz(15); });
      add(pad, b);
    }
    add(box, pad);
    if (s.isTapper && lastTapper !== true) { ctx.buzz([80, 40, 80]); audio.musicBoxNote(81, 0, 1); }
    if (s.progress > lastProgress) audio.ui('ok');
    lastTapper = s.isTapper;
    lastProgress = s.progress;
  };
  draw(v);
  return {
    update: draw,
    destroy() { box.remove(); },
    fx(e) { if (e.type === 'scare' && e.team === ctx.view.me.team) { ctx.flash('rgba(160,0,20,.9)', 700); ctx.buzz([300, 60, 300]); audio.stinger(0.5); } },
  };
}

// ------------------------------------------------------------------ QUIZ
const quiz = rerender((box, v, ctx) => {
  const s = v.step;
  add(box, title(`${s.round} · ${s.n}/${s.total}`, ''));
  add(box, h('div', { class: 'q' }, s.q.text));
  if (s.sub === 'ask') {
    add(box, timer(v.remaining));
    const opts = h('div', { class: s.qtype === 'accuse' ? 'faces-grid' : 'opts' });
    s.q.options.forEach((o, i) => {
      const chosen = s.mine === o.id;
      const b = s.qtype === 'accuse'
        ? h('button', { class: `face-btn ${chosen ? 'chosen' : ''}` }, face(o.id, 64), h('span', {}, o.label))
        : h('button', { class: `opt ${chosen ? 'chosen' : ''}` }, h('b', {}, 'ABCD'[i]), h('span', {}, o.label));
      if (s.mine == null) b.addEventListener('click', () => { ctx.send({ type: 'answer', id: o.id }); audio.ui('tap'); ctx.buzz(20); });
      else b.disabled = true;
      add(opts, b);
    });
    add(box, opts);
    if (s.mine != null) add(box, h('div', { class: 'sealed' }, '🔒 Answer sealed in wax'));
  } else if (s.reveal) {
    const R = s.reveal;
    if (s.qtype === 'accuse') add(box, card(face(R.accused, 100, { possessed: true }), h('div', { class: 'p-title' }, `${nameOf(R.accused)}`), h('div', { class: 'fine' }, R.gain ? `+${R.gain} — you agreed with the room` : 'The room disagreed with you.')));
    else {
      const right = s.mine != null && s.mine === R.correct;
      const label = s.q.options.find((o) => o.id === R.correct)?.label;
      add(box, card(h('div', { class: `verdict ${right ? 'ok' : 'bad'}` }, right ? '✓ Correct' : s.mine == null ? '⌛ Too slow' : '✗ Wrong'), h('div', { class: 'fine' }, `Answer: ${label}`), R.gain ? h('div', { class: 'big-num' }, `+${R.gain}`) : null));
      if (right) { ctx.buzz([30, 30, 60]); audio.ui('good'); } else audio.ui('bad');
    }
  }
});

// ------------------------------------------------------------------ TRIALS
function trial(root, v, ctx) {
  const box = h('div', { class: 'p-screen' });
  add(root, box);
  let game = null; // active mini-game controller
  let key = '';
  const draw = (vv) => {
    const s = vv.step;
    const k = `${s.sub}:${s.gsub || ''}:${s.gr ?? ''}`;
    if (game && k === key) { game.update?.(vv); return; }
    game?.destroy?.();
    game = null;
    key = k;
    clear(box);
    add(box, title(`Trial ${s.n} of ${s.total}`, s.title));
    if (s.sub === 'intro') { add(box, card(h('div', { class: 'how' }, s.how)), h('div', { class: 'fine center' }, 'Get ready…')); return; }
    if (s.sub === 'reveal') {
      add(box, card(h('div', { class: 'big-num' }, `#${s.rank}`), h('div', { class: 'fine' }, `of ${s.of} · +${s.pts} points`)));
      if (s.blessing) { add(box, card(h('div', { class: 'p-kicker' }, 'Blessing earned'), h('div', { class: 'p-title' }, s.blessing.name), h('div', { class: 'fine' }, `${s.blessing.desc} in the zombie fight`))); ctx.buzz([60, 40, 60, 40, 200]); }
      else if (s.champ) add(box, h('div', { class: 'fine center' }, `${s.champ} wins the blessing.`));
      return;
    }
    const localStart = performance.now() - Math.max(0, (s.playMs || 0) - (vv.remaining ?? 0));
    game = (TRIALS[s.trial] || (() => null))(box, vv, ctx, localStart);
  };
  draw(v);
  return { update: draw, destroy() { game?.destroy?.(); box.remove(); } };
}

function scareOverlay(box, ctx) {
  const img = h('div', { class: 'phone-scare', style: { backgroundImage: `url(${drawVesper(500)})` } });
  add(box, img);
  ctx.buzz([250, 50, 250]);
  audio.stinger(0.7);
  setTimeout(() => img.remove(), 600);
}

const TRIALS = {
  candle(box, v, ctx, start) {
    const s = v.step;
    const btn = h('button', { class: 'candle-btn', html: candleSvg(true, '#ffb35c', 230) });
    const msg = h('div', { class: 'fine center' }, 'Press and HOLD the flame.');
    if (s.out) { add(box, card(h('div', { class: 'p-title' }, 'Your candle went out.'), h('div', { class: 'big-num' }, `${(s.score / 1000).toFixed(1)}s`))); return null; }
    let held = false;
    const release = holdButton(btn, () => { held = true; ctx.send({ type: 'hold', on: true }); btn.classList.add('held'); msg.textContent = "Don't. Let. Go."; ctx.buzz(20); }, () => { if (!held) return; held = false; ctx.send({ type: 'hold', on: false }); btn.classList.remove('held'); btn.innerHTML = candleSvg(false, '#ffb35c', 230); msg.textContent = 'Your candle went out…'; audio.ui('bad'); });
    add(box, btn, msg);
    const timers = (s.scares || []).map((at) => setTimeout(() => scareOverlay(box, ctx), Math.max(0, at - (performance.now() - start))));
    return { destroy() { timers.forEach(clearTimeout); release(); } };
  },
  musicbox(box, v, ctx) {
    const s = v.step;
    const colors = ['#c8102e', '#efe6d8', '#4fb3ff', '#ffb35c'];
    let level = s.score || 0;
    let input = [];
    let playing = false;
    let dead = s.failed;
    const status = h('div', { class: 'p-title center' }, dead ? 'The box snapped shut.' : 'Listen…');
    const keys = h('div', { class: 'mb-keys' });
    const btns = colors.map((c, i) => {
      const b = h('button', { class: 'mb-key', style: { '--kc': c } });
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (playing || dead) return;
        light(i);
        audio.simonNote(i);
        input.push(i);
        const idx = input.length - 1;
        if (s.melody[idx] !== i) { dead = true; ctx.send({ type: 'mb', fail: true }); status.textContent = `The box snapped shut — ${level} notes`; ctx.buzz([300]); scareOverlay(box, ctx); return; }
        if (input.length === level + 1) {
          level++;
          ctx.send({ type: 'mb', level });
          status.textContent = `${level} notes ✓`;
          ctx.buzz(30);
          if (level >= s.melody.length) { dead = true; status.textContent = 'You played the whole lullaby. She is… pleased.'; return; }
          setTimeout(playback, 700);
        }
      });
      add(keys, b);
      return b;
    });
    const light = (i) => { btns[i].classList.add('on'); setTimeout(() => btns[i].classList.remove('on'), 260); };
    const timers = [];
    function playback() {
      if (dead) return;
      playing = true;
      input = [];
      status.textContent = 'Listen…';
      const n = level + 1;
      for (let k = 0; k < n; k++) timers.push(setTimeout(() => { light(s.melody[k]); audio.simonNote(s.melody[k]); }, 300 + k * 480));
      timers.push(setTimeout(() => { playing = false; status.textContent = 'Your turn'; }, 300 + n * 480));
    }
    add(box, status, keys, h('div', { class: 'fine center' }, `Score: ${level}`));
    if (!dead) setTimeout(playback, 500);
    return { destroy() { timers.forEach(clearTimeout); dead = true; } };
  },
  banish(box, v, ctx) {
    let pending = 0;
    let total = v.step.score || 0;
    const n = h('div', { class: 'big-num' }, `${total}`);
    const btn = h('button', { class: 'tap-btn' }, 'TAP!');
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); pending++; total++; n.textContent = total; btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit'); if (total % 5 === 0) ctx.buzz(8); });
    const iv = setInterval(() => { while (pending > 0) { const k = Math.min(8, pending); pending -= k; ctx.send({ type: 'taps', n: k }); } }, 250);
    add(box, n, btn, h('div', { class: 'fine center' }, 'Push her back up the chimney!'));
    return { destroy() { clearInterval(iv); } };
  },
  blink(box, v, ctx, start) {
    const s = v.step;
    const stage = h('button', { class: 'blink-stage' }, h('div', { class: 'fine' }, 'Tap ONLY on the white sigil'));
    add(box, stage);
    let active = null;
    const timers = [];
    s.cues.forEach((c, i) => {
      timers.push(setTimeout(() => {
        active = { i, real: c.real, t: performance.now(), done: false };
        clear(stage);
        add(stage, c.real ? h('div', { class: 'sigil', html: runeSvg('eye', { size: 170, color: '#ffffff', glow: true, stroke: 7 }) }) : h('div', { class: 'vface', style: { backgroundImage: `url(${drawVesper(400)})` } }));
        if (!c.real) audio.whisper(0.5);
        timers.push(setTimeout(() => { if (active?.i === i) { active = null; clear(stage); } }, 1100));
      }, Math.max(0, c.at - (performance.now() - start))));
    });
    stage.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (!active || active.done) return;
      active.done = true;
      const rt = performance.now() - active.t;
      ctx.send({ type: 'blink', i: active.i, rt: Math.round(rt) });
      clear(stage);
      add(stage, h('div', { class: `blink-res ${active.real ? 'ok' : 'bad'}` }, active.real ? `${Math.round(rt)} ms` : 'You tapped HER.'));
      if (!active.real) { ctx.buzz([300]); audio.stinger(0.5); } else { ctx.buzz(15); audio.ui('ok'); }
    });
    return { destroy() { timers.forEach(clearTimeout); } };
  },
  gallery(box, v, ctx) {
    const s = v.step;
    if (s.gsub === 'show') { add(box, watch('Look at the TV! Count the possessed portraits.')); return null; }
    if (s.gsub === 'result') { add(box, card(h('div', { class: `verdict ${s.mine === s.answer ? 'ok' : 'bad'}` }, s.mine === s.answer ? '✓ Correct' : '✗ Wrong'), h('div', { class: 'fine' }, `${s.answer} were possessed`))); return null; }
    add(box, h('div', { class: 'q' }, `Round ${s.gr + 1}: how many were possessed?`));
    const opts = h('div', { class: 'opts num' });
    for (const n of s.options) {
      const b = h('button', { class: `opt ${s.mine === n ? 'chosen' : ''}` }, h('b', {}, String(n)));
      if (s.mine == null) b.addEventListener('click', () => { ctx.send({ type: 'count', v: n }); audio.ui('tap'); });
      else b.disabled = true;
      add(opts, b);
    }
    add(box, opts);
    return null;
  },
};

// ------------------------------------------------------------------ POSSESS
function possess(root, v, ctx) {
  const box = h('div', { class: 'p-screen center' });
  add(root, box);
  const hidden = h('div', { class: 'fate' }, h('div', { class: 'p-title' }, 'Hold to read your fate'), h('div', { class: 'fine' }, 'Hide your screen from everyone.'));
  const reveal = v.step.possessed
    ? h('div', { class: 'fate red' }, h('div', { class: 'p-title big' }, 'YOU ARE POSSESSED'), h('p', {}, 'Vesper is inside you. Steer your coven to the WRONG glass. Do not get caught at the Unmasking.'), h('p', { class: 'fine' }, 'One of your clue pages will be her lie. Sell it.'))
    : h('div', { class: 'fate' }, h('div', { class: 'p-title' }, 'You are… still yourself.'), h('p', {}, 'Probably. Someone in this room is not. Watch them.'));
  reveal.classList.add('hidden');
  const btn = h('button', { class: 'hold-zone' }, hidden, reveal);
  holdButton(btn, () => { hidden.classList.add('hidden'); reveal.classList.remove('hidden'); if (v.step.possessed) { ctx.buzz([400, 100, 400]); audio.heartbeat(1); } }, () => { reveal.classList.add('hidden'); hidden.classList.remove('hidden'); });
  add(box, btn);
  return { update() {}, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ TOAST / VOW
function writeFlow(root, v, ctx) {
  const box = h('div', { class: 'p-screen' });
  add(root, box);
  let draft = '';
  let lastSub = null;
  const draw = (vv) => {
    const s = vv.step;
    const isVow = s.key === 'vow';
    if (s.sub === 'write' && lastSub === 'write' && box.querySelector('textarea')) {
      // keep the keyboard open; just reflect the "sealed" state
      box.querySelector('.sealed')?.classList.toggle('hidden', !s.mine);
      return;
    }
    lastSub = s.sub;
    clear(box);
    add(box, title(isVow ? 'The Vow of the Bachelors' : 'The Toast', ''));
    add(box, h('div', { class: 'q' }, isVow ? `I, ${vv.groom}, solemnly swear…` : s.prompt));
    if (s.sub === 'write') {
      const ta = h('textarea', { class: 'field', maxlength: '90', rows: '3', placeholder: isVow ? 'I promise to…' : 'Your answer (keep it office-safe!)' });
      ta.value = draft || s.mine || '';
      ta.addEventListener('input', () => { draft = ta.value; });
      const sendBtn = h('button', { class: 'btn' }, s.mine ? 'Update' : 'Seal it');
      sendBtn.addEventListener('click', () => { if (!ta.value.trim()) return; ctx.send({ type: 'write', text: ta.value }); sendBtn.textContent = 'Update'; audio.ui('ok'); ctx.buzz(20); ta.blur(); });
      add(box, timer(vv.remaining), ta, sendBtn, h('div', { class: `sealed ${s.mine ? '' : 'hidden'}` }, '🔒 Sealed — you can still edit it'));
    } else if (s.sub === 'vet') {
      const extra = vv.host?.extra?.vet;
      if (extra) {
        add(box, h('div', { class: 'p-kicker' }, '♛ Host: hide anything that could hurt someone'));
        for (const a of extra) {
          const row = h('label', { class: `vet ${a.hidden ? 'off' : ''}` }, h('input', { type: 'checkbox', checked: a.hidden ? null : 'checked' }), h('span', {}, h('b', {}, a.name), ` — ${a.text}`));
          row.querySelector('input').addEventListener('change', (e) => ctx.send({ type: 'veto', pid: a.pid, hidden: !e.target.checked }));
          add(box, row);
        }
        add(box, h('button', { class: 'btn', onclick: () => ctx.send({ type: 'vetDone' }) }, 'Approve & continue'));
      } else add(box, watch('The host is tasting every line for poison…'), s.hiddenMine ? h('div', { class: 'fine center' }, 'Yours was a little too spicy — it stays secret.') : null);
    } else if (s.sub === 'vote') {
      add(box, timer(vv.remaining), h('div', { class: 'p-kicker' }, 'Vote for your favourite (not your own)'));
      for (const c of s.choices || []) {
        const b = h('button', { class: `tcard-btn ${s.myVote === c.pid ? 'chosen' : ''}` }, c.text);
        if (!s.myVote) b.addEventListener('click', () => { ctx.send({ type: 'vote', pid: c.pid }); audio.ui('tap'); });
        else b.disabled = true;
        add(box, b);
      }
      if (!(s.choices || []).length) add(box, watch());
    } else if (s.sub === 'reveal') {
      add(box, isVow ? watch('Listen — your vow is being read aloud…') : card(h('div', { class: 'big-num' }, `${s.votesForMe || 0} 🍷`), h('div', { class: 'fine' }, 'votes for your toast')));
    } else add(box, watch());
  };
  draw(v);
  return { update: draw, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ GLASS
const glass = rerender((box, v, ctx) => {
  const s = v.step;
  add(box, title('The Poisoned Glass', ''));
  if (s.spectator || s.member === false) { add(box, watch('Help your coven out loud!')); return; }
  if (s.sub === 'reveal' || s.done) { add(box, card(h('div', { class: 'p-title' }, s.done ? '✦ You found the poison' : 'Time ran out…'), h('div', { class: 'fine' }, `It was glass ${s.answer}.`))); return; }
  add(box, timer(v.remaining));
  add(box, h('div', { class: 'pages' }, h('div', { class: 'p-kicker' }, 'Your clues'), s.clues.map((c) => h('div', { class: `page ${c.lie ? 'lie' : ''}` }, c.text, c.lie ? h('em', {}, " — Vesper's lie. Sell it.") : null))));
  const grid = h('div', { class: 'glasses' });
  for (const gl of s.glasses) {
    const pickers = s.picks.filter((p) => p.pos === gl.pos).map((p) => p.pid);
    const b = h('button', { class: `glass-btn ${s.myPick === gl.pos ? 'chosen' : ''}` }, h('div', { html: glassSvg(gl, { size: 74 }) }), h('div', { class: 'g-n' }, gl.pos), h('div', { class: 'g-faces' }, pickers.map((pid) => face(pid, 22))));
    b.addEventListener('click', () => { ctx.send({ type: 'pick', pos: gl.pos }); audio.ui('tap'); ctx.buzz(15); });
    if (s.lockMs > 0) b.disabled = true;
    add(grid, b);
  }
  add(box, grid);
  add(box, h('div', { class: 'fine center' }, s.lockMs > 0 ? '☠ Wrong glass! Locked out…' : 'The glass locks when EVERY coven member picks the same one.'));
});

// ------------------------------------------------------------------ UNMASK
const unmask = rerender((box, v, ctx) => {
  const s = v.step;
  add(box, title('The Unmasking', s.sub === 'reveal' ? '' : 'Who drank the wine?'));
  if (s.sub === 'none') { add(box, watch()); return; }
  if (s.sub === 'vote') {
    add(box, timer(v.remaining));
    const grid = h('div', { class: 'faces-grid' });
    for (const c of s.choices) {
      const b = h('button', { class: `face-btn ${s.myVote === c.pid ? 'chosen' : ''}` }, face(c.pid, 64), h('span', {}, c.name));
      if (!s.myVote) b.addEventListener('click', () => { ctx.send({ type: 'vote', pid: c.pid }); audio.ui('tap'); });
      else b.disabled = true;
      add(grid, b);
    }
    add(box, grid);
  } else {
    add(box, card(face(s.possessed, 110, { possessed: true }), h('div', { class: 'p-title' }, nameOf(s.possessed)), h('div', { class: 'fine' }, s.wasMe ? (s.caught ? 'They caught you.' : 'You fooled them all. +300') : s.caught ? 'Caught!' : 'They got away with it…')));
  }
});

// ------------------------------------------------------------------ ARENA (controller)
function arena(root, v, ctx) {
  const box = h('div', { class: 'p-screen pad-screen' });
  add(root, box);
  const hud = h('div', { class: 'hud' });
  const zone = h('div', { class: 'stick-zone' }, h('div', { class: 'stick-hint' }, 'Drag here to move'));
  const powerBtn = h('button', { class: 'act power' });
  const throwBtn = h('button', { class: 'act throw' });
  const down = h('div', { class: 'downed hidden' }, h('div', { class: 'p-title' }, "YOU'RE DOWN"), h('div', { class: 'fine' }, 'Crawl to a friend — or wait to rise again…'), h('div', { class: 'revive' }, h('div', {})));
  add(box, hud, h('div', { class: 'pad-row' }, zone, h('div', { class: 'acts' }, powerBtn, throwBtn)), down);
  let mx = 0; let my = 0; let dirty = true; let lastHp = null;
  const manager = nipplejs.create({ zone, mode: 'dynamic', color: '#efe6d8', size: 140, multitouch: false, fadeTime: 120, restOpacity: 0.6 });
  manager.on('move', (_, data) => {
    const f = Math.min(1, (data.force || 0) * 1.15);
    const vx = data.vector?.x || 0;
    const vy = data.vector?.y || 0;
    const m = Math.hypot(vx, vy) || 1;
    mx = (vx / m) * f; my = -(vy / m) * f;
    dirty = true;
  });
  manager.on('end', () => { mx = 0; my = 0; dirty = true; });
  let lastSent = 0;
  let alive = true;
  const stop = () => { if (!alive) return; alive = false; clearInterval(iv); try { manager.destroy(); } catch { /* already gone */ } };
  const iv = setInterval(() => {
    const now = performance.now();
    if (dirty || now - lastSent > 400) { ctx.send({ type: 'move', x: +mx.toFixed(3), y: +my.toFixed(3) }); dirty = false; lastSent = now; }
  }, 50);
  powerBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); ctx.send({ type: 'power' }); ctx.buzz([20, 30, 60]); });
  throwBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); ctx.send({ type: 'throw' }); ctx.buzz(30); });
  const ICON = { coldfeet: '❄', prenup: '📜', lastdance: '💃', bestman: '👻', bouquet: '💐' };
  const NAME = { coldfeet: 'Cold Feet', prenup: 'Prenup', lastdance: 'Last Dance', bestman: 'Best Man', bouquet: 'Bouquet' };
  let lastTier = null;
  const draw = (vv) => {
    const s = vv.step;
    if (s.sub === 'results') {
      stop();
      clear(box);
      add(box, title('The garden is clear', ''), card(h('div', { class: 'big-num' }, `${s.kills ?? 0} 💀`), h('div', { class: 'fine' }, 'zombies put back in the ground')));
      return;
    }
    const u = s.hud;
    clear(hud);
    if (!u) { add(hud, h('div', { class: 'fine' }, 'Joining the fight…')); return; }
    const hpPct = Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100));
    add(hud, 
      h('div', { class: 'hud-top' }, h('span', {}, u.phase === 'warmup' ? 'GET READY' : `WAVE ${u.wave} · ${u.title}`), h('b', {}, `${u.kills} 💀`)),
      h('div', { class: 'hp' }, h('div', { class: `hp-fill ${hpPct < 30 ? 'low' : ''}`, style: { width: `${hpPct}%` } })),
      h('div', { class: 'hud-top' }, h('span', { class: 'weapon' }, `🔫 ${u.weapon}`), u.next ? h('small', {}, `${u.next.name} at ${u.next.at} kills`) : h('small', {}, 'MAX POWER')),
      u.bossHp != null ? h('div', { class: 'hp boss' }, h('div', { class: 'hp-fill', style: { width: `${u.bossHp}%` } })) : null,
    );
    clear(powerBtn);
    add(powerBtn, h('span', { class: 'ic' }, u.power ? ICON[u.power] : '✦'), h('small', {}, u.power ? NAME[u.power] : 'no power'));
    powerBtn.disabled = !u.power || u.down;
    clear(throwBtn);
    add(throwBtn, h('span', { class: 'ic' }, '⚗'), h('small', {}, `Holy water ×${u.grenades}`));
    throwBtn.disabled = !u.grenades || u.down;
    down.classList.toggle('hidden', !u.down);
    down.querySelector('.revive > div').style.width = `${u.revive}%`;
    if (lastHp != null && u.hp < lastHp - 3) { ctx.buzz(40); box.classList.remove('hurt'); void box.offsetWidth; box.classList.add('hurt'); }
    if (lastTier != null && u.tier > lastTier) { ctx.buzz([40, 30, 40, 30, 120]); ctx.flash('rgba(255,210,122,.5)', 500); }
    lastHp = u.hp;
    lastTier = u.tier;
  };
  draw(v);
  return { update: draw, destroy() { stop(); box.remove(); } };
}

// ------------------------------------------------------------------ CRYPT
function crypt(root, v, ctx) {
  const box = h('div', { class: 'p-screen' });
  add(root, box);
  let code = '';
  let lastLeft = null;
  const draw = (vv) => {
    const s = vv.step;
    clear(box);
    add(box, title('The Crypt', s.sub === 'solved' ? 'It opens!' : s.sub === 'failed' ? 'Sealed forever' : 'Share your engravings OUT LOUD'));
    if (s.sub !== 'play') { add(box, card(h('div', { class: 'big-num' }, s.code || ''), h('div', { class: 'fine' }, s.sub === 'solved' ? 'The ring is whole again.' : 'The ring reforges itself… in agony.'))); return; }
    const inv = vv.inventory.filter((i) => i.kind === 'crypt');
    add(box, h('div', { class: 'pages' }, h('div', { class: 'p-kicker' }, 'Your engravings'), inv.map((i) => h('div', { class: 'page' }, i.text))));
    const display = h('div', { class: 'code' }, [0, 1, 2, 3].map((i) => h('span', {}, code[i] || '·')));
    const keys = h('div', { class: 'keypad' });
    for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '↵']) {
      const b = h('button', {}, k);
      b.addEventListener('click', () => {
        if (k === '⌫') code = code.slice(0, -1);
        else if (k === '↵') { if (code.length === 4) { ctx.send({ type: 'code', code }); code = ''; ctx.buzz(30); } }
        else if (code.length < 4) code += k;
        audio.ui('tick');
        display.replaceWith(h('div', { class: 'code' }, [0, 1, 2, 3].map((i) => h('span', {}, code[i] || '·'))));
        draw(ctx.view);
      });
      add(keys, b);
    }
    add(box, timer(vv.remaining), display, keys, h('div', { class: 'fine center' }, `${s.attemptsLeft} attempts left${s.last ? ` · last try: ${s.last}` : ''}`));
    if (lastLeft != null && s.attemptsLeft < lastLeft) { ctx.flash('rgba(160,0,20,.8)', 500); ctx.buzz([200]); }
    lastLeft = s.attemptsLeft;
  };
  draw(v);
  return { update: draw, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ BRIDES
const brides = rerender((box, v, ctx) => {
  const s = v.step;
  add(box, title('The Three Brides', s.sub === 'vote' ? (s.round === 2 ? 'Last chance' : 'Which one is real?') : ''));
  add(box, h('div', { class: 'whispers' }, s.whispers.map((w) => h('div', { class: `whisper ${w.red ? 'red' : ''}` }, w.diary ? h('small', {}, '📖 from the Lace Diary') : null, `“${w.text}”`))));
  add(box, h('div', { class: 'fine center' }, 'White whispers are true. Red whispers are Vesper — and she lies.'));
  if (s.sub === 'vote') {
    const row = h('div', { class: 'bride-btns' });
    s.brides.forEach((b, i) => {
      const gone = s.removed.includes(i);
      const btn = h('button', { class: `bride-btn ${s.myVote === i ? 'chosen' : ''} ${gone ? 'gone' : ''}` }, h('div', { html: brideSvg(b, { size: 150 }) }), h('b', {}, ROMAN[i]));
      if (!gone && s.myVote == null) btn.addEventListener('click', () => { ctx.send({ type: 'bride', idx: i }); audio.ui('tap'); ctx.buzz(20); });
      else btn.disabled = true;
      add(row, btn);
    });
    add(box, timer(v.remaining), row);
  } else {
    add(box, watch(s.sub === 'right' ? 'You found her!' : 'Look at the altar…'));
    if (s.sub === 'wrong' || s.sub === 'lost') ctx.buzz([400, 100, 400]);
  }
});

// ------------------------------------------------------------------ CREDITS
const credits = rerender((box, v, ctx) => {
  const s = v.step;
  box.classList.add('center');
  add(box, title('Dawn', s.ending === 'win' ? 'You saved her.' : 'You survived. Mostly.'));
  if (s.awards.length) add(box, card(h('div', { class: 'p-kicker' }, 'Your awards'), s.awards.map((a) => h('div', { class: 'p-title' }, `🏆 ${a}`))));
  add(box, card(h('div', { class: 'big-num' }, `${s.score}`), h('div', { class: 'fine' }, 'points tonight'),
    h('div', { class: 'stats' }, h('span', {}, `💀 ${s.stats.kills}`), h('span', {}, `🧠 ${s.stats.quiz}`), h('span', {}, `🍷 ${s.stats.toastVotes}`), h('span', {}, `🚑 ${s.stats.revives}`))));
  if (v.me.isHost) add(box, h('button', { class: 'btn ghost', onclick: () => { if (confirm('Start a brand new night?')) ctx.hostCmd('restart'); } }, '↺ Play again'));
  add(box, h('p', { class: 'fine' }, 'See you at the wedding. 🥂'));
});

export const PHONE_SCREENS = { lobby, story, chapterTitle, sorting, chapterEnd, forfeit, seance, quiz, trial, possess, toast: writeFlow, vowWrite: writeFlow, glass, unmask, arena, crypt, brides, credits };
export { LULLABY };
