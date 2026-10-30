// Narration script, mirrored from STORY.md ("Haveli Ki Dulhan").
// Each beat is a list of [speaker, text]: 'n' = Sutradhaar (narrator), 'v' = Chandravati (the Chudail Dulhan), 'b' = the bride on the phone.
// {GROOM} and {BRIDE} are filled in by personalize.js. Scene ids are internal names for the painted environments.

export const CHAPTERS = [
  { id: 'prologue', numeral: '', title: 'Shaadi Ka Card', clock: '10:55 PM', scene: 'manor' },
  { id: 'guestbook', numeral: 'I', title: 'Haveli Ka Darwaza', clock: '11:00 PM', scene: 'foyer' },
  { id: 'library', numeral: 'II', title: 'Pothi Khana', clock: '11:12 PM', scene: 'library' },
  { id: 'nursery', numeral: 'III', title: 'Zenana Ka Jhoola', clock: '11:24 PM', scene: 'nursery' },
  { id: 'reception', numeral: 'IV', title: 'Sangeet Ki Daawat', clock: '11:36 PM', scene: 'hall' },
  { id: 'hunt', numeral: 'V', title: 'Solah Shringar Ki Khoj', clock: '11:41 PM', scene: 'hall' },
  { id: 'arena', numeral: 'VI', title: 'Murda Baraat', clock: '11:47 PM', scene: 'garden' },
  { id: 'vow', numeral: 'VII', title: 'Aadhi Raat Ka Mandap', clock: '11:58 PM', scene: 'chapel' },
  { id: 'dawn', numeral: '', title: 'Vidaai at Sunrise', clock: '6:12 AM', scene: 'dawn' },
];

