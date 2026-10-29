// Small deterministic helpers shared by the engine.

export function makeRng(seed = Date.now()) {
  let a = seed >>> 0 || 0x9e3779b9;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (n) => Math.floor(rng() * n);
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.shuffle = (arr) => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return rng;
}

export function randomCode(rng, len = 4) {
  const letters = 'BCDFGHJKLMNPQRSTVWXZ';
  let s = '';
  for (let i = 0; i < len; i++) s += letters[rng.int(letters.length)];
  return s;
}

export function randomToken(rng) {
  let s = '';
  for (let i = 0; i < 24; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[rng.int(36)];
  return s;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function cleanText(v, max = 140) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Majority vote: returns { winner, counts, tie } — ties broken by rng.
export function tally(votes, rng) {
  const counts = {};
  for (const v of Object.values(votes)) if (v != null) counts[v] = (counts[v] || 0) + 1;
  let best = -1;
  let tied = [];
  for (const [k, c] of Object.entries(counts)) {
    if (c > best) { best = c; tied = [k]; } else if (c === best) tied.push(k);
  }
  const winner = tied.length ? (tied.length === 1 ? tied[0] : rng.pick(tied)) : null;
  return { winner, counts, tie: tied.length > 1, top: best };
}
