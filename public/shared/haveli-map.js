// Haveli Kesargarh floor plan for Chapter V ("Solah Shringar Ki Khoj"), shared by the server (collision, stations)
// and the TV (rendering, mini-maps). A 60×40 tile grid, 40 world units per tile → a 2400×1600 world.
// Tiles: 0 floor, 1 wall, 2 solid prop (pillar, fountain, shelf…), 3 water (baoli — solid).

export const COLS = 60;
export const ROWS = 40;
export const TILE = 40;
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;

// Rooms: id, Hinglish name, tile rect [c0, r0, c1, r1] (inclusive), floor style, riddles that point here,
// and station spots (tile coords) where a team's next item can be hidden.
export const ROOMS = [
  { id: 'darwaza', name: 'Darwaza', rect: [24, 33, 35, 38], floor: 'stone', start: true },
  { id: 'aangan', name: 'Aangan', rect: [19, 14, 40, 30], floor: 'court' },
  { id: 'pothi', name: 'Pothi Khana', rect: [2, 2, 16, 11], floor: 'wood',
    riddles: ['Jahan kahaniyan kapde mein lipti soti hain, wahan tumhari agli cheez jaag rahi hai.', 'Shabd hi shabd, par koi bolta nahi — wahan dhoondho.'],
    spots: [[4, 4], [14, 4], [5, 10], [13, 9]] },
  { id: 'zenana', name: 'Zenana', rect: [20, 2, 39, 10], floor: 'tile',
    riddles: ['Jahan jhoola bina hawa ke jhoolta hai, wahan ek cheez tumhara intezaar karti hai.', 'Raniyon ki duniya, jaali ke peeche — wahan jao.'],
    spots: [[22, 4], [37, 4], [25, 9], [35, 8]] },
  { id: 'sheesh', name: 'Sheesh Mahal', rect: [43, 2, 57, 11], floor: 'mirror',
    riddles: ['Jahan ek diya hazaar ban jaata hai, wahan tumhari cheez chamak rahi hai.', 'Jahan har taraf tum hi tum ho — wahan dekho.'],
    spots: [[45, 4], [55, 4], [46, 10], [54, 9]] },
  { id: 'rasoi', name: 'Rasoi', rect: [2, 15, 16, 25], floor: 'stone',
    riddles: ['Jahan kabhi rotiyan sikti thi, wahan ab tumhari cheez khanakti hai.', 'Chulha thanda hai, par khushboo abhi bhi wahin hai.'],
    spots: [[4, 17], [14, 17], [5, 24], [13, 23]] },
  { id: 'diwan', name: 'Diwan-e-Khaas', rect: [43, 15, 57, 25], floor: 'carpet',
    riddles: ['Jahan raja darbaar lagaata tha, wahan ab sannata faisla sunata hai.', 'Gaddi khaali hai, par darbaar abhi bhi laga hai.'],
    spots: [[45, 17], [55, 17], [46, 24], [54, 23]] },
  { id: 'tehkhana', name: 'Tehkhana', rect: [2, 29, 16, 37], floor: 'dirt',
    riddles: ['Seedhiyan neeche, andhera upar — wahan jahan haveli apne raaz chhupati hai.', 'Zameen ke neeche, sabse purane sandook ke paas.'],
    spots: [[4, 31], [14, 31], [5, 36], [13, 35]] },
  { id: 'baoli', name: 'Baoli', rect: [43, 29, 57, 37], floor: 'step',
    riddles: ['Jahan paani seedhiyon se milne aata hai, wahan dhoondho.', 'Sau seedhiyan, ek kuan, aur ek chamakti cheez.'],
    spots: [[44, 30], [56, 30], [45, 36], [55, 36]] },
  { id: 'chhat', name: 'Chhat', rect: [20, 33, 22, 38], floor: 'stone' }, // a small rooftop stair nook beside the gate
];
export const HUNT_ROOMS = ROOMS.filter((r) => r.spots);

