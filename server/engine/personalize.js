// Fills {GROOM}/{BRIDE} placeholders and builds the host's groom-quiz questions.

export function names(settings) {
  return {
    groom: settings.groomName?.trim() || 'the Groom',
    bride: settings.brideName?.trim() || 'the Bride',
  };
}

export function fill(text, settings) {
  const n = names(settings);
  return String(text)
    .replace(/\{GROOM\}/g, n.groom)
    .replace(/\{BRIDE\}/g, n.bride);
}

// Host-written groom questions: keep only rows with a question, an answer and at least one decoy.
// Missing decoys are padded with playful generic ones so a half-filled row still works.
const FILLER_DECOYS = ['Nobody knows', 'A haunted mansion', 'Pizza', 'His mum'];

export function groomQuestions(settings, rng) {
  const rows = Array.isArray(settings.groomQuiz) ? settings.groomQuiz : [];
  const out = [];
  for (const r of rows) {
    if (!r || !r.q?.trim() || !r.a?.trim()) continue;
    const wrong = (r.w || []).map((w) => w?.trim()).filter(Boolean).filter((w) => w.toLowerCase() !== r.a.trim().toLowerCase());
    const uniq = [...new Set(wrong)];
    for (const f of rng.shuffle(FILLER_DECOYS)) {
      if (uniq.length >= 3) break;
      if (!uniq.includes(f) && f.toLowerCase() !== r.a.trim().toLowerCase()) uniq.push(f);
    }
    out.push({ q: r.q.trim(), a: r.a.trim(), w: uniq.slice(0, 3) });
  }
  return out;
}
