// Socket wrapper shared by the TV and phones. Relies on /socket.io/socket.io.js (served by the game server).
import { setPhoto } from './photos.js';

export function connect({ role, onView, onFx, onRt, onHud, onStatus, onReady }) {
  // WebSocket straight away (no long-polling warm-up); fall back to polling only if a network blocks it.
  const socket = window.io({ transports: ['websocket'], reconnectionDelay: 400, reconnectionDelayMax: 2000 });
  socket.on('connect_error', () => { if (socket.io.opts.transports.length === 1) socket.io.opts.transports = ['polling', 'websocket']; });
  socket.on('connect', () => { onStatus?.('online'); onReady?.(socket); });
  socket.on('disconnect', () => onStatus?.('offline'));
  socket.io.on('reconnect_attempt', () => onStatus?.('reconnecting'));
  socket.on('photo', ({ id, data }) => setPhoto(id, data));
  socket.on(role === 'tv' ? 'tv' : 'view', (v) => onView?.(v));
  socket.on('fx', (e) => onFx?.(e));
  if (onRt) socket.on('rt', onRt);
  if (onHud) socket.on('hud', onHud);
  const call = (ev, payload) => new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, timeout: true }); } }, 6000);
    socket.emit(ev, payload, (r) => { if (!done) { done = true; clearTimeout(t); resolve(r || {}); } });
  });
  return { socket, call };
}
