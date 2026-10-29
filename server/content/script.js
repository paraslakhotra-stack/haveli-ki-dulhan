// Narration script, mirrored from STORY.md.
// Each beat is a list of [speaker, text]: 'n' = Narrator, 'v' = Vesper, 'b' = the bride on the phone.
// {GROOM} and {BRIDE} are filled in by personalize.js.

export const CHAPTERS = [
  { id: 'prologue', numeral: '', title: 'The Invitation', clock: '10:55 PM', scene: 'manor' },
  { id: 'guestbook', numeral: 'I', title: 'The Guest Book', clock: '11:00 PM', scene: 'foyer' },
  { id: 'library', numeral: 'II', title: 'The Library of Whispers', clock: '11:12 PM', scene: 'library' },
  { id: 'nursery', numeral: 'III', title: 'The Nursery', clock: '11:24 PM', scene: 'nursery' },
  { id: 'reception', numeral: 'IV', title: 'The Reception Hall', clock: '11:36 PM', scene: 'hall' },
  { id: 'arena', numeral: 'V', title: "The Dead Don't Dance", clock: '11:45 PM', scene: 'garden' },
  { id: 'vow', numeral: 'VI', title: 'The Midnight Vow', clock: '11:58 PM', scene: 'chapel' },
  { id: 'dawn', numeral: '', title: 'Dawn', clock: '6:12 AM', scene: 'dawn' },
];