export const BEATS = {
  prologue: [
    ['n', "Tonight was supposed to be simple. {GROOM}'s last night of azaadi. Dost, dhamaal, aur ek sunrise jo kisi ko yaad nahi rehna tha."],
    ['n', 'Then a shaadi ka card arrived. Blood-red. No sender. Sealed with sindoor, in the shape of a broken anguthi.'],
    ['v', 'Aapko saadar aamantrit kiya jaata hai… aapki azaadi ki aakhri raat par.'],
    ['n', 'The car died on the desert highway at 10:52. Headlights flickered… and went out. When the lightning came, it showed you the haveli.'],
    ['n', 'Haveli Kesargarh. In 1925, Rajkumari Chandravati sat in its mandap till midnight. Her baraat never came.'],
    ['n', 'She served the thandai herself. A hundred and eight baraatis never got up from the daawat. And every night before a shaadi… the haveli hungers for a dulha.'],
    ['n', 'The haveli ke darwaze were already open.'],
  ],
  sorting: [
    ['n', 'The register is signed. Ab diye decide karenge… kaun kis team mein jaayega.'],
  ],
  sortingEnd: [
    ['n', 'The diyas have chosen. Aaj raat, your team is your only family. Trust them. Mostly.'],
  ],
  guestbookIntro: [
    ['n', 'The giant doors slam shut behind you. Every diya in the courtyard lights itself. Ek saath.'],
    ['n', 'The register flips to its last page. A hundred and eight baraatis from 1925, in faded ink. And below them… your names. Still wet. In sindoor.'],
    ['v', 'Aa gaye baraati? Sau saal late ho.'],
    ['n', 'A rangoli is drawn on the courtyard floor — but its symbols are scattered across your phones. Murde sirf unse baat karte hain jo saath mein sunte hain.'],
  ],
  seanceHowTo: [
    ['n', 'Each of you holds torn janam-patri pages describing symbols and their order. Only the one holding the diya can tap — and the diya passes after every correct symbol. Describe the symbols out loud. Galat symbol… and the dead wake up.'],
  ],
  guestbookEnd: [
    ['n', 'The rangoli burns into the floor. Somewhere above you, payal start to jingle.'],
    ['n', 'Then every phone in the room rings at once. Video call: {BRIDE}.'],
    ['b', '{GROOM}? Kahaan ho tum? Yahan bahut thand hai… mere haath ki mehendi kisi aur ke naam ki hai… yeh lehenga mera nahi hai—'],
    ['n', 'Call drop. Static. Then laughter… and payal, very far away.'],
    ['n', 'In the ashes of the rangoli lies the first piece of a silver sagai ki anguthi. Something is engraved inside.'],
  ],
  libraryIntro: [
    ['n', 'The payal led you here. The pothi khana. Shelves of cloth-bound manuscripts. One burning diya. On the desk, a diary wrapped in red silk.'],
    ['n', "It is Chandravati's diary. It will not open for strangers — only for those who truly know the dulha."],
    ['v', 'Dekhte hain tumhare dost tumhe kitna jaante hain, {GROOM}… mujhse pehle.'],
  ],
  libraryEnd: [
    ['n', 'The diary falls open. Last entry: 31st October, 1925. 11:59 PM.'],
    ['v', 'Woh nahi aaya. Toh koi nahi jaayega. Thandai maine khud parosi. Sab kitne shaant lag rahe hain.'],
    ['n', 'Between the last pages: the second piece of the anguthi, and a note in a different hand. "Uske baraati abhi bhi daawat mein baithe hain. Bhookhe."'],
  ],
  nurseryIntro: [
    ['n', 'In the zenana, a jhoola is swinging. Nobody is sitting on it. Somewhere, someone is humming a lori.'],
    ['v', 'Mere bhi sapne the. Chalo, ek khel khelte hain. Dekhte hain kaun sabse bahadur hai.'],
    ['n', 'Every guest faces every trial at once — alone, on their own phone. And every result goes up on the wall.'],
  ],
  nurseryEnd: [
    ['n', 'The jhoola stops mid-air. On its seat, on a velvet cushion, lies the third piece of the anguthi.'],
    ['v', 'Bahadur mehmaan. Chalo, daawat pe. Sab intezaar kar rahe hain.'],
  ],
  receptionIntro: [
    ['n', 'The shamiana still stands. Fairy lights flicker. The pattals are still laid out — for a hundred and eight.'],
    ['n', 'The baraatis of 1925 are still in their seats. Shaant. Patient. Jaise murde patient hote hain.'],
    ['n', 'Someone has poured one more glass of thandai. And one of you… has already drunk it.'],
    ['v', 'Tum mein se ek ab mera hai. Woh muskurayega. Madad karega. Aur phir…'],
  ],
  toastIntro: [
    ['v', 'Har sangeet mein speech hoti hai. Utha lo glass… dulhe ke naam.'],
  ],
  glassIntro: [
    ['n', 'Six glasses on the table. One is poisoned — and the fourth piece of the anguthi lies at its bottom. Your team’s clues are split between you. The glass locks only when every member picks the same one.'],
  ],
  unmaskIntro: [
    ['n', 'One of you drank the thandai. One of you has been whispering for Chandravati all along. Ungli uthao.'],
  ],
  receptionEnd: [
    ['n', 'The fourth piece of the anguthi glints at the bottom of the poisoned glass.'],
    ['n', 'The old clock in the corner strikes eleven forty-five.'],
    ['n', 'A hundred and eight chairs scrape back at once. Somewhere, a dhol begins to play… by itself.'],
    ['v', 'Nacho, baraatiyon. Murde akele nahi naachte.'],
    ['n', 'The murda baraat is rising.'],
  ],
  huntIntro: [
    ['n', 'Outside, the dhol grows louder. The dead are still climbing out of the baagh. There is a little time — very little.'],
    ['n', "Then {BRIDE}'s voice comes from every mirror in the haveli at once. Chandravati has scattered her solah shringar through these halls. Without it, no one in the mandap will know which dulhan is real."],
  ],
  huntHowTo: [
    ['n', 'Split up. Every team gets its own trail of treasures. Your phones hold the riddle — and the map on the screen shows where to look. It gets sharper with time.'],
    ['n', 'Reach the glowing spot and a shaadi question appears on your phones. Answer right, and the next riddle unlocks. Answer wrong… and she comes looking for you.'],
    ['n', 'If a shadow drifts towards you, hold up your diya. And whatever you find now will fight beside you in the baagh.'],
  ],
  huntEnd: [
    ['n', 'The searching is over. Whatever the haveli gave back, you carry with you now.'],
    ['n', 'In the baagh, the dhol stops. A hundred and eight heads turn towards the haveli.'],
  ],
  phereIntro: [
    ['n', 'Before the real pheras, seven questions — one for every phera. The team that knows shaadi best will hear one more true whisper.'],
  ],
  arenaIntro: [
    ['n', 'Between you and the mandap: the haveli ka baagh, and a hundred and eight dead baraatis dancing to a dhol nobody is playing. {BRIDE} is in the mandap. Midnight is coming.'],
    ['n', 'Your phones are your weapons now. Move with your thumb — your gun aims itself. Every kill makes you stronger. Uthao jo murde giraayein.'],
    ['n', 'Mandap tak pahuncho. {BRIDE} ko bachao. Aur kaatne mat dena.'],
  ],
  arenaEnd: [
    ['n', 'Kunwar Vikram falls to his knees among the marigolds. For a moment his face is his own again — young, frightened, and very, very sorry.'],
    ['v', 'Vikram…?'],
    ['n', 'He turns to dust. The mandap’s curtains part. It is 11:58.'],
  ],
  vowIntro: [
    ['n', 'The mandap. Marigolds, banana leaves, and the havan kund glowing softly in the dark.'],
    ['n', 'Three dulhans sit in red. All in ghoonghat. All perfectly still. One of them is {BRIDE}. The other two are Chandravati… and her reflection.'],
    ['n', 'But first, the anguthi must be made whole. The haveli ki tijori is sealed with a four-digit lock — and the clues are scattered across all your phones.'],
  ],
  bridesIntro: [
    ['n', 'The anguthi is whole. Ab chuno. Each of you hears a whisper. White whispers come from {BRIDE} — and they are true. Red whispers come from Chandravati… and every single one is a lie.'],
  ],
  lastChance: [
    ['v', 'Galat, galat, GALAT! Mujhe shaadiyan kitni pasand hain.'],
    ['n', 'The false dulhan crumbles into ash. One chance left. Soch samajh ke.'],
  ],
  endingWin: [
    ['n', '{GROOM} lifts the ghoonghat. It is {BRIDE}. Alive. Furious. Laughing.'],
    ['v', 'Nahi… NAHI… woh MERA tha…'],
    ['n', 'The real saat phere begin. With every phera, Chandravati fades. On the seventh, she shatters like a mirror — and a hundred and eight souls rise into the sky.'],
    ['n', 'Midnight strikes… and nothing happens. Kuch bhi nahi. The most beautiful sound in the world.'],
  ],
  endingLose: [
    ['n', '{GROOM} lifts the ghoonghat. Chandravati smiles back with {BRIDE}’s face.'],
    ['v', 'Qubool hai… oh wait, galat shaadi.'],
    ['n', '…and then {BRIDE} kicks the mandap ka darwaza off its hinges. Because that is {BRIDE}. Chandravati picked the wrong family to mess with.'],
    ['n', 'Sunrise comes anyway. It always does.'],
  ],
  vowWriteIntro: [
    ['n', 'One last rasam. A shaadi needs vachan. Every guest writes one of {GROOM}’s wedding vows — the Saat Vachan of the Bachelors.'],
  ],
  epilogue: [
    ['n', 'The sun rises over Kesargarh. It is just an old haveli again. Somewhere far away, a shehnai plays.'],
    ['n', 'You survived the night. Mostly. The register still holds your names.'],
    ['n', 'Milte hain shaadi mein!'],
  ],
};

