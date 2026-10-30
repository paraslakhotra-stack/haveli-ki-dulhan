// Host controls: the setup form (lobby) and the in-game remote (pause, skip, heat, kick, restart).
import { h, clear, add } from '/shared/dom.js';

let suggestions = null;
async function loadSuggestions() {
  if (suggestions) return suggestions;
  try { suggestions = await (await fetch('/content/suggestions.json')).json(); } catch { suggestions = []; }
  return suggestions;
}

export async function openHostPanel(view, ctx) {
  const sug = await loadSuggestions();
  ctx.openSheet((box) => {
    const v = ctx.view;
    const st = v.host?.settings || {};
    if (!v.host?.started) setupForm(box, v, ctx, st, sug);
    else remote(box, v, ctx, st);
  });
}

function seg(options, value, onPick) {
  const wrap = h('div', { class: 'seg' });
  for (const [val, label] of options) {
    const b = h('button', { class: val === value ? 'on' : '', type: 'button' }, label);
    b.addEventListener('click', () => { for (const x of wrap.children) x.classList.remove('on'); b.classList.add('on'); onPick(val); });
    add(wrap, b);
  }
  return wrap;
}

function setupForm(box, v, ctx, st, sug) {
  const players = v.host.players;
  const state = {
    heat: st.heat || 'mild', narration: st.narration !== false, groomId: st.groomId || null,
    groomName: st.groomName || '', brideName: st.brideName || '',
    groomQuiz: (st.groomQuiz?.length ? st.groomQuiz : sug.map((q) => ({ q, a: '', w: ['', '', ''] }))).map((r) => ({ q: r.q, a: r.a || '', w: [...(r.w || []), '', '', ''].slice(0, 3) })),
  };
  const groomSel = h('select', { class: 'field' }, h('option', { value: '' }, '— The groom isn\'t playing —'), players.map((p) => h('option', { value: p.id, selected: p.id === state.groomId ? 'selected' : null }, p.name)));
  const groomName = h('input', { class: 'field', placeholder: "Groom's name (e.g. Arjun)", value: state.groomName, maxlength: '24' });
  const brideName = h('input', { class: 'field', placeholder: "Bride's name (e.g. Meera)", value: state.brideName, maxlength: '24' });
  groomSel.addEventListener('change', () => {
    state.groomId = groomSel.value || null;
    const p = players.find((x) => x.id === state.groomId);
    if (p && !groomName.value) groomName.value = p.name;
  });
  const quizBox = h('div', { class: 'quiz-rows' });
  state.groomQuiz.forEach((r, i) => {
    const q = h('input', { class: 'field sm', value: r.q.replace(/\{GROOM\}/g, groomName.value || '{GROOM}').replace(/\{BRIDE\}/g, brideName.value || '{BRIDE}'), maxlength: '120' });
    const a = h('input', { class: 'field sm ok', placeholder: 'Correct answer', value: r.a, maxlength: '60' });
    const w = r.w.map((x, k) => h('input', { class: 'field sm', placeholder: `Wrong answer ${k + 1}`, value: x, maxlength: '60' }));
    const sync = () => { state.groomQuiz[i] = { q: q.value, a: a.value, w: w.map((x) => x.value) }; };
    [q, a, ...w].forEach((el) => el.addEventListener('input', sync));
    add(quizBox, h('div', { class: 'qrow' }, h('small', {}, `Question ${i + 1}`), q, a, h('div', { class: 'wrongs' }, w)));
  });
  const details = h('details', { class: 'fold' }, h('summary', {}, '💍 How well do they know the groom? (fill in any you like)'), h('p', { class: 'fine' }, 'Each filled-in row becomes a quiz question in Chapter II. Leave rows blank to skip them.'), quizBox);
  const msg = h('div', { class: 'fine center' });
  const save = async () => {
    const r = await ctx.hostCmd('settings', { heat: state.heat, narration: state.narration, groomId: state.groomId, groomName: groomName.value, brideName: brideName.value, groomQuiz: state.groomQuiz });
    msg.textContent = r.ok ? 'Saved ✓' : 'Could not save — are you still the host?';
    return r.ok;
  };
  const begin = h('button', { class: 'btn big blood' }, '🪔 Begin the Night');
  begin.addEventListener('click', async () => {
    begin.disabled = true;
    if (await save()) {
      const r = await ctx.hostCmd('start');
      if (r.ok) { ctx.closeSheet(); return; }
    }
    begin.disabled = false;
    msg.textContent = 'Could not start — check the TV is connected.';
  });
  add(box, 
    h('h2', {}, '♛ Host — set up the night'),
    h('label', {}, 'Who is the groom?'), groomSel, groomName,
    h('label', {}, "The bride (she's the one Chandravati takes)"), brideName,
    h('label', {}, 'Heat level'), seg([['mild', '🕯 Mild'], ['spicy', '🌶 Spicy (office-safe)']], state.heat, (x) => { state.heat = x; }),
    h('label', {}, 'Spoken narration on the TV'), seg([[true, 'Voice on'], [false, 'Captions only']], state.narration, (x) => { state.narration = x; }),
    details,
    h('button', { class: 'btn ghost', onclick: save }, 'Save'),
    begin, msg,
    h('p', { class: 'fine center' }, `${players.length} guest${players.length === 1 ? '' : 's'} signed in. Best with 4–12. Late arrivals can still join mid-game.`),
    kickList(v, ctx),
  );
}

