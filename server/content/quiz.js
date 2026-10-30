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

// Shaadi pool — rituals, Rajasthani & Punjabi customs, Bollywood weddings, and shaadi chaos.
// Drawn (without repeats) by Chapter II, the treasure-hunt stations, the Baraat Break and the Phere Quiz.
export const SHAADI = [
  // Rasmein (rituals)
  { q: 'Phere kis cheez ke chaaron taraf liye jaate hain?', a: 'Agni (the sacred fire)', w: ['A banyan tree', 'The mandap pillars', 'The dulha\'s ghodi'] },
  { q: '"Kanyadaan" kaun karta hai?', a: "The bride's parents", w: ["The groom's parents", 'The pandit ji', 'The best friend'] },
  { q: 'Phere ke time dulha-dulhan ke kapde aapas mein baandhne ko kya kehte hain?', a: 'Gathbandhan', w: ['Kalawa', 'Rakhi', 'Mauli-milan'] },
  { q: 'Shaadi ke baad dulhan ki maang mein kya bhara jaata hai?', a: 'Sindoor', w: ['Haldi', 'Chandan', 'Gulal'] },
  { q: 'Saptapadi mein kitne kadam (steps) hote hain?', a: 'Seven', w: ['Five', 'Nine', 'Eleven'] },
  { q: 'Dulhan ki vidaai pe woh peeche ki taraf kya phenkti hai?', a: 'Rice (chawal)', w: ['Flowers', 'Coins', 'Mehendi cones'] },
  { q: 'Sasural mein pehli baar aate hi dulhan kya girati hai (Grih Pravesh)?', a: 'A kalash of rice, with her right foot', w: ['A glass of milk', 'A plate of laddoos', 'Her sandals'] },
  { q: 'Shaadi ke din dulhe ke saath ghodi pe aksar kaun baithta hai?', a: 'A little boy — the sarbala', w: ['The pandit ji', 'Fufaji', 'The DJ'] },
  { q: 'Haldi kyon lagaate hain — traditionally?', a: 'For glow & to ward off evil', w: ['To make the mehendi darker', 'For good luck in cards', 'To keep mosquitoes away'] },
  { q: 'Wedding ke baad ka game jisme doodh-paani ke bartan mein anguthi dhoondhte hain?', a: 'Anguthi dhoondhna (ring-finding game)', w: ['Joota chupai', 'Kaleera drop', 'Antakshari'] },
  { q: 'Mangalsutra traditionally kis rang ke moti se banta hai?', a: 'Black beads with gold', w: ['Red beads', 'White pearls', 'Green glass'] },
  { q: 'Phere ke baad dulha-dulhan aasmaan mein kaunsa taara dekhte hain (tradition)?', a: 'Dhruv tara (Pole star)', w: ['Shukra (Venus)', 'Mangal (Mars)', 'Saptarishi only'] },
  // Punjabi shaadi
  { q: 'Punjabi dulhan ka laal-safed choodiyon ka set kehlata hai…', a: 'Chooda', w: ['Kangan', 'Kada', 'Payal'] },
  { q: 'Kaleere jhatkaate waqt agar kisi ke sir pe gire, toh maana jaata hai…', a: "She'll be the next to marry", w: ['She pays for dinner', 'She must dance', 'Bad luck for a week'] },
  { q: 'Punjabi shaadi mein "Jaggo" kya hai?', a: 'A night procession with a decorated pot of lamps', w: ['A breakfast ritual', 'The haldi ceremony', 'A song for the vidaai'] },
  { q: 'Punjabi dulhe ki ghodi ko feed karne aur sehra baandhne ki rasm kya kehlati hai?', a: 'Sehrabandi', w: ['Ghodi-chadhi only', 'Milni', 'Roka'] },
  { q: 'Anand Karaj (Sikh wedding) mein kitni laavan hoti hain?', a: 'Four', w: ['Seven', 'Three', 'Five'] },
  { q: 'Punjabi shaadi mein "Ghara Gharoli" mein kya hota hai?', a: 'Water is brought from a gurdwara/well to bathe the couple', w: ['Pots are broken for luck', 'The groom carries water to the bride', 'Guests fill pots with money'] },
  { q: 'Doli ke time dulhan ke bhai kya karte hain (Punjabi vidaai)?', a: 'Help carry/escort her doli', w: ['Hide her shoes', 'Sing a ghazal', 'Collect the shagun envelopes'] },
  { q: '"Shagun" lifafe mein amount aksar kis number pe khatam hota hai?', a: 'One (₹101, ₹501, ₹1101…)', w: ['Zero', 'Five', 'Nine'] },
  // Rajasthani shaadi
  { q: 'Rajasthani dulha ki talwar ke saath pehni jaane waali pagdi kehlati hai…', a: 'Safa', w: ['Topi', 'Kalgi', 'Pheta'] },
  { q: 'Rajasthani shaadi mein dulhe ka darwaze pe neem ki daal ya toran ko chhoona kehlata hai…', a: 'Toran ki rasm', w: ['Milni', 'Grih Pravesh', 'Roka'] },
  { q: 'Rajasthani dulhan ki naak ki badi nath ko aur kis naam se jaana jaata hai?', a: 'Nathni / Bhanwariya', w: ['Jhumka', 'Maang tikka', 'Bichhua'] },
  { q: 'Rajasthani dulhan ke maathe ka gol gehna kehlata hai…', a: 'Borla / Rakhdi', w: ['Haathphool', 'Kamarbandh', 'Payal'] },
  { q: 'Rajasthan ka famous tie-dye print jo shaadiyon mein pehna jaata hai?', a: 'Bandhani / Leheriya', w: ['Ikat', 'Kalamkari', 'Chikankari'] },
  { q: 'Rajasthani dulhan ki choodiyan jo haath se upar tak hoti hain, kis material ki hoti thi?', a: 'Ivory/bone (now plastic) — "chooda"', w: ['Gold only', 'Glass only', 'Wood'] },
  // Solah shringar
  { q: 'Solah shringar mein kitni cheezein hoti hain?', a: 'Sixteen', w: ['Seven', 'Twelve', 'Twenty-one'] },
  { q: 'Pairon ki ungliyon mein pehni jaane waali anguthi kehlati hai…', a: 'Bichhiya', w: ['Payal', 'Haathphool', 'Nath'] },
  { q: 'Haath ke peeche anguthiyon se judi chain ko kya kehte hain?', a: 'Haathphool', w: ['Kamarbandh', 'Baajuband', 'Chooda'] },
  { q: 'Baalon mein lagaaya jaane waala phoolon ka gajra aksar kis phool ka hota hai?', a: 'Mogra (jasmine)', w: ['Gulab', 'Genda', 'Kamal'] },
  { q: 'Maathe ke beech latakne waala gehna kya kehlata hai?', a: 'Maang tikka', w: ['Jhoomar', 'Borla', 'Nath'] },
  // Bollywood shaadi
  { q: '"London Thumakda" kis film ka gaana hai?', a: 'Queen', w: ['Band Baaja Baaraat', 'Bride & Prejudice', 'Veere Di Wedding'] },
  { q: '"Mehendi Laga Ke Rakhna" kis film ka hai?', a: 'Dilwale Dulhania Le Jayenge', w: ['Hum Aapke Hain Koun..!', 'Kuch Kuch Hota Hai', 'Mohabbatein'] },
  { q: '"Hum Aapke Hain Koun..!" mein joota chupai pe kaunsa gaana hai?', a: 'Joote Do Paise Lo', w: ['Didi Tera Devar Deewana', 'Wah Wah Ramji', 'Lo Chali Main'] },
  { q: 'Wedding planners ki kahani — Anushka & Ranveer ki film?', a: 'Band Baaja Baaraat', w: ['Ladies vs Ricky Bahl', 'Befikre', 'Dil Dhadakne Do'] },
  { q: '"Monsoon Wedding" kis sheher mein set hai?', a: 'Delhi', w: ['Mumbai', 'Jaipur', 'Amritsar'] },
  { q: '"Gallan Goodiyaan" kis film mein hai?', a: 'Dil Dhadakne Do', w: ['Kapoor & Sons', 'Baar Baar Dekho', 'Jab Harry Met Sejal'] },
  { q: '"Navrai Majhi" gaana kis film ka hai?', a: 'English Vinglish', w: ['Queen', 'Piku', 'Dear Zindagi'] },
  { q: '"Tenu Leke Main Jawanga" kis film ka gaana hai?', a: 'Salaam-e-Ishq', w: ['Namastey London', 'Singh Is Kinng', 'Jab We Met'] },
  { q: '"Kajra Re" mein kaun kaun naache?', a: 'Aishwarya, Abhishek & Amitabh Bachchan', w: ['Kareena, Saif & Shahid', 'Madhuri, SRK & Salman', 'Katrina, Akshay & Hrithik'] },
  // Shaadi chaos (fun)
  { q: 'Shaadi mein sabse common "naraazgi" kiski hoti hai (internet ke hisaab se)?', a: 'Fufaji', w: ['The DJ', 'The photographer', 'The ghodi'] },
  { q: 'Baraat ke time sabse common gaana kaunsa bajta hai?', a: '"Aaj Mere Yaar Ki Shaadi Hai"', w: ['"Tujhe Dekha To"', '"Kal Ho Naa Ho"', '"Channa Mereya"'] },
  { q: 'Joota chupai mein saaliyan aksar kya maangti hain?', a: 'Cash (negotiated loudly)', w: ['A song', 'A new phone', 'The groom\'s safa'] },
  { q: 'Wedding buffet mein sabse pehle kya khatam hota hai (universal law)?', a: 'Paneer', w: ['Salad', 'Plain rice', 'Water'] },
  { q: 'Shaadi ka "Roka" kya hota hai?', a: 'The families formally fix the match', w: ['The final vidaai', 'A dance-off', 'The pre-wedding shoot'] },
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
