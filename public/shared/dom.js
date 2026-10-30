// Tiny DOM helpers — no framework, no build step.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

// Like Element.append, but skips null/false and flattens arrays (native append would print "null").
export function add(parent, ...kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    parent.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return parent;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

// A countdown that keeps running locally between server updates.
export function countdown(el, remainingMs, { format = 'sec', onTick } = {}) {
  const end = performance.now() + (remainingMs ?? 0);
  let raf = 0;
  const loop = () => {
    const left = Math.max(0, end - performance.now());
    if (el.isConnected) {
      el.textContent = format === 'clock' ? `${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}` : String(Math.ceil(left / 1000));
      onTick?.(left);
      if (left > 0) raf = requestAnimationFrame(loop);
    }
  };
  if (remainingMs != null) loop();
  return () => cancelAnimationFrame(raf);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function teamColor(view, teamId) {
  return view.teams?.find((t) => t.id === teamId)?.color || '#888';
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