function remote(box, v, ctx, st) {
  const chapters = [['guestbook', 'I · The Guest Book'], ['library', 'II · Library'], ['nursery', 'III · Nursery'], ['reception', 'IV · Reception'], ['arena', 'V · Zombies'], ['vow', 'VI · The Vow'], ['dawn', 'Dawn & credits']];
  const jump = h('select', { class: 'field' }, h('option', { value: '' }, 'Jump to a chapter…'), chapters.map(([id, l]) => h('option', { value: id }, l)));
  jump.addEventListener('change', async () => {
    if (!jump.value) return;
    if (!confirm('Jump to that chapter? The current game moves on immediately.')) { jump.value = ''; return; }
    await ctx.hostCmd('jump', { chapter: jump.value });
    ctx.closeSheet();
  });
  add(box, 
    h('h2', {}, '♛ Host remote'),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn', onclick: async () => { await ctx.hostCmd(v.paused ? 'resume' : 'pause'); ctx.closeSheet(); } }, v.paused ? '▶ Resume' : '⏸ Pause'),
      h('button', { class: 'btn', onclick: async () => { await ctx.hostCmd('skip'); } }, '⏭ Skip this step')),
    h('label', {}, 'Heat level'), seg([['mild', '🕯 Mild'], ['spicy', '🌶 Spicy']], st.heat, (x) => ctx.hostCmd('settings', { heat: x })),
    h('label', {}, 'Spoken narration'), seg([[true, 'Voice on'], [false, 'Captions only']], st.narration, (x) => ctx.hostCmd('settings', { narration: x })),
    v.kind === 'sorting' || v.chapter?.id === 'prologue' ? h('button', { class: 'btn ghost', onclick: () => ctx.hostCmd('shuffle') }, '🔀 Reshuffle teams') : null,
    jump,
    kickList(v, ctx),
    h('button', { class: 'btn ghost danger', onclick: async () => { if (confirm('Restart the whole night from the lobby? Scores will be lost.')) { await ctx.hostCmd('restart'); ctx.closeSheet(); } } }, '↺ Restart the night'),
  );
}

function kickList(v, ctx) {
  const list = h('details', { class: 'fold' }, h('summary', {}, 'Guests'));
  for (const p of v.host.players) {
    if (p.id === v.me.id) continue;
    add(list, h('div', { class: 'kick-row' }, h('span', {}, `${p.name}${p.connected ? '' : ' (away)'}`),
      h('button', { class: 'chip', onclick: async (e) => { if (confirm(`Remove ${p.name} from the game?`)) { await ctx.hostCmd('kick', { id: p.id }); e.target.closest('.kick-row').remove(); } } }, 'Remove')));
  }
  return list;
}

// A small always-there bar for the host during the game.
export function hostQuickBar(view, ctx) {
  let bar = document.getElementById('host-quick');
  if (!view.me?.isHost || view.kind === 'lobby') { bar?.remove(); return; }
  if (!bar) {
    bar = h('div', { id: 'host-quick' });
    add(document.body, bar);
  }
  clear(bar);
  add(bar, 
    h('button', { onclick: () => ctx.hostCmd(ctx.view.paused ? 'resume' : 'pause') }, view.paused ? '▶' : '⏸'),
    h('button', { onclick: () => ctx.hostCmd('skip') }, '⏭'),
  );
}
