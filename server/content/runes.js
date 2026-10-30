// Tantrik Rangoli symbols — neutral Indian folk objects (no deities or sacred religious symbols).
// `svg` is inner markup for a 0 0 100 100 viewBox, drawn with stroke="currentColor" fill="none".
// `desc` is what the clue-holder reads aloud — the tapper only sees the drawing.

export const RUNES = [
  { id: 'nazar', desc: 'ek aankh, do gol gheron ke beech — a nazar charm (an eye inside two circles)', svg: '<circle cx="50" cy="50" r="40"/><circle cx="50" cy="50" r="27"/><circle cx="50" cy="50" r="11" fill="currentColor"/>' },
  { id: 'nimbu', desc: 'nimbu-mirchi — a lemon on a thread with chillies hanging below it', svg: '<path d="M50 6 L50 26"/><ellipse cx="50" cy="38" rx="14" ry="12"/><path d="M50 50 L50 60 M38 60 Q36 80 42 92 M50 60 Q50 82 50 94 M62 60 Q64 80 58 92"/>' },
  { id: 'diya', desc: 'ek diya — a little oil lamp with a flame on top', svg: '<path d="M14 62 Q50 92 86 62 Q50 72 14 62Z"/><path d="M78 62 L90 54"/><path d="M50 52 Q60 36 50 16 Q40 36 50 52Z"/>' },
  { id: 'payal', desc: 'payal — a curved chain with little bells hanging from it', svg: '<path d="M10 36 Q50 72 90 36"/><circle cx="24" cy="58" r="6"/><circle cx="40" cy="66" r="6"/><circle cx="60" cy="66" r="6"/><circle cx="76" cy="58" r="6"/>' },
  { id: 'choodi', desc: 'teen choodiyan — three bangles overlapping in a row', svg: '<circle cx="28" cy="50" r="20"/><circle cx="50" cy="50" r="20"/><circle cx="72" cy="50" r="20"/>' },
  { id: 'chaabi', desc: 'ek chaabi — a key pointing downward', svg: '<circle cx="50" cy="24" r="13"/><path d="M50 37 L50 88 M50 70 L63 70 M50 82 L60 82"/>' },
  { id: 'chaand', desc: 'aadha chaand — a crescent moon with a dot inside it', svg: '<path d="M62 14 A38 38 0 1 0 62 86 A30 30 0 1 1 62 14Z"/><circle cx="44" cy="50" r="5" fill="currentColor"/>' },
  { id: 'dhaga', desc: 'kaala dhaga — a wavy thread with a knot in the middle', svg: '<path d="M8 50 Q20 30 32 50 T44 50"/><circle cx="50" cy="50" r="7"/><path d="M56 50 Q68 70 80 50 T92 50"/>' },
  { id: 'aaina', desc: 'aaina — a round hand-mirror with a handle at the bottom', svg: '<circle cx="50" cy="38" r="26"/><path d="M50 64 L50 92 M40 92 L60 92"/><path d="M38 28 Q44 22 52 22"/>' },
  { id: 'kanghi', desc: 'kanghi — a comb with its teeth pointing down', svg: '<path d="M14 36 L86 36 L86 48 L14 48 Z"/><path d="M20 48 L20 78 M30 48 L30 78 M40 48 L40 78 M50 48 L50 78 M60 48 L60 78 M70 48 L70 78 M80 48 L80 78"/>' },
  { id: 'matka', desc: 'matka — a round clay pot with a narrow neck', svg: '<path d="M38 14 L62 14 M40 14 Q40 26 34 30 Q12 44 20 68 Q30 90 50 90 Q70 90 80 68 Q88 44 66 30 Q60 26 60 14"/><path d="M26 52 Q50 60 74 52"/>' },
  { id: 'lantern', desc: 'laaltain — a hanging lantern with a handle on top', svg: '<path d="M38 22 Q50 4 62 22"/><path d="M34 22 L66 22 L60 30 L40 30 Z"/><path d="M38 30 L34 76 L66 76 L62 30"/><path d="M50 44 Q56 54 50 64 Q44 54 50 44Z"/><path d="M30 76 L70 76 L66 84 L34 84 Z"/>' },
];

export const ORDINALS = ['PEHLA', 'DOOSRA', 'TEESRA', 'CHAUTHA', 'PAANCHVA', 'CHHATHA', 'SAATVA'];
