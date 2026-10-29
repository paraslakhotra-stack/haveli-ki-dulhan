// Séance runes. `svg` is inner markup for a 0 0 100 100 viewBox, drawn with stroke="currentColor" fill="none".
// `desc` is what the clue-holder reads — the tapper only sees the glyph, so the coven has to describe it.

export const RUNES = [
  { id: 'eye', desc: 'an eye with a slit for a pupil', svg: '<path d="M10 50 Q50 15 90 50 Q50 85 10 50Z"/><path d="M50 32 L50 68"/>' },
  { id: 'moon', desc: 'a crescent moon with a dot inside it', svg: '<path d="M62 14 A38 38 0 1 0 62 86 A30 30 0 1 1 62 14Z"/><circle cx="44" cy="50" r="5" fill="currentColor"/>' },
  { id: 'key', desc: 'a key pointing downward', svg: '<circle cx="50" cy="24" r="13"/><path d="M50 37 L50 88 M50 70 L63 70 M50 82 L60 82"/>' },
  { id: 'ring', desc: 'a circle that is broken open at the top', svg: '<path d="M38 18 A34 34 0 1 0 62 18"/>' },
  { id: 'cross', desc: 'an upside-down cross', svg: '<path d="M50 10 L50 90 M32 66 L68 66"/>' },
  { id: 'trident', desc: 'a three-pronged fork', svg: '<path d="M50 90 L50 30 M26 14 L26 38 Q26 48 50 48 Q74 48 74 38 L74 14 M50 14 L50 48"/>' },
  { id: 'spiral', desc: 'a spiral curling inward', svg: '<path d="M50 50 m0 -4 a4 4 0 1 1 -4 4 a10 10 0 1 1 10 10 a18 18 0 1 1 -18 -18 a28 28 0 1 1 28 28"/>' },
  { id: 'hourglass', desc: 'an hourglass — two triangles touching at the tips', svg: '<path d="M22 12 L78 12 L22 88 L78 88 Z"/>' },
  { id: 'arrow', desc: 'an arrow pointing up through a flat bar', svg: '<path d="M50 90 L50 12 M32 30 L50 12 L68 30 M24 60 L76 60"/>' },
  { id: 'sulphur', desc: 'a triangle sitting on top of a cross', svg: '<path d="M50 10 L78 52 L22 52 Z M50 52 L50 92 M34 74 L66 74"/>' },
  { id: 'waves', desc: 'three wavy lines stacked on top of each other', svg: '<path d="M12 30 q10 -12 19 0 t19 0 t19 0 t19 0 M12 52 q10 -12 19 0 t19 0 t19 0 t19 0 M12 74 q10 -12 19 0 t19 0 t19 0 t19 0"/>' },
  { id: 'flame', desc: 'a candle flame standing on a short line', svg: '<path d="M50 12 Q74 44 62 64 Q50 78 38 64 Q26 44 50 12Z M30 86 L70 86"/>' },
];

export const ORDINALS = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH'];