export const BEATS = {
  prologue: [
    ['n', 'Tonight was supposed to be simple. One last night of freedom for {GROOM}. Good friends, bad decisions, and a sunrise nobody would remember.'],
    ['n', 'Then a black envelope arrived. No stamp. No return address. Just a wax seal shaped like a broken ring.'],
    ['v', 'You are cordially invited… to your last night of freedom.'],
    ['n', 'The car died on the hill road at 10:52. The headlights flickered, then went out. When the lightning came, it showed you the house.'],
    ['n', 'Blackthorn Manor. In 1925, Lady Vesper Blackthorn waited at its altar until midnight. Her groom never came.'],
    ['n', 'She poured the wedding wine herself. Ninety-one guests never left the reception. And every night before a wedding… the manor wakes hungry for a groom.'],
    ['n', 'The front door was already open.'],
  ],
  sorting: [
    ['n', 'The guest book is signed. Now the candles will choose your covens.'],
  ],
  sortingEnd: [
    ['n', 'The candles have chosen. From here on, your coven is your only family. Trust them. Mostly.'],
  ],
  guestbookIntro: [
    ['n', 'The doors slam behind you. Every candle in the foyer lights at once.'],
    ['n', 'The guest book flips to its last page. Ninety-one names from 1925, in faded ink. And below them, still wet… your names. Written in blood.'],
    ['v', 'Welcome, my darling guests. You are late. The wedding was supposed to start a hundred years ago.'],
    ['n', 'A séance circle is carved into the floor. Its runes are scattered across your phones. The dead only speak to those who listen… together.'],
  ],
  seanceHowTo: [
    ['n', 'Each of you holds torn diary pages describing runes and their order. Only the one holding the ritual candle may tap — and the candle passes after every correct rune. Describe the runes out loud. A wrong rune wakes the dead.'],
  ],
  guestbookEnd: [
    ['n', 'The sigil burns into the floor. Somewhere above you, a music box begins to play.'],
    ['n', 'Then every phone in the room buzzes at once. Caller: {BRIDE}.'],
    ['b', '{GROOM}? {GROOM}, where are you? It\'s so cold here… there\'s a woman in my mirror and she\'s wearing my face… why am I wearing HER DRESS—'],
    ['n', 'The line goes dead. Static. Then laughter, very far away.'],
    ['n', 'In the ashes of the sigil lies Ring Piece I — a quarter of a silver wedding band, with something engraved inside.'],
  ],
  libraryIntro: [
    ['n', 'The music box led you here. Forty thousand books. One lit candle. On the reading desk, a diary bound in white lace.'],
    ['n', 'It is Vesper\'s. It will not open for strangers — only for those who truly know the groom.'],
    ['v', 'Let me see if your friends really love you, {GROOM}. Let me see how well they know you… before I do.'],
  ],
  libraryEnd: [
    ['n', 'The diary falls open. The last entry is dated October 31st, 1925. 11:59 PM.'],
    ['v', 'He isn\'t coming. So no one leaves. I poured the wine myself. To love that lasts forever. They look so peaceful at the tables.'],
    ['n', 'Pressed between the final pages: Ring Piece II, and a note in a different hand. "She keeps her best guests in the reception hall. They are still hungry."'],
  ],
  nurseryIntro: [
    ['n', 'The lullaby grows louder. The nursery door opens by itself. Inside, a rocking horse is still rocking.'],
    ['v', 'I wanted children, you know. I had names picked out. Let\'s play a game. Let\'s see which of you is brave enough to stay.'],
    ['n', 'Every guest faces every trial at once, alone, on their own phone. And every result goes on the wall.'],
  ],
  nurseryEnd: [
    ['n', 'The music box stops mid-note. Inside, on a velvet cushion, lies Ring Piece III.'],
    ['v', 'Brave little guests. Come down to dinner. Everyone is waiting.'],
  ],
  receptionIntro: [
    ['n', 'The reception hall. A banquet set for ninety-one. The cake has collapsed into grey lace. The roses are black.'],
    ['n', 'The guests from 1925 are still in their seats. Slumped. Patient. The way the dead are patient.'],
    ['n', 'Someone has poured one more glass of wine. And one of you… already drank from it.'],
    ['v', 'One of you belongs to me now. They will smile at you. They will help you. And then…'],
  ],
  toastIntro: [
    ['v', 'Every reception needs speeches. Raise a glass… to the groom.'],
  ],
  glassIntro: [
    ['n', 'Six glasses on the table. One is poisoned — and Ring Piece IV lies at the bottom of it. Your coven\'s clues are split between you. The glass locks only when every member chooses the same one.'],
  ],
  unmaskIntro: [
    ['n', 'One of you drank the wine. One of you has been whispering for Vesper all along. Point at them.'],
  ],
  receptionEnd: [
    ['n', 'Ring Piece IV glints at the bottom of the poisoned glass.'],
    ['n', 'The grandfather clock in the corner strikes eleven forty-five.'],
    ['n', 'Ninety-one chairs scrape back at once.'],
    ['v', 'Dance with them, darlings. The dead don\'t dance alone.'],
    ['n', 'The wedding guests are rising.'],
  ],
  arenaIntro: [
    ['n', 'Between you and the chapel: the rose garden, and ninety-one dead wedding guests. {BRIDE} is at the altar. Midnight is coming.'],
    ['n', 'Your phones are your weapons now. Move with your thumb — your gun aims itself. Every kill makes you stronger. Grab what the dead drop.'],
    ['n', 'Get to the chapel. Save {BRIDE}. Don\'t let them bite.'],
  ],
  arenaEnd: [
    ['n', 'Edmund falls to his knees among the roses. For a moment his face is his own again — young, frightened, and very, very sorry.'],
    ['v', 'Edmund…?'],
    ['n', 'He turns to dust. The chapel doors swing open. It is 11:58.'],
  ],
  vowIntro: [
    ['n', 'The chapel. Candles, roses, and a stained-glass window bleeding moonlight.'],
    ['n', 'At the altar stand three brides. Veiled. Perfectly still. One of them is {BRIDE}. The other two are Vesper and her reflection.'],
    ['n', 'But first, the ring must be reforged. The crypt beneath the altar is sealed with a four-digit lock — and the clues are scattered across all of your phones.'],
  ],
  bridesIntro: [
    ['n', 'The ring is whole. Now choose. Each of you hears a whisper. White whispers come from {BRIDE} — and they are true. Red whispers come from Vesper… and every one of them is a lie.'],
  ],
  lastChance: [
    ['v', 'Wrong, wrong, WRONG. Oh, I do love a wedding.'],
    ['n', 'The false bride crumbles into ash. One chance left. Choose carefully.'],
  ],
  endingWin: [
    ['n', '{GROOM} lifts the veil. It is {BRIDE}. Warm. Alive. Furious. Laughing.'],
    ['v', 'No… NO… he was MINE…'],
    ['n', 'Vesper shatters like a dropped mirror. Ninety-one sighs rise into the rafters and are gone.'],
    ['n', 'The bell strikes midnight… and nothing happens. Nothing at all. It is the most beautiful sound in the world.'],
  ],
  endingLose: [
    ['n', '{GROOM} lifts the veil. Vesper smiles with {BRIDE}\'s face.'],
    ['v', 'I do.'],
    ['n', '…and then {BRIDE} kicks the chapel door off its hinges, because of course she does. Vesper picked the wrong family to mess with.'],
    ['n', 'Dawn comes anyway. It always does.'],
  ],
  vowWriteIntro: [
    ['n', 'One last thing. A wedding needs vows. Every guest writes one line of {GROOM}\'s vow.'],
  ],
  epilogue: [
    ['n', 'The sun comes up over Blackthorn Manor. It is just a house again. Old. Empty. A little embarrassed.'],
    ['n', 'You survived the night. Mostly. The guest book still has your names in it.'],
    ['n', 'See you at the wedding.'],
  ],
};

export const TEAMS = [
  { id: 'A', name: 'The Ravens', color: '#e0314b', glyph: '🜂' },
  { id: 'B', name: 'The Wolves', color: '#4fb3ff', glyph: '🜄' },
  { id: 'C', name: 'The Serpents', color: '#5fe08a', glyph: '🜃' },
];

export const RELICS = {
  guestbook: { id: 'candle', name: "Vesper's Candle", desc: 'Flashlights burn 35% wider in the zombie fight.' },
  library: { id: 'diary', name: 'The Lace Diary', desc: 'One extra true whisper in the finale.' },
  nursery: { id: 'musicbox', name: 'The Music Box', desc: 'Start the zombie fight with the Shotgun.' },
  reception: { id: 'wine', name: 'Holy Wine', desc: '+50% max health in the zombie fight.' },
};

export const BLESSINGS = {
  candle: { id: 'steady', name: 'Steady Hands', desc: 'Faster fire rate' },
  musicbox: { id: 'lullaby', name: 'Lullaby', desc: 'Start with a power' },
  banish: { id: 'exorcist', name: 'Exorcist', desc: '+30% damage' },
  blink: { id: 'quickdraw', name: 'Quick Draw', desc: '+20% move speed' },
  gallery: { id: 'thirdeye', name: 'Third Eye', desc: '+30% range' },
};
