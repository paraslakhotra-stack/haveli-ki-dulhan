// The phone gamepad for the action chapters: twin analog sticks + face buttons, multitouch via Pointer Events.
// Left half = move stick, right half = aim stick (both float to where your thumb lands). Buttons sit above the
// aim stick. Stick state streams to the server over the volatile `rt` channel at up to 30 Hz.
import { h, add } from '/shared/dom.js';

const DEAD = 0.12;

function stick(zone, { radius = 62, curve = 1 } = {}) {
  const base = h('div', { class: 'stk-base' });
  const knob = h('div', { class: 'stk-knob' });
  add(base, knob);
  add(zone, base);
  const st = { x: 0, y: 0, id: null, cx: 0, cy: 0, active: false };
  const home = () => {
    const r = zone.getBoundingClientRect();
    base.style.left = `${r.width / 2}px`; base.style.top = `${r.height * 0.62}px`;
  };
  const place = (cx, cy) => { base.style.left = `${cx}px`; base.style.top = `${cy}px`; };
  const update = (px, py) => {
    let dx = (px - st.cx) / radius;
    let dy = (py - st.cy) / radius;
    let m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; m = 1; }
    knob.style.transform = `translate(${dx * radius}px, ${dy * radius}px)`;
    if (m < DEAD) { st.x = 0; st.y = 0; return; }
    const k = Math.pow((m - DEAD) / (1 - DEAD), curve) / m; // rescale past the dead zone
    st.x = dx * k; st.y = dy * k;
  };
  zone.addEventListener('pointerdown', (e) => {
    if (st.id !== null) return;
    e.preventDefault();
    st.id = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch { /* old browsers */ }
    const r = zone.getBoundingClientRect();
    st.cx = Math.max(radius, Math.min(r.width - radius, e.clientX - r.left));
    st.cy = Math.max(radius, Math.min(r.height - radius, e.clientY - r.top));
    place(st.cx, st.cy);
    st.active = true;
    zone.classList.add('on');
    update(e.clientX - r.left, e.clientY - r.top);
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== st.id) return;
    e.preventDefault();
    const r = zone.getBoundingClientRect();
    update(e.clientX - r.left, e.clientY - r.top);
  });
  const end = (e) => {
    if (e.pointerId !== st.id) return;
    st.id = null; st.x = 0; st.y = 0; st.active = false;
    knob.style.transform = '';
    zone.classList.remove('on');
    home();
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  requestAnimationFrame(home);
  return st;
}

// opts: { rt(arr), buttons: [{ id, icon, label, onPress }], leftHint, rightHint }
export function createPad(root, { rt, buttons = [], leftHint = 'CHALO', rightHint = 'NISHANA', aim = true }) {
  const el = h('div', { class: 'gpad' });
  const hud = h('div', { class: 'gp-hud' });
  const left = h('div', { class: 'gp-zone left' }, h('div', { class: 'gp-hint' }, leftHint));
  const right = h('div', { class: 'gp-zone right' }, h('div', { class: 'gp-hint' }, rightHint));
  const btnRow = h('div', { class: 'gp-btns' });
  const btns = {};
  for (const b of buttons) {
    const ring = h('i', { class: 'gp-cd' });
    const icon = h('span', { class: 'ic' }, b.icon);
    const label = h('small', {}, b.label);
    const el2 = h('button', { class: `gp-btn ${b.id}`, type: 'button' }, ring, icon, label);
    el2.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!el2.disabled) b.onPress?.(); });
    btns[b.id] = { el: el2, ring, icon, label };
    add(btnRow, el2);
  }
  add(right, btnRow);
  const rot = h('div', { class: 'gp-rotate' }, '📱↻ Phone tircha karo — asli controller grip');
  add(el, hud, left, right, rot);
  add(root, el);
  const L = stick(left, { curve: 1.15 });
  const R = aim ? stick(right, { curve: 1 }) : { x: 0, y: 0 };

  // Stream stick state: on change at 30 Hz, otherwise a 4 Hz heartbeat (volatile packets may drop).
  let last = '';
  let lastAt = 0;
  const q = (v) => Math.round(v * 100);
  const iv = setInterval(() => {
    const arr = [q(L.x), q(L.y), q(R.x), q(R.y)];
    const key = arr.join(',');
    const now = performance.now();
    if (key !== last || now - lastAt > 250) { rt(arr); last = key; lastAt = now; }
  }, 33);
  let alive = true;
  return {
    el,
    hud,
    btn(id, { icon, label, disabled, cooldown, hot } = {}) {
      const b = btns[id];
      if (!b) return;
      if (icon != null && b.icon.textContent !== icon) b.icon.textContent = icon;
      if (label != null && b.label.textContent !== label) b.label.textContent = label;
      if (disabled != null) b.el.disabled = !!disabled;
      if (cooldown != null) b.ring.style.setProperty('--cd', `${cooldown}%`);
      if (hot != null) b.el.classList.toggle('hot', !!hot);
    },
    destroy() {
      if (!alive) return;
      alive = false;
      clearInterval(iv);
      rt([0, 0, 0, 0]);
      el.remove();
    },
  };
}

// Fullscreen + keep the screen awake while playing (best effort; iOS Safari ignores fullscreen).
let wakeLock = null;
export async function goImmersive() {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch { /* not allowed */ }
  try { await screen.orientation?.lock?.('landscape'); } catch { /* needs fullscreen on Android; unsupported on iOS */ }
  keepAwake();
}
export async function keepAwake() {
  try { if (!wakeLock && navigator.wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener?.('release', () => { wakeLock = null; }); } } catch { /* denied */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
export function leaveImmersive() {
  try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
  try { if (document.fullscreenElement) document.exitFullscreen?.(); } catch { /* ignore */ }
}
