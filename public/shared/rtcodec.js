// Compact binary snapshots for the real-time chapters (zombie baraat, treasure hunt).
// A snapshot is a server time plus named tables of Int16 rows; strings ride separately in a small meta object.
//   encode(t, { p: [[x, y, ...], ...], z: [...] }) -> ArrayBuffer
//   decode(buf) -> { t, tables: { p: Int16Array rows... } }
// Layout: u32 t | u8 tableCount | per table: u8 name, u8 cols, u16 rows, Int16 data (little-endian).
const clamp = (v) => (v > 32767 ? 32767 : v < -32768 ? -32768 : Math.round(v) || 0);

export function encode(t, tables) {
  const names = Object.keys(tables);
  let size = 5;
  for (const n of names) {
    const rows = tables[n];
    const cols = rows.length ? rows[0].length : 0;
    size += 4 + rows.length * cols * 2;
  }
  const buf = new ArrayBuffer(size);
  const dv = new DataView(buf);
  dv.setUint32(0, t >>> 0, true);
  dv.setUint8(4, names.length);
  let o = 5;
  for (const n of names) {
    const rows = tables[n];
    const cols = rows.length ? rows[0].length : 0;
    dv.setUint8(o, n.charCodeAt(0)); dv.setUint8(o + 1, cols); dv.setUint16(o + 2, rows.length, true);
    o += 4;
    for (const r of rows) for (let c = 0; c < cols; c++) { dv.setInt16(o, clamp(r[c]), true); o += 2; }
  }
  return buf;
}

export function decode(input) {
  const buf = input instanceof ArrayBuffer ? input : input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  const dv = new DataView(buf);
  const t = dv.getUint32(0, true);
  const n = dv.getUint8(4);
  const tables = {};
  let o = 5;
  for (let i = 0; i < n; i++) {
    const name = String.fromCharCode(dv.getUint8(o));
    const cols = dv.getUint8(o + 1);
    const count = dv.getUint16(o + 2, true);
    o += 4;
    const rows = new Array(count);
    for (let r = 0; r < count; r++) {
      const row = new Array(cols);
      for (let c = 0; c < cols; c++) { row[c] = dv.getInt16(o, true); o += 2; }
      rows[r] = row;
    }
    tables[name] = rows;
  }
  return { t, tables };
}
