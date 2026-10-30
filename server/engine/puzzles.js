// Generators for the mystery puzzles. Every generator guarantees the puzzle has exactly one solution.
import { RUNES, ORDINALS } from '../content/runes.js';

// ---------- Séance Circle ----------
// One sigil per coven: an ordered rune sequence, the pad of runes each member sees, and clue pages.
export function makeSeance(rng, memberIds, length) {
  const pool = rng.shuffle(RUNES);
  const seq = pool.slice(0, length).map((r) => r.id);
  const padIds = rng.shuffle(pool.slice(0, Math.min(RUNES.length, length + 4)).map((r) => r.id));
  const m = memberIds.length;
  // Clue for position p goes to the member AFTER the tapper of p, so the tapper never holds their own clue.
  const clues = {};
  for (const id of memberIds) clues[id] = [];
  seq.forEach((runeId, p) => {
    const holder = memberIds[(p + 1) % m];
    const rune = RUNES.find((r) => r.id === runeId);
    clues[holder].push({ pos: p, text: `The ${ORDINALS[p]} mark she carved: ${rune.desc}.` });
  });
  for (const id of memberIds) clues[id].sort((a, b) => a.pos - b.pos);
  const pads = {};
  for (const id of memberIds) pads[id] = rng.shuffle(padIds);
  return { seq, pads, clues };
}

// ---------- Generic elimination solver ----------
// candidates: array of solutions; pool: [{ text, test(sol) }] all true for `answer`.
// Greedily picks clues (random order) that each remove at least one remaining candidate until one is left.
function pickClues(rng, candidates, answer, pool, { maxSingleElim = Infinity } = {}) {
  let remaining = candidates.slice();
  const chosen = [];
  const shuffled = rng.shuffle(pool);
  // Prefer "weaker" clues first so no single page gives the game away.
  for (const pass of [maxSingleElim, Infinity]) {
    for (const c of shuffled) {
      if (remaining.length <= 1) break;
      if (chosen.includes(c)) continue;
      const after = remaining.filter((s) => c.test(s));
      const removed = remaining.length - after.length;
      if (removed > 0 && removed <= pass) {
        chosen.push(c);
        remaining = after;
      }
    }
  }
  if (remaining.length !== 1 || remaining[0] !== answer) return null;
  return chosen;
}

// ---------- The Poisoned Glass ----------
const WINES = ['red', 'white', 'rosé'];
const RIMS = ['gold', 'silver'];
const MARKS = ['none', 'lipstick', 'crack'];
const MARK_TEXT = { none: 'no mark', lipstick: 'a lipstick mark', crack: 'a crack' };

export function makeGlasses(rng) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const glasses = [];
    for (let i = 0; i < 6; i++) {
      glasses.push({ pos: i + 1, wine: rng.pick(WINES), rim: rng.pick(RIMS), mark: rng.pick(MARKS) });
    }
    // Every wine, rim and mark must appear so the table looks varied and the clues have something to bite on.
    const varied = WINES.every((w) => glasses.some((g) => g.wine === w))
      && RIMS.every((r) => glasses.some((g) => g.rim === r))
      && MARKS.every((m) => glasses.some((g) => g.mark === m));
    if (!varied) continue;
    const target = glasses[rng.int(6)];
    const pool = glassCluePool(glasses, target);
    const clues = pickClues(rng, glasses, target, pool.truths, { maxSingleElim: 2 });
    if (clues && clues.length >= 4 && clues.length <= 6) {
      return { glasses, answer: target.pos, clues: clues.map((c) => c.text), spare: rng.shuffle(pool.truths.filter((c) => !clues.includes(c))).map((c) => c.text), lies: rng.shuffle(pool.lies).map((c) => c.text) };
    }
  }
  throw new Error('glass generation failed');
}

function glassCluePool(glasses, t) {
  const truths = [];
  const lies = [];
  const add = (text, test) => (test(t) ? truths : lies).push({ text, test });
  for (const w of WINES) {
    add(`The poisoned glass holds ${w} wine.`, (g) => g.wine === w);
    add(`The poisoned glass does NOT hold ${w} wine.`, (g) => g.wine !== w);
  }
  for (const r of RIMS) add(`The poisoned glass has a ${r} rim.`, (g) => g.rim === r);
  for (const m of MARKS) {
    add(`The poisoned glass has ${MARK_TEXT[m]}.`, (g) => g.mark === m);
    if (m !== 'none') add(`The poisoned glass does NOT have ${MARK_TEXT[m]}.`, (g) => g.mark !== m);
  }
  add('The poisoned glass stands in an odd-numbered place.', (g) => g.pos % 2 === 1);
  add('The poisoned glass stands in an even-numbered place.', (g) => g.pos % 2 === 0);
  add('The poisoned glass is not at either end of the table.', (g) => g.pos !== 1 && g.pos !== 6);
  add('The poisoned glass is in the left half of the table (1–3).', (g) => g.pos <= 3);
  add('The poisoned glass is in the right half of the table (4–6).', (g) => g.pos >= 4);
  for (const w of WINES) {
    add(`Somewhere to the RIGHT of the poisoned glass is a glass of ${w} wine.`, (g) => glasses.some((o) => o.pos > g.pos && o.wine === w));
    add(`Directly next to the poisoned glass is a glass of ${w} wine.`, (g) => glasses.some((o) => Math.abs(o.pos - g.pos) === 1 && o.wine === w));
  }
  return { truths, lies };
}

