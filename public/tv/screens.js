// TV screens — one component per step kind. mount(root, view, ctx) → { update(view), destroy() }.
import { h, clear, countdown, teamColor, add } from '/shared/dom.js';
import { face, nameOf } from '/shared/photos.js';
import { runeSvg, glassSvg, brideSvg, clockSvg, candleSvg } from '/shared/figures.js';
import { audio, LULLABY } from '/shared/audio.js';

const ORD = ['1st', '2nd', '3rd', '4th'];
const ROMAN = ['I', 'II', 'III'];
const teamName = (v, id) => v.teams.find((t) => t.id === id)?.name || '';
const playersOf = (v, team) => v.players.filter((p) => p.team === team);
function timerBar(remaining, total) {
  const bar = h('div', { class: 'tbar' }, h('div', { class: 'tbar-fill' }));
  const fill = bar.firstChild;
  const start = performance.now();
  const end = start + (remaining || 0);
  const full = total || remaining || 1;
  const loop = () => {
    if (!bar.isConnected) return;
    const left = Math.max(0, end - performance.now());
    fill.style.width = `${(left / full) * 100}%`;
    fill.classList.toggle('low', left < 10000);
    if (left > 0) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return bar;
}
function header(v, kicker, title) {
  return h('div', { class: 'scr-head' }, h('div', { class: 'kicker' }, kicker), h('div', { class: 'scr-title' }, title));
}
function simple(render) {
  // Re-render on every update (cheap screens).
  return (root, v, ctx) => {
    const box = h('div', { class: 'screen' });
    add(root, box);
    const draw = (vv) => { clear(box); render(box, vv, ctx); };
    draw(v);
    return { update: draw, destroy() { box.remove(); } };
  };
}

// ------------------------------------------------------------------ LOBBY
function lobby(root, v, ctx) {
  const box = h('div', { class: 'screen lobby' });
  add(root, box);
  let known = new Set();
  const left = h('div', { class: 'lobby-left' },
    h('div', { class: 'logo' }, h('div', { class: 'logo-n' }, 'NIGHTFALL'), h('div', { class: 'logo-sub' }, 'The Blackthorn Wedding')),
  );
  const invite = h('div', { class: 'invite' });
  add(left, invite);
  const grid = h('div', { class: 'gb-grid' });
  const foot = h('div', { class: 'gb-foot' });
  add(box, left, h('div', { class: 'guestbook' }, h('div', { class: 'gb-title' }, 'The Guest Book'), grid, foot));
  const draw = (vv) => {
    clear(invite);
    add(invite, 
      h('div', { class: 'inv-head' }, 'You are cordially invited'),
      vv.join?.qr ? h('img', { class: 'qr', src: vv.join.qr, alt: 'Scan to join' }) : h('div', { class: 'qr qr-wait' }, '…'),
      h('div', { class: 'inv-url' }, vv.join?.url || ''),
      h('div', { class: 'inv-steps' }, 'Scan  ·  Add your name & face  ·  Sign the guest book'),
    );
    clear(grid);
    for (const p of vv.players) {
      const isNew = !known.has(p.id);
      const card = h('div', { class: `gb-card ${isNew ? 'new' : ''} ${p.connected ? '' : 'away'}` },
        face(p.id, 118, { ring: p.id === vv.groomId ? '#ffd27a' : null }),
        h('div', { class: 'gb-name' }, p.name),
        p.id === vv.hostId ? h('div', { class: 'gb-tag' }, '♛ host') : null,
        p.id === vv.groomId ? h('div', { class: 'gb-tag groom' }, '💍 the groom') : null,
      );
      add(grid, card);
      if (isNew && known.size) audio.ui('join');
    }
    if (!vv.players.length) add(grid, h('div', { class: 'gb-empty' }, 'The pages are empty… for now.'));
    known = new Set(vv.players.map((p) => p.id));
    clear(foot);
    add(foot, 
      h('span', {}, `${vv.players.length} ${vv.players.length === 1 ? 'guest has' : 'guests have'} signed`),
      h('span', { class: `heat ${vv.heat}` }, vv.heat === 'spicy' ? '🌶 Spicy' : '🕯 Mild'),
      h('span', {}, vv.players.length ? 'The host sets up the night on their phone — then Begins.' : 'Everyone on the same Wi-Fi, then scan the code.'),
    );
  };
  draw(v);
  return { update: draw, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ STORY
function story(root, v, ctx) {
  const box = h('div', { class: 'screen story' });
  add(root, box);
  const callEl = h('div', { class: 'call-overlay hidden' }, h('div', { class: 'call-icon' }, '📞'), h('div', { class: 'call-name' }, `${v.bride}`), h('div', { class: 'call-sub' }, 'calling…'));
  add(box, callEl);
  const elapsed = Math.max(0, (v.step.total || 0) - (v.remaining ?? 0));
  if (v.step.fx === 'rise') ctx.backdrop.params.rise = false;
  ctx.narrator.play(v.step.lines, {
    elapsed,
    speak: !v.fast && v.narration,
    onLine: (line, i) => {
      if (line.sp === 'b') { callEl.classList.remove('hidden'); audio.ring(2); setTimeout(() => callEl.classList.add('hidden'), line.ms); }
      if (v.step.fx === 'call' && i === v.step.lines.findIndex((l) => l.sp === 'b') + 1) { ctx.fx.scare({ level: 0.6 }); }
      if (v.step.fx === 'rise' && i >= v.step.lines.length - 3) { ctx.backdrop.params.rise = true; if (i === v.step.lines.length - 1) { audio.roar(1); audio.stinger(1); ctx.fx.shake(); } }
      if (v.step.fx === 'win' && i === v.step.lines.length - 1) { audio.bell(1.2); ctx.petals(); }
      if (v.step.fx === 'win' && i === 2) { audio.glass(1.4); audio.scream(0.8); ctx.fx.shake(); }
      if (v.step.fx === 'lose' && i === 1) ctx.fx.scare({ level: 0.8 });
      if (line.sp === 'v' && Math.random() < 0.35) audio.creak(0.7);
    },
  });
  if (v.step.beat === 'prologue') setTimeout(() => ctx.backdrop.lightning(), 2600);
  if (v.step.beat === 'epilogue') ctx.embers?.();
  return { update() {}, destroy() { ctx.narrator.stop(); box.remove(); } };
}

// ------------------------------------------------------------------ CHAPTER TITLE
function chapterTitle(root, v) {
  const s = v.step;
  const box = h('div', { class: 'screen chap' },
    h('div', { class: 'chap-clock', html: clockSvg(s.clock, 190) }),
    s.numeral ? h('div', { class: 'chap-num' }, `Chapter ${s.numeral}`) : h('div', { class: 'chap-num' }, s.id === 'prologue' ? 'Prologue' : 'Epilogue'),
    h('div', { class: 'chap-title' }, s.title),
    h('div', { class: 'chap-time' }, s.clock),
  );
  add(root, box);
  audio.bell(1);
  setTimeout(() => audio.bell(0.6), 2400);
  return { update() {}, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ SORTING
function sorting(root, v) {
  const box = h('div', { class: 'screen sorting' }, header(v, 'The Sorting Candles', 'The candles choose your coven'));
  const cols = h('div', { class: 'sort-cols' });
  add(box, cols);
  add(root, box);
  const colEls = {};
  for (const t of v.teams) {
    const list = h('div', { class: 'sort-list' });
    const col = h('div', { class: 'sort-col', style: { '--tc': t.color } },
      h('div', { class: 'sort-candle', html: candleSvg(true, t.color, 120) }),
      h('div', { class: 'sort-name' }, `${t.glyph} ${t.name}`), list);
    colEls[t.id] = list;
    add(cols, col);
  }
  const timers = [];
  const order = v.step.order || [];
  order.forEach((pid, i) => {
    timers.push(setTimeout(() => {
      const p = v.players.find((x) => x.id === pid);
      if (!p || !colEls[p.team]) return;
      colEls[p.team].append(h('div', { class: 'sort-face' }, face(pid, 84, { ring: teamColor(v, p.team) }), h('div', {}, p.name)));
      audio.musicBoxNote(LULLABY[i % LULLABY.length], 0, 1.2);
    }, v.step.startMs + v.step.stepMs * i));
  });
  return { update() {}, destroy() { timers.forEach(clearTimeout); box.remove(); } };
}

// ------------------------------------------------------------------ SÉANCE
function seance(root, v, ctx) {
  const box = h('div', { class: 'screen seance' });
  add(root, box);
  let prev = {};
  const draw = (vv) => {
    clear(box);
    const s = vv.step;
    add(box, header(vv, `Chapter I · The Séance Circle · Round ${s.round} of 2`, s.sub === 'reveal' ? 'The circle has spoken' : 'Describe the runes. Pass the candle.'));
    if (s.sub === 'play') add(box, timerBar(vv.remaining, s.length <= 4 ? 120000 : 150000));
    const lanes = h('div', { class: 'lanes' });
    let maxFrac = 0;
    for (const t of s.teams) {
      const col = teamColor(vv, t.id);
      maxFrac = Math.max(maxFrac, t.progress / t.len);
      const slots = h('div', { class: 'slots' });
      for (let i = 0; i < t.len; i++) {
        const rune = t.seq[i];
        const fresh = rune && (prev[t.id] ?? 0) <= i;
        add(slots, h('div', { class: `slot ${rune ? 'lit' : ''} ${fresh ? 'pop' : ''}`, html: rune ? runeSvg(rune, { size: 70, color: '#ff3b5c', glow: true }) : `<span>${i + 1}</span>` }));
      }
      const status = t.done ? h('div', { class: 'lane-status done' }, `✦ Sigil complete — ${ORD[t.rank] || ''}`)
        : t.stunned ? h('div', { class: 'lane-status bad' }, '☠ The dead woke up — wait…')
          : t.tapper ? h('div', { class: 'lane-status' }, face(t.tapper, 46), h('span', {}, `${nameOf(t.tapper)} holds the candle`)) : null;
      add(lanes, h('div', { class: `lane ${t.done ? 'won' : ''} ${t.stunned ? 'stunned' : ''}`, style: { '--tc': col } },
        h('div', { class: 'lane-team' }, `${vv.teams.find((x) => x.id === t.id)?.glyph || ''} ${teamName(vv, t.id)}`),
        slots, status, t.mistakes ? h('div', { class: 'lane-miss' }, `${t.mistakes} ✗`) : null));
      prev[t.id] = t.progress;
    }
    add(box, lanes);
    ctx.backdrop.params.circleGlow = s.sub === 'reveal' ? 1 : maxFrac;
    if (s.sub === 'reveal' && s.results) {
      add(box, h('div', { class: 'results-row' }, s.results.map((r, i) => h('div', { class: 'res-chip', style: { '--tc': teamColor(vv, r.team) } },
        h('b', {}, `${ORD[i]} · ${teamName(vv, r.team)}`), h('span', {}, r.done ? `${Math.round(r.time / 1000)}s` : `${r.progress}/${r.len} runes`), h('em', {}, `+${r.pts} each`)))));
    }
  };
  draw(v);
  return { update: draw, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ QUIZ
function quiz(root, v) {
  const box = h('div', { class: 'screen quiz' });
  add(root, box);
  let lastSub = null;
  const draw = (vv) => {
    const s = vv.step;
    clear(box);
    add(box, header(vv, `Chapter II · ${s.round} · ${s.n} of ${s.total}`, ''));
    add(box, h('div', { class: 'q-text' }, s.q.text));
    if (s.sub === 'ask') add(box, timerBar(vv.remaining, s.qtype === 'accuse' ? 20000 : 16000));
    const R = s.reveal;
    if (s.qtype === 'accuse') {
      const grid = h('div', { class: 'accuse-grid' });
      for (const o of s.q.options) {
        const votes = R?.counts?.[o.id] || 0;
        add(grid, h('div', { class: `acc-card ${R && R.accused === o.id ? 'accused' : ''}` },
          face(o.id, R && R.accused === o.id ? 150 : 110, { possessed: !!(R && R.accused === o.id) }),
          h('div', { class: 'acc-name' }, o.label),
          R ? h('div', { class: 'acc-votes' }, '●'.repeat(votes)) : null));
      }
      add(box, grid);
      if (R?.accused) add(box, h('div', { class: 'verdict' }, `The diary accuses… ${nameOf(R.accused)}`));
    } else {
      const opts = h('div', { class: 'q-opts' });
      s.q.options.forEach((o, i) => {
        const right = R && o.id === R.correct;
        const pickers = R ? Object.entries(R.picks).filter(([, id]) => id === o.id).map(([pid]) => pid) : [];
        add(opts, h('div', { class: `q-opt ${right ? 'right' : ''} ${R && !right ? 'wrong' : ''}` },
          h('span', { class: 'q-letter' }, 'ABCD'[i]), h('span', { class: 'q-label' }, o.label),
          h('span', { class: 'q-pickers' }, pickers.slice(0, 8).map((pid) => face(pid, 38)))));
      });
      add(box, opts);
      if (R?.fastest) add(box, h('div', { class: 'verdict small' }, face(R.fastest, 54), h('span', {}, `Fastest: ${nameOf(R.fastest)} (+${R.gains[R.fastest]})`)));
    }
    if (s.sub === 'ask') add(box, h('div', { class: 'answered' }, s.answered.map((pid) => face(pid, 44)), h('span', {}, `${s.answered.length} / ${vv.players.filter((p) => p.connected).length} answered`)));
    if (s.sub === 'reveal' && lastSub !== 'reveal') { if (s.qtype === 'accuse') { audio.heartbeat(1); audio.whisper(1); } else audio.ui('good'); }
    lastSub = s.sub;
  };
  draw(v);
  return { update: draw, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ TRIALS
function trial(root, v, ctx) {
  const box = h('div', { class: 'screen trial' });
  add(root, box);
  let sub = null;
  let gsub = null;
  const timers = [];
  const draw = (vv) => {
    const s = vv.step;
    const enteringPlay = s.sub === 'play' && sub !== 'play';
    clear(box);
    add(box, header(vv, `Chapter III · Trial ${s.n} of ${s.total}`, s.title));
    if (s.sub === 'intro') {
      add(box, h('div', { class: 'trial-how' }, s.how), h('div', { class: 'trial-ready' }, 'Eyes on your phones…'));
      if (sub !== 'intro') { audio.lullaby({ notes: LULLABY.slice(0, 8), level: 0.8 }); }
    }
    if (s.sub === 'play') {
      const live = s.live || [];
      if (s.trial === 'candle') {
        const grid = h('div', { class: 'candles' });
        for (const p of vv.players.filter((x) => x.connected)) {
          const out = s.out?.includes(p.id);
          add(grid, h('div', { class: `cand ${out ? 'out' : ''}` }, h('div', { html: candleSvg(!out, '#ffb35c', 110) }), face(p.id, 54), h('div', { class: 'cand-name' }, p.name)));
        }
        add(box, grid);
        if (enteringPlay) {
          const start = performance.now();
          for (const at of s.scares || []) timers.push(setTimeout(() => ctx.fx.scare({ level: 0.9 }), at - (performance.now() - start)));
        }
      } else if (s.trial === 'banish') {
        const lanes = h('div', { class: 'tug' });
        for (const t of vv.teams) {
          const taps = s.teamTaps?.[t.id] || 0;
          const frac = Math.min(1, taps / 70);
          add(lanes, h('div', { class: 'tug-lane', style: { '--tc': t.color } },
            h('div', { class: 'tug-shaft' }, h('div', { class: 'tug-ghost', style: { bottom: `${frac * 78}%` } }, '👻')),
            h('div', { class: 'tug-name' }, t.name), h('div', { class: 'tug-n' }, `${taps}`)));
        }
        add(box, lanes);
      } else if (s.trial === 'gallery') {
        if (s.gsub === 'show') {
          add(box, h('div', { class: 'gallery' }, s.grid.map((c) => h('div', { class: 'frame' }, c.pid ? face(c.pid, 120, { possessed: c.possessed }) : h('div', { class: `ghost-portrait ${c.possessed ? 'poss' : ''}` })))));
          if (gsub !== 'show') audio.whisper(1);
        } else if (s.gsub === 'answer') {
          add(box, h('div', { class: 'gallery-q' }, 'How many portraits were possessed?'), h('div', { class: 'answered' }, s.answered.map((pid) => face(pid, 44))));
        } else {
          add(box, h('div', { class: 'gallery' }, s.grid.map((c) => h('div', { class: `frame ${c.possessed ? 'marked' : ''}` }, c.pid ? face(c.pid, 120, { possessed: c.possessed }) : h('div', { class: `ghost-portrait ${c.possessed ? 'poss' : ''}` })))));
          add(box, h('div', { class: 'gallery-q' }, `${s.answer} were possessed.`));
          if (gsub !== 'result') audio.ui('ok');
        }
        gsub = s.gsub;
      }
      if (s.trial !== 'gallery') {
        const unit = { candle: (n) => `${(n / 1000).toFixed(1)}s`, musicbox: (n) => `${n} notes`, banish: (n) => `${n} taps`, blink: (n) => `${n}` }[s.trial] || ((n) => n);
        add(box, h('div', { class: 'live-board' }, live.slice(0, 6).map((e, i) => h('div', { class: 'lb-row' }, h('span', {}, `${i + 1}`), face(e.pid, 40), h('span', { class: 'lb-name' }, nameOf(e.pid)), h('b', {}, unit(e.score))))));
      }
    }
    if (s.sub === 'reveal') {
      const board = h('div', { class: 'board' });
      s.board.slice(0, 8).forEach((e, i) => add(board, h('div', { class: `bd-row ${i === 0 ? 'top' : ''}` }, h('span', { class: 'bd-rank' }, `${i + 1}`), face(e.pid, 52), h('span', { class: 'bd-name' }, nameOf(e.pid)), h('b', {}, `+${e.pts}`))));
      add(box, board);
      if (s.blessing) add(box, h('div', { class: 'blessing' }, face(s.blessing.pid, 90, { ring: '#ffd27a' }), h('div', {}, h('div', { class: 'bl-name' }, `${nameOf(s.blessing.pid)} earns ${s.blessing.name}`), h('div', { class: 'bl-desc' }, `${s.blessing.desc} in the zombie fight`))));
      if (sub !== 'reveal') audio.ui('good');
    }
    sub = s.sub;
  };
  draw(v);
  return { update: draw, destroy() { timers.forEach(clearTimeout); box.remove(); } };
}

// ------------------------------------------------------------------ POSSESS
function possess(root, v) {
  const box = h('div', { class: 'screen possess' }, header(v, 'Chapter IV · The Reception Hall', 'One of you drank the wine'));
  const ring = h('div', { class: 'poss-ring' });
  const ps = v.players.filter((p) => p.connected);
  ps.forEach((p, i) => {
    const a = (i / ps.length) * Math.PI * 2;
    const el = h('div', { class: 'poss-face', style: { left: `${50 + Math.cos(a) * 36}%`, top: `${50 + Math.sin(a) * 36}%`, animationDelay: `${(i * 0.37) % 2}s` } }, face(p.id, 110), face(p.id, 110, { possessed: true, cls: 'alt' }));
    add(ring, el);
  });
  add(box, ring, h('div', { class: 'poss-hint' }, 'Look at your phone. Tell no one what it says.'));
  add(root, box);
  audio.heartbeat(1.2);
  const hb = setInterval(() => audio.heartbeat(1), 1100);
  return { update() {}, destroy() { clearInterval(hb); box.remove(); } };
}

// ------------------------------------------------------------------ TOAST / VOW
function writeFlow(root, v, ctx) {
  const box = h('div', { class: 'screen toast' });
  add(root, box);
  let lastSub = null;
  const timers = [];
  const draw = (vv) => {
    const s = vv.step;
    const isVow = s.key === 'vow';
    if (s.sub === 'reveal' && lastSub === 'reveal') return; // the performance keeps running
    clear(box);
    add(box, header(vv, isVow ? 'Chapter VI · The Vow of the Bachelors' : 'Chapter IV · The Toast', ''));
    add(box, h('div', { class: 'prompt-card' }, isVow ? `I, ${vv.groom}, solemnly swear…` : s.prompt));
    if (s.sub === 'write') {
      add(box, timerBar(vv.remaining, isVow ? 75000 : 60000));
      add(box, h('div', { class: 'answered big' }, vv.players.filter((p) => p.connected).map((p) => h('div', { class: `wr ${s.written.includes(p.id) ? 'done' : ''}` }, face(p.id, 70), h('div', {}, s.written.includes(p.id) ? '✓' : '✎')))));
    }
    if (s.sub === 'vet') add(box, h('div', { class: 'vet-msg' }, 'The host is tasting every line for poison…'));
    if (s.sub === 'empty') add(box, h('div', { class: 'vet-msg' }, 'Silence. Not a single word was spoken.'));
    if (s.sub === 'vote' && s.answers) {
      add(box, timerBar(vv.remaining, 30000));
      add(box, h('div', { class: 'cards' }, s.answers.map((a, i) => h('div', { class: 'tcard' }, h('span', { class: 'tc-n' }, `${i + 1}`), h('span', {}, a.text)))));
      add(box, h('div', { class: 'answered' }, s.voted.map((pid) => face(pid, 40)), h('span', {}, `${s.voted.length} voted`)));
    }
    if (s.sub === 'reveal' && s.answers) {
      if (isVow) {
        const list = h('div', { class: 'vow-lines' });
        add(box, list);
        s.answers.forEach((a, i) => timers.push(setTimeout(() => {
          add(list, h('div', { class: 'vow-line' }, face(a.pid, 64), h('span', {}, a.text)));
          ctx.narrator.speakText(a.text);
          audio.musicBoxNote(LULLABY[i % LULLABY.length] - 12, 0, 1);
        }, 1200 + i * 5200)));
        timers.push(setTimeout(() => { add(list, h('div', { class: 'vow-amen' }, '…so help me Vesper.')); audio.bell(1); ctx.petals(); }, 1200 + s.answers.length * 5200));
      } else {
        const sorted = s.answers.slice().sort((a, b) => b.votes - a.votes);
        add(box, h('div', { class: 'cards reveal' }, sorted.map((a) => h('div', { class: `tcard ${s.winners.includes(a.pid) ? 'win' : ''}` },
          face(a.pid, 60), h('span', { class: 'tc-text' }, a.text), h('span', { class: 'tc-votes' }, '🍷'.repeat(a.votes) || '—')))));
        if (s.winners.length) { audio.ui('good'); ctx.petals(); }
      }
    }
    lastSub = s.sub;
  };
  draw(v);
  return { update: draw, destroy() { timers.forEach(clearTimeout); box.remove(); } };
}

// ------------------------------------------------------------------ GLASS
function glass(root, v) {
  const box = h('div', { class: 'screen glass' });
  add(root, box);
  const draw = (vv) => {
    const s = vv.step;
    clear(box);
    add(box, header(vv, 'Chapter IV · The Poisoned Glass', s.sub === 'reveal' ? 'The poison is revealed' : 'Every member must choose the same glass'));
    if (s.sub === 'play') add(box, timerBar(vv.remaining, 150000));
    const lanes = h('div', { class: 'glass-lanes' });
    for (const t of s.teams) {
      const counts = {};
      for (const p of t.picks) counts[p] = (counts[p] || 0) + 1;
      add(lanes, h('div', { class: `g-lane ${t.done ? 'won' : ''} ${t.locked ? 'locked' : ''}`, style: { '--tc': teamColor(vv, t.id) } },
        h('div', { class: 'lane-team' }, teamName(vv, t.id)),
        h('div', { class: 'g-row' }, t.glasses.map((gl) => h('div', { class: 'g-cell' },
          h('div', { html: glassSvg(gl, { size: 92, highlight: t.answer === gl.pos ? '#9dff8a' : null, poisoned: t.answer === gl.pos }) }),
          h('div', { class: 'g-pos' }, gl.pos),
          h('div', { class: 'g-dots' }, '●'.repeat(counts[gl.pos] || 0))))),
        h('div', { class: 'lane-status' }, t.done ? `✦ Found it — ${ORD[t.rank]}` : t.locked ? '☠ Wrong glass! Locked out…' : `${t.picks.length}/${t.members} have chosen`)));
    }
    add(box, lanes);
  };
  draw(v);
  return { update: draw, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ UNMASK
function unmask(root, v, ctx) {
  const box = h('div', { class: 'screen unmask' });
  add(root, box);
  let revealed = false;
  const timers = [];
  const draw = (vv) => {
    const s = vv.step;
    if (s.sub === 'reveal' && revealed) return;
    clear(box);
    add(box, header(vv, 'Chapter IV · The Unmasking', s.sub === 'reveal' ? 'The verdict' : 'Who drank the wine?'));
    const grid = h('div', { class: 'accuse-grid' });
    for (const p of vv.players) {
      add(grid, h('div', { class: `acc-card ${s.voted.includes(p.id) ? 'voted' : ''}`, 'data-pid': p.id }, face(p.id, 110), h('div', { class: 'acc-name' }, p.name), h('div', { class: 'acc-votes' }, s.counts ? '●'.repeat(s.counts[p.id] || 0) : s.voted.includes(p.id) ? '✓' : '')));
    }
    add(box, grid);
    if (s.sub === 'vote') add(box, timerBar(vv.remaining, 40000));
    if (s.sub === 'reveal') {
      revealed = true;
      audio.heartbeat(1.3);
      timers.push(setTimeout(() => audio.heartbeat(1.5), 900));
      timers.push(setTimeout(() => {
        clear(box);
        add(box, header(vv, 'Chapter IV · The Unmasking', s.caught ? 'CAUGHT.' : 'Vesper laughs…'));
        add(box, h('div', { class: 'unmask-big' },
          h('div', {}, h('div', { class: 'um-label' }, 'You accused'), s.accused ? face(s.accused, 200) : h('div', {}, '—'), h('div', { class: 'um-name' }, s.accused ? nameOf(s.accused) : 'no one')),
          h('div', {}, h('div', { class: 'um-label vesper-text' }, 'The possessed was'), face(s.possessed, 260, { possessed: true, ring: '#ff2a4a' }), h('div', { class: 'um-name' }, nameOf(s.possessed)))));
        add(box, h('div', { class: 'verdict' }, s.caught ? 'The wine loses its grip. Every other coven gains 60 Souls.' : `${nameOf(s.possessed)} fooled you all — +300 points, and their coven takes 100 Souls.`));
        ctx.fx.scare({ pid: s.possessed, level: 0.8 });
      }, 2600));
    }
  };
  draw(v);
  return { update: draw, destroy() { timers.forEach(clearTimeout); box.remove(); } };
}

// ------------------------------------------------------------------ FORFEIT
const forfeit = simple((box, v) => {
  const s = v.step;
  box.classList.add('forfeit');
  if (s.sub === 'none') return;
  add(box, header(v, "Vesper's Dues", s.sub === 'passed' ? `${nameOf(s.pid)} passed. Vesper will remember.` : s.sub === 'done' ? 'Debt paid. +50 Souls to the coven.' : 'The lowest score of the chapter must pay'));
  add(box, h('div', { class: 'ff-card' }, face(s.pid, 170, { ring: '#c8102e' }), h('div', { class: 'ff-name' }, nameOf(s.pid)), h('div', { class: 'ff-text' }, s.card),
    h('div', { class: 'ff-state' }, s.sub === 'offer' ? 'Accept for +50 Souls — or pass. Your choice.' : s.sub === 'perform' ? 'PERFORM! The host taps done when it’s paid.' : '')));
});

// ------------------------------------------------------------------ CHAPTER END
function chapterEnd(root, v) {
  const s = v.step;
  const box = h('div', { class: 'screen chend' }, header(v, `${v.chapter.numeral ? `Chapter ${v.chapter.numeral}` : ''} complete`, v.chapter.title));
  const rows = h('div', { class: 'souls' });
  const max = Math.max(1, ...v.teams.map((t) => t.souls));
  s.result.ranking.forEach((r, i) => {
    const t = v.teams.find((x) => x.id === r.team);
    if (!t) return;
    add(rows, h('div', { class: 'soul-row', style: { '--tc': t.color, animationDelay: `${i * 0.25}s` } },
      h('div', { class: 'sr-rank' }, ORD[r.rank]), h('div', { class: 'sr-name' }, `${t.glyph} ${t.name}`),
      h('div', { class: 'sr-bar' }, h('div', { class: 'sr-fill', style: { width: `${(t.souls / max) * 100}%` } })),
      h('div', { class: 'sr-souls' }, `${t.souls}`), h('div', { class: 'sr-plus' }, `+${r.souls}`)));
  });
  add(box, rows);
  const extra = h('div', { class: 'chend-extra' });
  if (s.result.relic) {
    const t = v.teams.find((x) => x.id === s.result.relic.team);
    add(extra, h('div', { class: 'relic', style: { '--tc': t?.color } }, h('div', { class: 'relic-k' }, 'Relic won'), h('div', { class: 'relic-n' }, s.result.relic.name), h('div', { class: 'relic-d' }, `${t?.name}: ${s.result.relic.desc}`)));
  }
  if (s.top.length) add(extra, h('div', { class: 'top3' }, h('div', { class: 'relic-k' }, 'Stars of the chapter'), h('div', { class: 'top3-row' }, s.top.map((tp) => h('div', {}, face(tp.id, 80), h('div', {}, nameOf(tp.id)), h('b', {}, tp.pts))))));
  if (s.piece) add(extra, h('div', { class: 'relic piece' }, h('div', { class: 'relic-k' }, `Ring Piece ${s.piece}`), h('div', { class: 'relic-d' }, 'Its engravings were whispered to some of your phones. Keep them secret… until the chapel.')));
  add(box, extra);
  add(root, box);
  audio.ui('good');
  return { update() {}, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ ARENA (overlay only — canvas does the rest)
const arena = simple((box, v) => {
  const s = v.step;
  box.classList.add('arena-ov');
  if (s.sub !== 'results' || !s.board) return;
  add(box, h('div', { class: 'arena-res' }, h('div', { class: 'scr-title' }, 'The garden is clear'),
    h('div', { class: 'results-row' }, Object.entries(s.teamKills || {}).sort((a, b) => b[1] - a[1]).map(([t, n]) => h('div', { class: 'res-chip', style: { '--tc': teamColor(v, t) } }, h('b', {}, teamName(v, t)), h('span', {}, `${n} kills`)))),
    h('div', { class: 'board' }, s.board.slice(0, 6).map((b, i) => h('div', { class: `bd-row ${i === 0 ? 'top' : ''}` }, h('span', { class: 'bd-rank' }, i + 1), face(b.pid, 50), h('span', { class: 'bd-name' }, nameOf(b.pid)), h('b', {}, `${b.kills} 💀`))))));
});

// ------------------------------------------------------------------ CRYPT
function crypt(root, v) {
  const box = h('div', { class: 'screen crypt' });
  add(root, box);
  let lastN = 0;
  let lastSub = null;
  const draw = (vv) => {
    const s = vv.step;
    clear(box);
    add(box, header(vv, 'Chapter VI · The Crypt', s.sub === 'solved' ? 'The crypt opens' : s.sub === 'failed' ? 'The lock seals forever' : 'Four digits. The engravings are on your phones.'));
    const last = s.attempts[s.attempts.length - 1];
    const digits = s.code ? s.code.split('') : last ? last.code.split('') : ['?', '?', '?', '?'];
    add(box, h('div', { class: `door ${s.sub}` }, h('div', { class: 'dials' }, digits.map((d) => h('div', { class: 'dial' }, d)))));
    if (s.sub === 'play') {
      add(box, timerBar(vv.remaining, 200000));
      add(box, h('div', { class: 'crypt-hint' }, `Share your engravings OUT LOUD. Anyone can enter the code. ${s.maxAttempts - s.attempts.length} attempts left.`));
    }
    add(box, h('div', { class: 'attempts' }, s.attempts.map((a) => h('div', { class: `att ${s.code && a.code === s.code ? 'ok' : ''}` }, face(a.pid, 40), h('span', {}, a.code)))));
    if (s.attempts.length > lastN && s.sub === 'play') { audio.slam(0.6); audio.whisper(1); }
    if (s.sub === 'solved' && lastSub !== 'solved') { audio.slam(1.2); audio.bell(1); }
    if (s.sub === 'failed' && lastSub !== 'failed') { audio.stinger(1); }
    lastN = s.attempts.length;
    lastSub = s.sub;
  };
  draw(v);
  return { update: draw, destroy() { box.remove(); } };
}

// ------------------------------------------------------------------ BRIDES
function brides(root, v, ctx) {
  const box = h('div', { class: 'screen brides' });
  add(root, box);
  let lastSub = null;
  const draw = (vv) => {
    const s = vv.step;
    clear(box);
    const title = s.sub === 'vote' ? (s.round === 2 ? 'Last chance. Choose.' : 'Which bride is real?') : s.sub === 'right' ? `It's ${vv.bride}!` : s.sub === 'wrong' ? 'WRONG.' : 'Vesper wins…';
    add(box, header(vv, 'Chapter VI · The Three Brides', title));
    const row = h('div', { class: 'bride-row' });
    s.brides.forEach((b, i) => {
      const removed = s.removed.includes(i);
      const chosen = s.choice === i;
      const state = chosen && (s.sub === 'right') ? 'real' : chosen && (s.sub === 'wrong' || s.sub === 'lost') ? 'vesper' : 'veiled';
      add(row, h('div', { class: `bride ${removed ? 'gone' : ''} ${chosen ? 'chosen' : ''}` },
        h('div', { html: brideSvg(b, { size: 520, state }) }),
        h('div', { class: 'bride-n' }, ROMAN[i]),
        s.counts ? h('div', { class: 'acc-votes' }, '●'.repeat(s.counts[i] || 0)) : null));
    });
    add(box, row);
    if (s.sub === 'vote') add(box, timerBar(vv.remaining, s.round === 2 ? 45000 : 60000), h('div', { class: 'answered' }, s.voted.map((pid) => face(pid, 40)), h('span', {}, 'White whispers are true. Red whispers lie.')));
    if (s.sub !== lastSub) {
      if (s.sub === 'right') { audio.ui('good'); audio.bell(1); }
      if (s.sub === 'wrong' || s.sub === 'lost') { ctx.fx.scare({ level: 1 }); }
      if (s.sub === 'wrong' && s.lines) ctx.narrator.play(s.lines, { speak: !vv.fast && vv.narration });
    }
    lastSub = s.sub;
  };
  draw(v);
  return { update: draw, destroy() { ctx.narrator.stop(); box.remove(); } };
}

// ------------------------------------------------------------------ CREDITS
function credits(root, v, ctx) {
  const s = v.step;
  const box = h('div', { class: 'screen credits' });
  add(root, box);
  const roll = h('div', { class: 'roll' },
    h('div', { class: 'roll-title' }, 'NIGHTFALL'), h('div', { class: 'roll-sub' }, 'The Blackthorn Wedding'),
    h('div', { class: 'roll-k' }, 'Starring'),
    s.cast.map((c) => h('div', { class: 'roll-row' }, face(c.id, 96, { ring: teamColor(v, c.team) }), h('div', {}, h('div', { class: 'roll-name' }, c.name), h('div', { class: 'roll-role' }, `${c.id === v.groomId ? 'The Groom · ' : ''}${teamName(v, c.team)} · ${c.stats.kills} kills`)))),
    h('div', { class: 'roll-k' }, 'Special thanks'), h('div', { class: 'roll-name' }, `${v.bride}, for kicking down the chapel door`),
    h('div', { class: 'roll-k' }, 'And'), h('div', { class: 'roll-name' }, 'Lady Vesper Blackthorn (1903 – forever)'));
  add(box, roll);
  const stage = h('div', { class: 'awards hidden' });
  add(box, stage);
  const rollMs = 6000 + s.cast.length * 1600;
  roll.style.animationDuration = `${rollMs}ms`;
  const timers = [];
  timers.push(setTimeout(() => {
    roll.remove();
    stage.classList.remove('hidden');
    s.awards.forEach((a, i) => timers.push(setTimeout(() => {
      clear(stage);
      add(stage, h('div', { class: 'award' }, h('div', { class: 'aw-k' }, 'The award for'), h('div', { class: 'aw-t' }, a.title), face(a.pid, 220, { ring: '#ffd27a', possessed: a.id === 'firstdie' }), h('div', { class: 'aw-n' }, nameOf(a.pid))));
      audio.bell(0.7);
      if (a.id === 'mvp') ctx.petals();
    }, i * 4200)));
    timers.push(setTimeout(() => {
      clear(stage);
      const best = s.teams[0];
      const bt = v.teams.find((t) => t.id === best?.id);
      add(stage, h('div', { class: 'trophy' }, h('div', { class: 'aw-k' }, 'The Blackthorn Trophy goes to'), h('div', { class: 'tr-cup' }, '🏆'), h('div', { class: 'aw-t', style: { color: bt?.color } }, bt?.name || ''),
        h('div', { class: 'souls final' }, s.teams.map((t) => { const tt = v.teams.find((x) => x.id === t.id); return h('div', { class: 'soul-row', style: { '--tc': tt?.color } }, h('div', { class: 'sr-name' }, tt?.name), h('div', { class: 'sr-souls' }, `${t.souls} Souls`)); })),
        h('div', { class: 'roll-sub' }, s.ending === 'win' ? `${v.bride} is safe. See you at the wedding.` : 'Vesper got her wedding. Better luck at yours.')));
      ctx.petals(); audio.bell(1);
    }, s.awards.length * 4200 + 300));
  }, rollMs));
  return { update() {}, destroy() { timers.forEach(clearTimeout); box.remove(); } };
}

export const SCREENS = { lobby, story, chapterTitle, sorting, seance, quiz, trial, possess, toast: writeFlow, vowWrite: writeFlow, glass, unmask, forfeit, chapterEnd, arena, crypt, brides, credits };
export { countdown };
