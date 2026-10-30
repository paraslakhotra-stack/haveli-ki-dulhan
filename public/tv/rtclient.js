// Smooth playback of the server's 30 Hz real-time snapshots.
// The TV renders slightly in the past (DELAY ms) and interpolates between the two snapshots around that moment,
// so a late or dropped packet never shows up as a stutter. Short gaps are bridged by extrapolating.
// Events (shots, kills…) are released when render time reaches the snapshot they arrived with, keeping
// tracers and deaths in step with the positions you see.
import { decode } from '/shared/rtcodec.js';

const DELAY = 90;
const MAX_EXTRAP = 120;

export class RtBuffer {
  constructor() { this.reset(); }
  reset() {
    this.snaps = [];
    this.offset = null; // serverTime − localTime, estimated
    this.pending = []; // [{ t, ev }]
    this.stats = { n: 0, last: 0, gaps: [] };
  }
  push(buf, meta) {
    const { t, tables } = decode(buf);
    const now = performance.now();
    // Keep the most "ahead" sample: network delay only ever makes samples look later.
    const sample = t - now;
    if (this.offset == null || sample > this.offset || this.snaps.length === 0) this.offset = sample;
    else this.offset += (sample - this.offset) * 0.002; // slow drift correction
    if (this.snaps.length && t < this.snaps[this.snaps.length - 1].t) this.reset(); // sim restarted
    const snap = { t, tables, meta, index: indexRows(tables, meta) };
    this.snaps.push(snap);
    if (this.snaps.length > 40) this.snaps.shift();
    if (meta?.ev?.length) this.pending.push({ t, ev: meta.ev });
    if (this.stats.last) { this.stats.gaps.push(now - this.stats.last); if (this.stats.gaps.length > 90) this.stats.gaps.shift(); }
    this.stats.last = now;
    this.stats.n++;
  }
  get latest() { return this.snaps[this.snaps.length - 1] || null; }
  renderTime() { return this.offset == null ? 0 : performance.now() + this.offset - DELAY; }
  // Events whose snapshot time has been reached.
  takeEvents() {
    const rt = this.renderTime();
    const out = [];
    while (this.pending.length && (this.pending[0].t <= rt || this.pending.length > 12)) out.push(...this.pending.shift().ev);
    return out;
  }
  // Interpolated rows of one table, keyed by id. key(row) gives the id; pos lists [xCol, yCol, angleCol?].
  sample(table, { key, x = 0, y = 1, angle = -1 }) {
    const out = new Map();
    const n = this.snaps.length;
    if (!n) return out;
    const rt = this.renderTime();
    let a = null;
    let b = null;
    for (let i = n - 1; i >= 0; i--) { if (this.snaps[i].t <= rt) { a = this.snaps[i]; b = this.snaps[i + 1] || null; break; } }
    if (!a) { a = this.snaps[0]; b = null; }
    if (!b) {
      // Past the newest snapshot: extrapolate a little from the last two, then hold.
      const prev = this.snaps[this.snaps.indexOf(a) - 1];
      const ahead = Math.min(MAX_EXTRAP, Math.max(0, rt - a.t));
      const rows = a.tables[table] || [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const id = key(row, a, i);
        const r = row.slice();
        const pr = prev?.index[table]?.get(id);
        if (pr && ahead > 0 && a.t > prev.t) {
          const k = ahead / (a.t - prev.t);
          r[x] += (row[x] - pr[x]) * k;
          r[y] += (row[y] - pr[y]) * k;
        }
        out.set(id, r);
      }
      return out;
    }
    const f = Math.max(0, Math.min(1, (rt - a.t) / Math.max(1, b.t - a.t)));
    const rows = b.tables[table] || [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = key(row, b, i);
      const old = a.index[table]?.get(id);
      if (!old) { out.set(id, row.slice()); continue; }
      const r = row.slice();
      r[x] = old[x] + (row[x] - old[x]) * f;
      r[y] = old[y] + (row[y] - old[y]) * f;
      if (angle >= 0) {
        let d = (row[angle] - old[angle]) / 100;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r[angle] = old[angle] + d * 100 * f;
      }
      out.set(id, r);
    }
    return out;
  }
  debug() {
    const g = [...this.stats.gaps].sort((p, q) => p - q);
    const q = (f) => (g.length ? g[Math.min(g.length - 1, Math.floor(g.length * f))].toFixed(0) : '-');
    return { snaps: this.stats.n, gap50: q(0.5), gap95: q(0.95), buffered: this.snaps.length };
  }
}

// Row lookup per table: players are keyed by meta.ids (row order), everything else by its first column.
function indexRows(tables, meta) {
  const idx = {};
  for (const [name, rows] of Object.entries(tables)) {
    const m = new Map();
    rows.forEach((r, i) => m.set(name === 'p' ? meta?.ids?.[i] : r[0], r));
    idx[name] = m;
  }
  return idx;
}
export const playerKey = (row, snap, i) => snap.meta.ids[i];
export const idKey = (row) => row[0];