// Doorways (tile rects carved through walls) connecting the rooms to the aangan and the gate.
const DOORS = [
  [28, 31, 31, 32], // darwaza ↔ aangan
  [17, 6, 19, 8], // pothi ↔ zenana corridor
  [28, 11, 31, 13], // zenana ↔ aangan
  [40, 6, 42, 8], // zenana ↔ sheesh mahal
  [17, 19, 18, 21], // rasoi ↔ aangan
  [41, 19, 42, 21], // diwan ↔ aangan
  [8, 12, 10, 14], // pothi ↔ rasoi
  [49, 12, 51, 14], // sheesh ↔ diwan
  [8, 26, 10, 28], // rasoi ↔ tehkhana
  [49, 26, 51, 28], // diwan ↔ baoli
  [17, 33, 19, 35], // tehkhana ↔ chhat nook
  [23, 35, 23, 37], // chhat nook ↔ darwaza
  [36, 34, 42, 36], // darwaza ↔ baoli (long gallery)
  [19, 27, 19, 29], [40, 27, 40, 29], // aangan side gates
];

export function buildGrid() {
  const g = new Uint8Array(COLS * ROWS).fill(1);
  const set = (c, r, v) => { if (c >= 0 && r >= 0 && c < COLS && r < ROWS) g[r * COLS + c] = v; };
  const fill = ([c0, r0, c1, r1], v) => { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(c, r, v); };
  for (const room of ROOMS) fill(room.rect, 0);
  for (const d of DOORS) fill(d, 0);
  // aangan: fountain + a ring of pillars
  fill([29, 21, 30, 23], 2);
  for (const [c, r] of [[22, 16], [37, 16], [22, 28], [37, 28], [25, 22], [34, 22]]) set(c, r, 2);
  // pothi khana: shelves
  for (const r of [6, 7]) for (const c of [5, 6, 7, 11, 12, 13]) set(c, r, 2);
  // zenana: two jaali screens
  fill([26, 5, 26, 7], 2); fill([33, 5, 33, 7], 2);
  // sheesh mahal: mirror pillars
  for (const [c, r] of [[48, 6], [52, 6], [48, 8], [52, 8]]) set(c, r, 2);
  // rasoi: chulha + grain bins
  fill([8, 19, 10, 20], 2); set(3, 21, 2); set(15, 21, 2);
  // diwan: the gaddi platform
  fill([48, 18, 52, 19], 2);
  // tehkhana: crates
  for (const [c, r] of [[7, 32], [8, 32], [11, 34], [11, 35], [6, 35]]) set(c, r, 2);
  // baoli: the stepwell pool in the middle
  fill([48, 31, 52, 34], 3);
  return g;
}

export const GRID = buildGrid();
export const solidAt = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS || GRID[r * COLS + c] !== 0;
export const roomAt = (x, y) => {
  const c = Math.floor(x / TILE); const r = Math.floor(y / TILE);
  return ROOMS.find((rm) => c >= rm.rect[0] && c <= rm.rect[2] && r >= rm.rect[1] && r <= rm.rect[3]) || null;
};
export const tileCenter = (c, r) => [c * TILE + TILE / 2, r * TILE + TILE / 2];
export const roomCenter = (room) => [((room.rect[0] + room.rect[2] + 1) / 2) * TILE, ((room.rect[1] + room.rect[3] + 1) / 2) * TILE];
export const START = tileCenter(29, 36);

// Solah shringar — the bride's sixteen adornments; each team recovers five of them.
export const ITEMS = [
  { id: 'chooda', name: 'Chooda', icon: '⭕' },
  { id: 'kaleere', name: 'Kaleere', icon: '🎐' },
  { id: 'tikka', name: 'Maang Tikka', icon: '💠' },
  { id: 'nath', name: 'Nath', icon: '💍' },
  { id: 'payal', name: 'Payal', icon: '🔔' },
  { id: 'gajra', name: 'Gajra', icon: '🌼' },
  { id: 'mehendi', name: 'Mehendi', icon: '🌿' },
  { id: 'jhumke', name: 'Jhumke', icon: '📿' },
  { id: 'bindi', name: 'Bindi', icon: '🔴' },
  { id: 'bichhiya', name: 'Bichhiya', icon: '✨' },
];
