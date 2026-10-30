// Socket wrapper shared by the TV and phones. Relies on /socket.io/socket.io.js (served by the game server).
import { setPhoto } from './photos.js';

export function connect({ role, onView, onFx, onArena, onStatus, onReady }) {
  const socket = window.io({ transports: ['websocket', 'polling'], reconnectionDelay: 400, reconnectionDelayMax: 2000 });
  socket.on('connect', () => { onStatus?.('online'); onReady?.(socket); });
  socket.on('disconnect', () => onStatus?.('offline'));
  socket.io.on('reconnect_attempt', () => onStatus?.('reconnecting'));
  socket.on('photo', ({ id, data }) => setPhoto(id, data));
  socket.on(role === 'tv' ? 'tv' : 'view', (v) => onView?.(v));
  socket.on('fx', (e) => onFx?.(e));
  if (onArena) socket.on('arena', onArena);
  const call = (ev, payload) => new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, timeout: true }); } }, 6000);
    socket.emit(ev, payload, (r) => { if (!done) { done = true; clearTimeout(t); resolve(r || {}); } });
  });
  return { socket, call };
}
