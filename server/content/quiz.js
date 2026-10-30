// Pothi Khana quiz content. Trivia items: { q, a: correct, w: [3 wrong] } — order is shuffled at runtime.

export const TRIVIA = [
  // Shaadi trivia
  { q: 'Hindu shaadi mein kitne phere hote hain?', a: 'Saat (7)', w: ['Paanch (5)', 'Nau (9)', 'Gyaarah (11)'] },
  { q: 'Joota chupai mein dulhe ke joote kaun chhupata hai?', a: "The bride's sisters & cousins (saaliyan)", w: ["The groom's mother", 'The pandit ji', 'Fufaji'] },
  { q: 'Punjabi shaadi mein dulhan ke chooda se kya latkaya jaata hai?', a: 'Kaleere', w: ['Ghungroo', 'Nimbu-mirchi', 'Taveez'] },
  { q: 'Haldi ceremony mein kya lagaya jaata hai?', a: 'Turmeric paste', w: ['Sandalwood only', 'Multani mitti', 'Mehendi'] },
  { q: 'Varmala ceremony mein kya exchange hota hai?', a: 'Flower garlands', w: ['Rings', 'Sweets', 'Shoes'] },
  { q: 'Rajasthani dulha traditionally kis par baraat mein aata hai?', a: 'A ghodi (mare)', w: ['An elephant', 'A camel', 'A tractor'] },
  { q: 'Which ceremony is all about singing and dancing the night before?', a: 'Sangeet', w: ['Tilak', 'Roka', 'Grih Pravesh'] },
  { q: '"Milni" in a Punjabi wedding is when…', a: 'Both families hug & greet each other', w: ['The couple first meets', 'Sweets are exchanged with neighbours', 'The groom gets his sehra'] },
  { q: 'Dulhe ke chehre pe latakne waali phoolon ki ladi ko kya kehte hain?', a: 'Sehra', w: ['Toran', 'Kalgi', 'Pagdi'] },
  { q: 'Mehendi mein dulhan ke haath mein aksar kya chhupaya jaata hai?', a: "The groom's name", w: ['A lucky number', 'A rangoli', 'The wedding date'] },
  // Bollywood horror
  { q: '"Stree" mein deewaron par kya likha hota hai?', a: 'O Stree, kal aana', w: ['Ghar mat aana', 'Ram Ram', 'No entry'] },
  { q: '"Bhool Bhulaiyaa" mein aatma ka naam kya hai?', a: 'Manjulika', w: ['Chandramukhi', 'Stree', 'Bulbbul'] },
  { q: '"Tumbbad" mein family kya dhoondhti hai?', a: 'Gold coins (Hastar\'s treasure)', w: ['A diary', 'A ring', 'A map'] },
  { q: 'Which film features a woman whose feet point backwards — a chudail in a haveli?', a: 'Bulbbul', w: ['Dil Chahta Hai', 'Queen', 'Jab We Met'] },
  { q: '"Ami Je Tomar" song kis film ka hai?', a: 'Bhool Bhulaiyaa', w: ['Stree', 'Raaz', 'Bhoot'] },
  { q: '"Raaz" (2002) mein haunted ghar kahaan hai?', a: 'Ooty', w: ['Shimla', 'Goa', 'Darjeeling'] },
  { q: 'In "Stree 2", which village is terrorised again?', a: 'Chanderi', w: ['Kesargarh', 'Rampur', 'Tumbbad'] },
  // Folklore & spooky
  { q: 'Indian folklore ke hisaab se chudail ko kaise pehchaanein?', a: 'Her feet point backwards', w: ['She has three eyes', 'She has no shadow at noon', 'She wears blue'] },
  { q: 'Nazar se bachne ke liye darwaze par kya latkaate hain?', a: 'Nimbu-mirchi', w: ['Ghungroo', 'Garlic & onion', 'A mirror'] },
  { q: 'Bhangarh Fort, "most haunted place in India", kis state mein hai?', a: 'Rajasthan', w: ['Punjab', 'Madhya Pradesh', 'Gujarat'] },
  { q: 'Which bird is considered an omen in Indian folklore?', a: 'Ullu (owl)', w: ['Mor (peacock)', 'Tota (parrot)', 'Kabootar (pigeon)'] },
  { q: 'Raat ko kaali billi rasta kaate toh log kya karte hain (superstition)?', a: 'Wait for someone else to cross first', w: ['Clap thrice', 'Run across', 'Sing a song'] },
  { q: 'Which of these is NOT a real Indian wedding superstition?', a: "The groom must wear socks inside out", w: ['Rain on the wedding day is lucky', 'Haldi ke baad ghar se bahar mat jao', 'Dulhan ka pehla kadam right foot'] },
  { q: 'A "pishach" in Indian folklore is…', a: 'A flesh-eating demon', w: ['A wedding cook', 'A type of sweet', 'A dance form'] },
  { q: 'What is a group of crows called?', a: 'A murder', w: ['A funeral', 'A haunt', 'A coven'] },
  { q: 'Bollywood horror mein "Ramsay Brothers" kis cheez ke liye famous the?', a: 'Low-budget horror films', w: ['Romantic songs', 'Action movies', 'Comedy shows'] },
];

// "Kaun hai jo…" — everyone votes for a guest. Majority voters score.
export const ACCUSE = {
  mild: [
    'Kaun hai jo horror movie mein sabse pehle marega?',
    'Kaun hai jo bhoot se dosti karne ki koshish karega?',
    'Kaun hai jo {GROOM} se pehle shaadi mein ro dega?',
    'Kaun hai jo venue ka rasta bhool jaayega?',
    'Kaun hai jo baraat mein sabse lamba naachega?',
    'Kaun hai jo cursed diary zor se padh dega, "bas dekhne ke liye"?',
    'Kaun hai jo possess ho jaaye toh kisi ko farak hi na pade?',
    'Kaun hai jo bachne ke liye poori team ko bech dega?',
    'Kaun hai jo shaadi ke khaane mein sabse pehle line mein hoga?',
    'Kaun hai jo zombie apocalypse sirf snacks ke sahare survive karega?',
  ],
  spicy: [
    'Kaun hai jiski search history sabse chaotic hai?',
    'Kaun hai jo khud ko bachaane ke liye {GROOM} ko chudail ke hawaale kar dega?',
    'Kaun hai jo sabse embarrassing shaadi speech dega?',
    'Kaun hai jo jump scare pe sabse zor se cheekhega?',
    'Kaun hai jo zombie apocalypse mein bhi office ke emails reply karega?',
    'Kaun hai jo game haarne pe sabko blame karega?',
    'Kaun hai jo meeting skip karne ke liye possessed hone ka natak karega?',
    'Kaun hai jo baraat mein "naagin dance" sabse pehle shuru karega?',
    'Kaun hai jo shaadi mein Fufaji se bhi zyada naraz ho jaayega?',
    'Kaun hai jo joota chupai mein dulhe se sabse zyada paise nikalwayega?',
  ],
};

// Prefilled suggestions for the host's groom quiz (the host types the answers).
export const GROOM_QUESTION_SUGGESTIONS = [
  '{GROOM} aur {BRIDE} pehli baar kahaan mile the?',
  "{GROOM} ka sabse favourite khaana kya hai?",
  "{GROOM} ka hidden talent kya hai?",
  'Pehle "I love you" kisne bola tha?',
  '{GROOM} ko sabse zyada darr kis cheez se lagta hai?',
  "{GROOM} ki pehli job kya thi?",
  "{GROOM} ka go-to karaoke / dance gaana kaunsa hai?",
  'Shaadi ke din {GROOM} sabse pehle kya bhoolega?',
];