export const TEAMS = [
  { id: 'A', name: 'Team Kaali Billi', color: '#e0314b', glyph: '🐈‍⬛' },
  { id: 'B', name: 'Team Ullu', color: '#4fb3ff', glyph: '🦉' },
  { id: 'C', name: 'Team Naag', color: '#5fe08a', glyph: '🐍' },
  { id: 'D', name: 'Team Chamgadad', color: '#b07cff', glyph: '🦇' },
];

export const RELICS = {
  guestbook: { id: 'candle', name: 'Akhand Diya', desc: 'Lights burn 35% wider in the murda baraat.' },
  library: { id: 'diary', name: 'The Janam-Patri', desc: 'One extra true whisper at the mandap.' },
  nursery: { id: 'musicbox', name: 'Chandi Ki Payal', desc: 'Start the murda baraat with the Dunali.' },
  reception: { id: 'wine', name: 'Kesar Sharbat', desc: '+50% max health in the murda baraat.' },
};

export const BLESSINGS = {
  candle: { id: 'steady', name: 'Steady Haath', desc: 'Faster fire rate' },
  musicbox: { id: 'lullaby', name: 'Lori', desc: 'Start with a power' },
  banish: { id: 'exorcist', name: 'Ojha', desc: '+30% damage' },
  blink: { id: 'quickdraw', name: 'Cheetah', desc: '+20% move speed' },
  gallery: { id: 'thirdeye', name: 'Teesri Aankh', desc: '+30% range' },
};
