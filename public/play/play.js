// HAVELI KI DULHAN — the phone controller. Join, then follow whatever the server says this phone should show.
import { connect } from '/shared/net.js';
import { h, clear, add } from '/shared/dom.js';
import { setNames, face, shrinkPhoto } from '/shared/photos.js';
import { audio } from '/shared/audio.js';
import { PHONE_SCREENS } from '/play/screens.js';
import { openHostPanel, hostQuickBar } from '/play/host.js';

const $ = (id) => document.getElementById(id);
const main = $('main');
const TOKEN_KEY = 'nightfall.token';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* private mode */ } },
};

let view = null;
let joined = false;
let current = null;
let pendingPhoto = null;

// ---------- haptics & wake lock ----------
export const buzz = (pattern) => { try { navigator.vibrate?.(pattern); } catch { /* iOS has no vibration */ } };
let wakeLock = null;
async function keepAwake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch { /* optional */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });
document.addEventListener('pointerdown', () => { audio.unlock(); keepAwake(); }, { passive: true });

export function flash(color = 'rgba(200,16,46,.85)', ms = 450) {
  const f = $('flash');
  f.style.background = color;
  f.classList.remove('on');
  void f.offsetWidth;
  f.style.animationDuration = `${ms}ms`;
  f.classList.add('on');
}

// ---------- network ----------
const net = connect({
  role: 'phone',
  onReady: async (socket) => {
    const token = store.get(TOKEN_KEY);
    if (token) {
      const r = await net.call('hello', { token });
      if (r.ok) { joined = true; if (pendingPhoto) socket.emit('photo', { photo: pendingPhoto }); return; }
      store.del(TOKEN_KEY);
    }
    joined = false;
    showJoin();
  },
  onStatus: (st) => { $('dot').className = st; },
  onView: (v) => { view = v; render(); },
  onFx: (e) => current?.comp?.fx?.(e),
  onHud: (u) => current?.comp?.hud?.(u),
});

export const send = (msg) => { if (view) net.socket.emit('input', { seq: view.seq, ...msg }); };
export const sendRaw = (msg) => net.socket.emit('input', msg);
// Real-time stick state: volatile (a dropped packet is replaced 33 ms later anyway).
const rt = (arr) => net.socket.volatile.emit('rt', arr);
export const hostCmd = (cmd, args) => net.call('host', { cmd, args });

// ---------- join ----------
function showJoin() {
  current?.comp?.destroy?.();
  current = { key: 'join', comp: null };
  $('top').classList.add('hidden');
  $('host-btn').classList.add('hidden');
  clear(main);
  let photo = null;
  const preview = h('div', { class: 'join-photo' }, h('span', {}, '📷'), h('small', {}, 'Tap for a selfie'));
  const file = h('input', { type: 'file', accept: 'image/*', capture: 'user', class: 'hidden' });
  const name = h('input', { class: 'field', maxlength: '16', placeholder: 'Your name', autocomplete: 'given-name', enterkeyhint: 'go' });
  const err = h('div', { class: 'err' });
  const btn = h('button', { class: 'btn big' }, 'Register Mein Naam Likho');
  preview.addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      photo = await shrinkPhoto(f);
      clear(preview).append(h('img', { src: photo, alt: '' }));
      preview.classList.add('has');
    } catch (e) { err.textContent = e.message; }
  });
  const go = async () => {
    audio.unlock();
    if (!name.value.trim()) { err.textContent = 'Register ko naam chahiye.'; name.focus(); return; }
    btn.disabled = true;
    btn.textContent = 'Signing…';
    const r = await net.call('join', { name: name.value, photo });
    if (r.ok) {
      store.set(TOKEN_KEY, r.token);
      joined = true;
      audio.ui('join');
      buzz([40, 60, 120]);
      if (view) render();
    } else {
      err.textContent = r.error || 'Haveli tak nahi pahunch paaye. Check your internet and try again.';
      btn.disabled = false;
      btn.textContent = 'Register Mein Naam Likho';
    }
  };
  btn.addEventListener('click', go);
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  add(main, h('div', { class: 'join' },
    h('div', { class: 'brand' }, h('div', { class: 'brand-n' }, 'HAVELI KI DULHAN'), h('div', { class: 'brand-s' }, 'a Nightfall story')),
    h('p', { class: 'lede' }, 'Aapko saadar aamantrit kiya jaata hai… dulhe ki azaadi ki aakhri raat par.'),
    preview, file, name, err, btn,
    h('p', { class: 'fine' }, 'Your photo only appears on the TV during tonight\'s game.')));
}

// Retake a photo from the lobby.
export function changePhoto() {
  const file = h('input', { type: 'file', accept: 'image/*', capture: 'user' });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    const photo = await shrinkPhoto(f);
    pendingPhoto = photo;
    net.socket.emit('photo', { photo });
  });
  file.click();
}

// ---------- render ----------
function render() {
  if (!joined || !view) return;
  if (!view.me) { joined = false; store.del(TOKEN_KEY); showJoin(); return; }
  setNames(view.roster || []);
  renderTop();
  $('paused').classList.toggle('hidden', !view.paused);
  const key = `${view.kind}:${view.seq}`;
  if (!current || current.key !== key) {
    current?.comp?.destroy?.();
    clear(main);
    const mount = PHONE_SCREENS[view.kind] || PHONE_SCREENS.story;
    current = { key, comp: mount(main, view, ctx) };
  } else {
    current.comp?.update?.(view);
  }
  const hb = $('host-btn');
  hb.classList.toggle('hidden', !view.me.isHost);
  hostQuickBar(view, ctx);
}

function renderTop() {
  const top = $('top');
  top.classList.remove('hidden');
  const me = view.me;
  const meEl = $('me');
  clear(meEl);
  add(meEl, face(me.id, 34, { ring: me.teamColor || null }), h('div', { class: 'me-txt' }, h('b', {}, me.name), h('small', { style: { color: me.teamColor || 'var(--bone-dim)' } }, me.teamName || (me.isHost ? 'Host' : 'Guest'))), h('span', { class: 'score' }, `${me.score}`));
  const inv = view.inventory.filter((i) => i.kind === 'crypt');
  $('inv-btn').classList.toggle('hidden', !inv.length);
  $('inv-n').textContent = inv.length;
}

$('inv-btn').addEventListener('click', () => openSheet((box) => {
  add(box, h('h2', {}, 'Anguthi ke engravings'), h('p', { class: 'fine' }, 'Secret clues to the tijori under the mandap. Guard them… until Chapter VI.'));
  for (const it of view.inventory.filter((i) => i.kind === 'crypt')) add(box, h('div', { class: 'engraving' }, h('small', {}, `Ring Piece ${it.piece}`), h('div', {}, it.text)));
}));
$('host-btn').addEventListener('click', () => openHostPanel(view, ctx));

export function openSheet(fill) {
  const sheet = $('sheet');
  const inner = $('sheet-inner');
  clear(inner);
  add(inner, h('button', { class: 'sheet-x', 'aria-label': 'Close', onclick: closeSheet }, '✕'));
  fill(inner);
  sheet.classList.remove('hidden');
}
export function closeSheet() { $('sheet').classList.add('hidden'); }
$('sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

const ctx = { send, sendRaw, rt, hostCmd, buzz, flash, openSheet, closeSheet, changePhoto, get view() { return view; }, leave: () => { net.socket.emit('leave'); store.del(TOKEN_KEY); joined = false; showJoin(); } };
window.__nightfall = ctx;
