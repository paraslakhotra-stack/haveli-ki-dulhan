// SVG builders shared by the TV and phones: rangoli symbols, thandai glasses, dulhans in ghoonghat, diyas, the clock.
import { RUNES } from '/content/runes.js';

const RUNE_MAP = Object.fromEntries(RUNES.map((r) => [r.id, r]));
export const runeDesc = (id) => RUNE_MAP[id]?.desc || '';

export function runeSvg(id, { size = 64, color = 'currentColor', glow = false, stroke = 6 } = {}) {
  const r = RUNE_MAP[id];
  const body = r ? r.svg : '<path d="M30 30 L70 70 M70 30 L30 70"/>';
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="${glow ? `filter:drop-shadow(0 0 6px ${color})` : ''}">${body}</svg>`;
}

const DRINK = { rose: '#f07fa3', thandai: '#f1ead8', kesar: '#f0b445' };
const RIM = { gold: '#e2b84f', silver: '#cdd6df' };

export function glassSvg(gl, { size = 90, highlight = null, poisoned = false } = {}) {
  const drink = DRINK[gl.drink] || '#888';
  const rim = RIM[gl.rim] || '#ccc';
  const id = `gd${gl.pos}${(gl.drink || '').length}`;
  const crack = gl.mark === 'crack' ? '<path d="M40 22 L34 34 L40 40 L33 56" stroke="#fff" stroke-width="1.6" fill="none" opacity=".9"/>' : '';
  const lip = gl.mark === 'lipstick' ? '<path d="M17 15 q5 -4 10 0 q-5 4 -10 0Z" fill="#e0103a" opacity=".95"/><path d="M18 15.5 q4 2.5 8 0" stroke="#7a0016" stroke-width=".8" fill="none"/>' : '';
  const glow = highlight ? `filter="drop-shadow(0 0 8px ${highlight})"` : '';
  // A tall Rajasthani silver/gold tumbler with a thandai-style drink and a sprinkle of nuts/saffron on top.
  return `<svg viewBox="0 0 60 112" width="${size * 0.6}" height="${size * 1.12}" ${glow}>
    <defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${drink}"/><stop offset=".65" stop-color="${drink}" stop-opacity=".85"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient></defs>
    <path d="M12 14 L17 96 Q30 102 43 96 L48 14 Z" fill="rgba(220,230,240,.07)" stroke="rgba(230,240,255,.55)" stroke-width="1.5"/>
    <path d="M14 32 L17.8 94 Q30 99 42.2 94 L46 32 Z" fill="url(#${id})"/>
    <ellipse cx="30" cy="32" rx="16" ry="3" fill="${drink}"/>
    ${gl.drink === 'thandai' ? '<circle cx="25" cy="32" r="1.2" fill="#7fae4a"/><circle cx="33" cy="31.5" r="1" fill="#c8102e"/><circle cx="29" cy="33" r="1" fill="#d9a640"/>' : ''}
    ${gl.drink === 'kesar' ? '<path d="M24 31 l3 1 M31 32 l3 -1 M28 33 l2 1" stroke="#c0392b" stroke-width="1"/>' : ''}
    ${gl.drink === 'rose' ? '<ellipse cx="30" cy="31.5" rx="4" ry="1.4" fill="#c8104a" opacity=".8"/>' : ''}
    <ellipse cx="30" cy="14" rx="18" ry="3.6" fill="none" stroke="${rim}" stroke-width="3.2"/>
    <path d="M15 62 L45 62" stroke="${rim}" stroke-width="2" opacity=".7"/>
    ${lip}${crack}
    ${poisoned ? '<text x="30" y="58" text-anchor="middle" font-size="16" fill="#9dff8a">☠</text>' : ''}
    <path d="M18 22 L20 86" stroke="rgba(255,255,255,.3)" stroke-width="1.5" fill="none"/>
  </svg>`;
}

// A dulhan in ghoonghat. Attributes: ghoonghat long|short|torn, varmala genda|gulab|mogra, chooda red|white, nath yes/no.
// state: 'veiled' (default), 'real' (the bride smiles back), 'chudail' (hollow eyes, feet turned backwards).
export function brideSvg(b, { size = 240, state = 'veiled', label = '' } = {}) {
  const st = state === 'vesper' ? 'chudail' : state;
  const chooda = b.chooda === 'white' ? '#f4efe6' : '#c8102e';
  const flower = { genda: ['#f39c12', '#ffb43a'], gulab: ['#c8103a', '#e8405f'], mogra: ['#fbfbf4', '#e9e6d6'] }[b.varmala] || ['#f39c12', '#ffb43a'];
  const gh = b.ghoonghat || 'long';
  const ghEnd = gh === 'long' ? 352 : gh === 'short' ? 120 : 255;
  const ghPath = gh === 'torn'
    ? 'M58 44 Q100 -2 142 44 L160 120 L152 170 L164 232 L140 206 L132 255 L114 214 L100 252 L86 212 L68 250 L60 204 L38 230 L48 170 L40 120 Z'
    : `M58 44 Q100 -2 142 44 L${154 + (ghEnd > 200 ? 22 : 8)} ${ghEnd} Q100 ${ghEnd + 10} ${46 - (ghEnd > 200 ? 22 : 8)} ${ghEnd} Z`;
  const garland = Array.from({ length: 13 }, (_, i) => {
    const a = Math.PI * (0.08 + (i / 12) * 0.84);
    const x = 100 - Math.cos(a) * 34;
    const y = 96 + Math.sin(a) * 58;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.2" fill="${flower[i % 2]}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>`;
  }).join('');
  const bangles = (x0, y0, dir) => Array.from({ length: 6 }, (_, i) => `<ellipse cx="${x0 + dir * i * 1.2}" cy="${y0 + i * 5}" rx="8" ry="2.4" fill="none" stroke="${chooda}" stroke-width="2.4"/>`).join('');
  const face = st === 'chudail'
    ? '<ellipse cx="100" cy="64" rx="20" ry="25" fill="#c3cbbd"/><ellipse cx="92" cy="62" rx="5" ry="6" fill="#000"/><ellipse cx="108" cy="62" rx="5" ry="6" fill="#000"/><circle cx="92" cy="62" r="1.6" fill="#ff2a4a"/><circle cx="108" cy="62" r="1.6" fill="#ff2a4a"/><path d="M90 78 Q100 90 110 78" stroke="#300" stroke-width="2" fill="#200"/>'
    : st === 'real'
      ? '<ellipse cx="100" cy="64" rx="20" ry="25" fill="#d9a77f"/><path d="M80 54 Q100 28 120 54 Q122 40 100 36 Q78 40 80 54Z" fill="#1d120c"/><circle cx="100" cy="51" r="2.2" fill="#c8102e"/><circle cx="92" cy="63" r="2.4" fill="#2a1a10"/><circle cx="108" cy="63" r="2.4" fill="#2a1a10"/><path d="M92 76 Q100 82 108 76" stroke="#8a2a2a" stroke-width="2" fill="none"/>'
      : '<ellipse cx="100" cy="64" rx="20" ry="25" fill="#b98d6b" opacity=".55"/>';
  const nath = b.nath ? '<circle cx="106" cy="72" r="5" fill="none" stroke="#f2c44a" stroke-width="1.8"/><path d="M110 70 Q122 58 120 46" stroke="#f2c44a" stroke-width=".9" fill="none"/><circle cx="106" cy="77" r="1.4" fill="#fff"/>' : '';
  const feet = st === 'chudail'
    ? '<path d="M78 350 l-22 4 l22 4 Z M122 350 l22 4 l-22 4 Z" fill="#c3cbbd"/>' // heels forward, toes back
    : '<path d="M80 350 l18 4 l-18 4 Z M120 350 l-18 4 l18 4 Z" fill="#9a6b4f" opacity=".7"/>';
  const ghOpacity = st === 'veiled' ? 0.5 : 0.22;
  return `<svg viewBox="0 0 200 362" width="${size * 0.56}" height="${size}">
    <defs>
      <linearGradient id="lehenga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a5101f"/><stop offset="1" stop-color="#5a0610"/></linearGradient>
      <radialGradient id="aura" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="rgba(255,190,120,.22)"/><stop offset="1" stop-color="rgba(255,190,120,0)"/></radialGradient>
    </defs>
    <ellipse cx="100" cy="180" rx="100" ry="180" fill="url(#aura)"/>
    ${feet}
    <path d="M70 100 Q100 90 130 100 L136 160 Q174 262 186 350 L14 350 Q26 262 64 160 Z" fill="url(#lehenga)" stroke="#3a0408" stroke-width="1"/>
    <path d="M24 322 Q100 336 176 322 L182 340 Q100 354 18 340 Z" fill="#d8a640" opacity=".9"/>
    <path d="M40 262 Q100 274 160 262" stroke="#d8a640" stroke-width="3" fill="none" opacity=".75"/>
    ${Array.from({ length: 9 }, (_, i) => `<circle cx="${40 + i * 15}" cy="${296 + Math.sin(i) * 3}" r="2.6" fill="#f2c44a" opacity=".8"/>`).join('')}
    <path d="M64 160 Q100 172 136 160" stroke="#d8a640" stroke-width="2" fill="none"/>
    <path d="M70 102 Q54 164 84 232" stroke="#a5101f" stroke-width="13" stroke-linecap="round" fill="none"/>
    <path d="M130 102 Q146 164 116 232" stroke="#a5101f" stroke-width="13" stroke-linecap="round" fill="none"/>
    ${bangles(74, 196, -1)}${bangles(122, 196, 1)}
    <ellipse cx="100" cy="238" rx="16" ry="9" fill="#c98a5e"/><path d="M90 236 q5 4 10 0 q5 4 10 0" stroke="#7a3a1a" stroke-width="1" fill="none"/>
    ${face}
    ${garland}
    <path d="${ghPath}" fill="rgba(200,16,46,${ghOpacity})" stroke="#e2b84f" stroke-width="2"/>
    <path d="M58 44 Q100 -2 142 44" stroke="#f2c44a" stroke-width="3" fill="none"/>
    ${nath}
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

// A clay diya (oil lamp). Same signature the old candle had: (lit, flame colour, size).
export function diyaSvg(lit = true, color = '#ffb35c', size = 60) {
  return `<svg viewBox="0 0 60 70" width="${size * 0.86}" height="${size}">
    ${lit ? `<ellipse cx="30" cy="22" rx="20" ry="22" fill="${color}" opacity=".18"/><path class="flame" d="M30 6 Q39 20 33 30 Q30 34 27 30 Q21 20 30 6Z" fill="${color}"/><path d="M30 15 Q33 22 31 28 Q30 29 29 28 Q27 22 30 15Z" fill="#fff6d8"/>` : '<path d="M30 30 q-5 -9 2 -16 q-1 7 3 10" stroke="#777" fill="none" opacity=".6"/>'}
    <path d="M6 40 Q30 66 54 40 Q30 48 6 40Z" fill="#a8582a" stroke="#6a3416" stroke-width="1.2"/>
    <path d="M48 41 L57 35" stroke="#a8582a" stroke-width="5" stroke-linecap="round"/>
    <path d="M12 46 Q30 58 48 46" stroke="#e0a050" stroke-width="1.2" fill="none" opacity=".8"/>
    <circle cx="20" cy="48" r="1.4" fill="#f2c44a"/><circle cx="30" cy="51" r="1.4" fill="#f2c44a"/><circle cx="40" cy="48" r="1.4" fill="#f2c44a"/>
  </svg>`;
}
export const candleSvg = diyaSvg;
