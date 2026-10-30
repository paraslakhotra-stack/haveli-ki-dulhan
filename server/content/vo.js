// Voice-over cast and the text each recorded line speaks.
// Pre-recorded clips can't know tonight's names, so lines that mention the groom or bride are recorded
// with a generic stand-in; the live ElevenLabs path (ELEVENLABS_API_KEY) speaks the real names instead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ElevenLabs premade voices. Override per deploy with VO_NARRATOR / VO_GHOST / VO_BRIDE.
export const VOICES = {
  n: { name: 'Brian', id: process.env.VO_NARRATOR || 'nPczCjzI2devNBz1zQrb' }, // deep, resonant male narrator
  v: { name: 'Lily', id: process.env.VO_GHOST || 'pFZP5JQG7iQjIQuC4Bku' }, //     Rani Chandravati
  b: { name: 'Sarah', id: process.env.VO_BRIDE || 'EXAVITQu4vr4xnSDxMaL' }, //    the bride's broken call
};

const GENERIC = {
  'prologue.0': "Tonight was supposed to be simple. Dulhe raja's last night of azaadi. Dost, dhamaal, aur ek sunrise jo kisi ko yaad nahi rehna tha.",
  'arenaIntro.2': 'Mandap tak pahuncho. Dulhan ko bachao. Aur kaatne mat dena.',
  'guestbookEnd.1': 'Then every phone in the room rings at once. Video call… from the dulhan.',
  'guestbookEnd.2': 'Suno? Kahaan ho tum? Yahan bahut thand hai… mere haath ki mehendi kisi aur ke naam ki hai… yeh lehenga mera nahi hai—',
  'arenaIntro.0': 'Between you and the mandap: the haveli ka baagh, and a hundred and eight dead baraatis dancing to a dhol nobody is playing. The dulhan is in the mandap. Midnight is coming.',
  'vowIntro.1': 'Three dulhans sit in red. All in ghoonghat. All perfectly still. One of them is the real dulhan. The other two are Chandravati… and her reflection.',
  'bridesIntro.0': 'The anguthi is whole. Ab chuno. Each of you hears a whisper. White whispers come from the real dulhan — and they are true. Red whispers come from Chandravati… and every single one is a lie.',
  'endingWin.0': 'The dulha lifts the ghoonghat. It is his dulhan. Alive. Furious. Laughing.',
  'endingLose.0': "The dulha lifts the ghoonghat. Chandravati smiles back with the dulhan's face.",
  'endingLose.2': '…and then the real dulhan kicks the mandap ka darwaza off its hinges. Because that is our dulhan. Chandravati picked the wrong family to mess with.',
  'vowWriteIntro.0': "One last rasam. A shaadi needs vachan. Every guest writes one of the dulha's wedding vows — the Saat Vachan of the Bachelors.",
};

export function voText(key, text) {
  return GENERIC[key] || text.replace(/\{GROOM\}/g, 'dulhe raja').replace(/\{BRIDE\}/g, 'dulhan');
}

// Clip durations, so captions and story timers wait for the real audio.
let manifest = {};
try {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'vo', 'manifest.json');
  manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch { /* no recorded voice-over: timing falls back to text length */ }
export const VO = manifest;