// ---------- The Crypt Code ----------
const ORD = ['first', 'second', 'third', 'fourth'];
const PRIMES = new Set([2, 3, 5, 7]);

export function makeCrypt(rng) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = [1 + rng.int(9), rng.int(10), rng.int(10), rng.int(10)];
    const all = [];
    for (let n = 0; n < 10000; n++) all.push([Math.floor(n / 1000), Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10]);
    const answer = all[code[0] * 1000 + code[1] * 100 + code[2] * 10 + code[3]];
    const pool = cryptPool(rng, code);
    const clues = pickClues(rng, all, answer, pool, { maxSingleElim: 5000 });
    if (clues && clues.length >= 7 && clues.length <= 14) {
      return { code: code.join(''), clues: rng.shuffle(clues.map((c) => c.text)), spare: rng.shuffle(pool.filter((c) => !clues.includes(c))).map((c) => c.text) };
    }
  }
  throw new Error('crypt generation failed');
}

function cryptPool(rng, code) {
  const pool = [];
  const add = (text, test) => { if (test(code)) pool.push({ text, test }); };
  for (let i = 0; i < 4; i++) {
    const d = code[i];
    add(`The ${ORD[i]} digit is ${d % 2 ? 'odd' : 'even'}.`, (c) => c[i] % 2 === d % 2);
    add(`The ${ORD[i]} digit is ${PRIMES.has(d) ? '' : 'NOT '}a prime number (2, 3, 5, 7).`, (c) => PRIMES.has(c[i]) === PRIMES.has(d));
    const k = rng.int(9);
    add(`The ${ORD[i]} digit is greater than ${k}.`, (c) => c[i] > k);
    const k2 = 1 + rng.int(9);
    add(`The ${ORD[i]} digit is less than ${k2}.`, (c) => c[i] < k2);
    const opts = new Set([d]);
    while (opts.size < 3) opts.add(rng.int(10));
    const list = [...opts].sort((a, b) => a - b);
    add(`The ${ORD[i]} digit is one of ${list[0]}, ${list[1]} or ${list[2]}.`, (c) => list.includes(c[i]));
    const not = (d + 1 + rng.int(9)) % 10;
    add(`The ${ORD[i]} digit is not ${not}.`, (c) => c[i] !== not);
    for (let j = 0; j < 4; j++) {
      if (j === i) continue;
      const diff = code[i] - code[j];
      if (diff > 0 && diff <= 4) add(`The ${ORD[i]} digit is the ${ORD[j]} digit plus ${diff}.`, (c) => c[i] - c[j] === diff);
      if (code[i] === code[j] * 2 && code[j] > 0) add(`The ${ORD[i]} digit is double the ${ORD[j]} digit.`, (c) => c[i] === c[j] * 2);
      if (code[i] === code[j] && i < j) add(`The ${ORD[i]} and ${ORD[j]} digits are the same.`, (c) => c[i] === c[j]);
    }
  }
  const sum = code.reduce((a, b) => a + b, 0);
  add(`All four digits add up to ${sum}.`, (c) => c[0] + c[1] + c[2] + c[3] === sum);
  return pool;
}

// ---------- The Three Brides ----------
const VEILS = ['long', 'short', 'torn'];
const BOUQUETS = ['white roses', 'black roses', 'lilies'];
const GLOVES = ['white', 'black'];

export function makeBrides(rng) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const brides = [0, 1, 2].map((i) => ({
      idx: i,
      veil: rng.pick(VEILS),
      bouquet: rng.pick(BOUQUETS),
      gloves: rng.pick(GLOVES),
      locket: rng() < 0.5,
    }));
    const key = (b) => `${b.veil}|${b.bouquet}|${b.gloves}|${b.locket}`;
    if (new Set(brides.map(key)).size < 3) continue;
    const real = brides[rng.int(3)];
    const truths = [];
    const lies = [];
    const add = (truthText, lieText, test) => {
      if (test(real)) truths.push({ text: truthText, test });
      else lies.push({ text: lieText, test });
    };
    for (const v of VEILS) add(`My veil is ${v}.`, `Your precious bride's veil is ${v}.`, (b) => b.veil === v);
    for (const q of BOUQUETS) add(`I'm holding ${q}.`, `She is holding ${q}, darling.`, (b) => b.bouquet === q);
    for (const h of GLOVES) add(`I'm wearing ${h} gloves.`, `Look for the ${h} gloves, darling.`, (b) => b.gloves === h);
    add("I'm wearing my grandmother's locket.", 'She wears a locket around her neck.', (b) => b.locket);
    add("I'm not wearing a locket — Vesper took it.", "She isn't wearing a locket.", (b) => !b.locket);
    const clues = pickClues(rng, brides, real, truths, { maxSingleElim: 1 });
    if (!clues) continue;
    // Lies must each point at a FALSE bride (so the red whispers are genuinely misleading).
    const usableLies = lies.filter((l) => brides.some((b) => b !== real && l.test(b)));
    if (usableLies.length < 2) continue;
    return {
      brides: brides.map(({ idx, veil, bouquet, gloves, locket }) => ({ idx, veil, bouquet, gloves, locket })),
      answer: real.idx,
      whispers: clues.map((c) => c.text),
      extraTruths: rng.shuffle(truths.filter((c) => !clues.includes(c))).map((c) => c.text),
      lies: rng.shuffle(usableLies).map((c) => c.text),
    };
  }
  throw new Error('bride generation failed');
}
