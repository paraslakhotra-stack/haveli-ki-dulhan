// SVG builders shared by the TV and phones: runes, wine glasses, veiled brides, the clock.
import { RUNES } from '/content/runes.js';

const RUNE_MAP = Object.fromEntries(RUNES.map((r) => [r.id, r]));
export const runeDesc = (id) => RUNE_MAP[id]?.desc || '';

export function runeSvg(id, { size = 64, color = 'currentColor', glow = false, stroke = 6 } = {}) {
  const r = RUNE_MAP[id];
  const body = r ? r.svg : '<path d="M30 30 L70 70 M70 30 L30 70"/>';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="${glow ? `filter:drop-shadow(0 0 6px ${color})` : ''}">${body}</svg>`;
}

const WINE = { red: '#7a0c1f', white: '#e6d27a', 'rosé': '#f08aa6' };
const RIM = { gold: '#e2b84f', silver: '#cdd6df' };

export function glassSvg(gl, { size = 90, highlight = null, poisoned = false } = {}) {
  const wine = WINE[gl.wine] || '#888';
  const rim = RIM[gl.rim] || '#ccc';
  const crack = gl.mark === 'crack' ? '<path d="M38 18 L33 30 L39 36 L32 50" stroke="#fff" stroke-width="1.6" fill="none" opacity=".9"/>' : '';
  const lip = gl.mark === 'lipstick' ? '<path d="M17 13 q5 -4 10 0 q-5 4 -10 0Z" fill="#e0103a" opacity=".95"/><path d="M18 13.5 q4 2.5 8 0" stroke="#7a0016" stroke-width=".8" fill="none"/>' : '';
  const glow = highlight ? `filter="drop-shadow(0 0 8px ${highlight})"` : '';
  return `<svg viewBox="0 0 60 112" width="${size * 0.6}" height="${size * 1.12}" ${glow}>
    <defs><linearGradient id="gw${gl.pos}${gl.wine.length}" x1="0" x2="1"><stop offset="0" stop-color="${wine}" stop-opacity=".95"/><stop offset=".6" stop-color="${wine}" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient></defs>
    <path d="M10 12 Q8 50 30 60 Q52 50 50 12 Z" fill="rgba(220,230,240,.08)" stroke="rgba(230,240,255,.55)" stroke-width="1.5"/>
    <path d="M11.5 28 Q12 50 30 57 Q48 50 48.5 28 Z" fill="url(#gw${gl.pos}${gl.wine.length})"/>
    <ellipse cx="30" cy="28" rx="18.5" ry="3" fill="${wine}" opacity=".9"/>
    <ellipse cx="30" cy="12" rx="20" ry="4" fill="none" stroke="${rim}" stroke-width="3"/>
    ${lip}${crack}
    <path d="M30 60 L30 96" stroke="rgba(230,240,255,.6)" stroke-width="3"/>
    <ellipse cx="30" cy="99" rx="15" ry="4" fill="rgba(230,240,255,.18)" stroke="rgba(230,240,255,.55)" stroke-width="1.5"/>
    ${poisoned ? '<text x="30" y="46" text-anchor="middle" font-size="16" fill="#9dff8a">☠</text>' : ''}
    <path d="M16 18 Q14 40 22 52" stroke="rgba(255,255,255,.35)" stroke-width="1.5" fill="none"/>
  </svg>`;
}

// A veiled bride. Attributes: veil long|short|torn, bouquet, gloves white|black, locket.
export function brideSvg(b, { size = 240, state = 'veiled', label = '' } = {}) {
  const gloves = b.gloves === 'black' ? '#111' : '#f4efe6';
  const veilLen = b.veil === 'long' ? 350 : b.veil === 'short' ? 120 : 250;
  const veilPath = b.veil === 'torn'
    ? `M60 40 Q100 0 140 40 L156 120 L150 170 L160 230 L138 205 L130 250 L112 215 L100 250 L86 210 L70 248 L62 200 L42 228 L50 170 L44 120 Z`
    : `M60 40 Q100 0 140 40 L${150 + (veilLen > 200 ? 18 : 6)} ${veilLen} L${50 - (veilLen > 200 ? 18 : 6)} ${veilLen} Z`;
  const bouquetColors = { 'white roses': ['#f7f2ea', '#e4dccd'], 'black roses': ['#1b1014', '#3a1420'], lilies: ['#fbfbf6', '#ffe9a8'] }[b.bouquet] || ['#ccc', '#aaa'];
  const flowers = [[-14, -4], [0, -10], [14, -4], [-8, 6], [8, 6], [0, 0]].map(([x, y], i) => b.bouquet === 'lilies'
    ? `<path d="M${100 + x} ${248 + y} l-6 -12 l6 4 l6 -4 Z" fill="${bouquetColors[i % 2]}" stroke="#d9c58a" stroke-width=".6"/>`
    : `<circle cx="${100 + x}" cy="${248 + y}" r="10" fill="${bouquetColors[i % 2]}" stroke="${b.bouquet === 'black roses' ? '#5a1a2a' : '#c9bfae'}" stroke-width="1"/><path d="M${97 + x} ${247 + y} q3 -3 6 0" stroke="${b.bouquet === 'black roses' ? '#000' : '#bfb5a2'}" fill="none"/>`).join('');
  const locket = b.locket ? '<path d="M86 92 Q100 108 114 92" stroke="#d8b04a" stroke-width="1.6" fill="none"/><path d="M100 104 l-5 -5 a3 3 0 0 1 5 -3 a3 3 0 0 1 5 3 Z" fill="#e2b84f" stroke="#8a6a1a" stroke-width=".6"/>' : '';
  const face = state === 'vesper'
    ? '<ellipse cx="100" cy="62" rx="20" ry="25" fill="#c8d0c0"/><ellipse cx="92" cy="60" rx="5" ry="6" fill="#000"/><ellipse cx="108" cy="60" rx="5" ry="6" fill="#000"/><circle cx="92" cy="60" r="1.6" fill="#ff2a4a"/><circle cx="108" cy="60" r="1.6" fill="#ff2a4a"/><path d="M90 76 Q100 86 110 76" stroke="#300" stroke-width="2" fill="#200"/>'
    : state === 'real'
      ? '<ellipse cx="100" cy="62" rx="20" ry="25" fill="#e8c6a8"/><path d="M80 52 Q100 26 120 52 Q122 40 100 36 Q78 40 80 52Z" fill="#3a2418"/><circle cx="92" cy="62" r="2.4" fill="#2a1a10"/><circle cx="108" cy="62" r="2.4" fill="#2a1a10"/><path d="M92 74 Q100 80 108 74" stroke="#9a4a3a" stroke-width="2" fill="none"/>'
      : '<ellipse cx="100" cy="62" rx="20" ry="25" fill="#cfc7bb" opacity=".55"/>';
  const veilOpacity = state === 'veiled' ? 0.42 : 0.2;
  return `<svg viewBox="0 0 200 360" width="${size * 0.56}" height="${size}">
    <defs>
      <linearGradient id="dress" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f3ede2"/><stop offset="1" stop-color="#9c958a"/></linearGradient>
      <radialGradient id="aura" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="rgba(220,230,255,.25)"/><stop offset="1" stop-color="rgba(220,230,255,0)"/></radialGradient>
    </defs>
    <ellipse cx="100" cy="180" rx="100" ry="180" fill="url(#aura)"/>
    <path d="M70 96 Q100 86 130 96 L136 160 Q170 260 182 352 L18 352 Q30 260 64 160 Z" fill="url(#dress)" stroke="#d9d2c4" stroke-width="1"/>
    <path d="M64 160 Q100 172 136 160" stroke="#bdb5a6" fill="none"/>
    <path d="M70 100 Q52 160 80 238" stroke="${gloves}" stroke-width="13" stroke-linecap="round" fill="none"/>
    <path d="M70 100 Q52 160 80 238" stroke="${b.gloves === 'black' ? '#000' : '#a89f90'}" stroke-width="1.2" fill="none" transform="translate(-6 0)"/>
    <path d="M130 100 Q148 160 120 238" stroke="${gloves}" stroke-width="13" stroke-linecap="round" fill="none"/>
    ${face}${locket}
    <path d="M100 252 L100 300" stroke="#3d5a2a" stroke-width="4"/>
    ${flowers}
    <path d="${veilPath}" fill="rgba(245,245,250,${veilOpacity})" stroke="rgba(255,255,255,.6)" stroke-width="1"/>
    ${label ? `<text x="100" y="20" text-anchor="middle" font-family="Cinzel, serif" font-size="22" fill="#efe6d8">${label}</text>` : ''}
  </svg>`;
}

// Analog clock face showing e.g. "11:45 PM".
export function clockSvg(time, size = 160) {
  const m = /(\d+):(\d+)/.exec(time || '12:00');
  const hh = Number(m?.[1] || 12) % 12;
  const mm = Number(m?.[2] || 0);
  const ha = ((hh + mm / 60) / 12) * Math.PI * 2;
  const ma = (mm / 60) * Math.PI * 2;
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<line x1="${50 + Math.sin(a) * 40}" y1="${50 - Math.cos(a) * 40}" x2="${50 + Math.sin(a) * 45}" y2="${50 - Math.cos(a) * 45}" stroke="#d9c9a8" stroke-width="${i % 3 ? 1.2 : 2.6}"/>`;
  }).join('');
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">
    <circle cx="50" cy="50" r="48" fill="#120d0a" stroke="#8a6a3a" stroke-width="2"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="#3a2a18" stroke-width="1"/>
    ${ticks}
    <line x1="50" y1="50" x2="${50 + Math.sin(ha) * 24}" y2="${50 - Math.cos(ha) * 24}" stroke="#efe6d8" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="${50 + Math.sin(ma) * 36}" y2="${50 - Math.cos(ma) * 36}" stroke="#c8102e" stroke-width="2" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="2.6" fill="#c8102e"/>
  </svg>`;
}

export function candleSvg(lit = true, color = '#ffb35c', size = 60) {
  return `<svg viewBox="0 0 40 90" width="${size * 0.45}" height="${size}">
    ${lit ? `<ellipse cx="20" cy="18" rx="16" ry="18" fill="${color}" opacity=".18"/><path class="flame" d="M20 4 Q28 16 23 24 Q20 28 17 24 Q12 16 20 4Z" fill="${color}"/><path d="M20 12 Q23 18 21 23 Q20 24 19 23 Q17 18 20 12Z" fill="#fff6d8"/>` : '<path d="M20 22 q-4 -8 2 -14 q-1 6 3 9" stroke="#666" fill="none" opacity=".6"/>'}
    <line x1="20" y1="24" x2="20" y2="30" stroke="#222" stroke-width="1.5"/>
    <rect x="12" y="30" width="16" height="56" rx="2" fill="#e9dfcb"/>
    <path d="M12 34 q4 6 0 12 M28 32 q-3 8 0 14" stroke="#cfc3ab" fill="none"/>
  </svg>`;
}
