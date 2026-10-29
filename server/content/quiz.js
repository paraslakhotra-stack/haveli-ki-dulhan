// Library quiz content. Trivia items: { q, a: correct, w: [3 wrong] }.
// Answer order is shuffled at runtime, so the correct answer is always written first here.

export const TRIVIA = [
  { q: 'In "The Shining", what number is the room Danny is told never to enter?', a: '237', w: ['217', '1408', '666'] },
  { q: 'What is the name of the haunted doll in "The Conjuring" universe?', a: 'Annabelle', w: ['Chucky', 'Robert', 'Brahms'] },
  { q: 'Which classic monster was created by Mary Shelley?', a: "Frankenstein's creature", w: ['Dracula', 'The Mummy', 'The Wolf Man'] },
  { q: 'In "Ghostbusters", who are you gonna call?', a: 'Ghostbusters', w: ['The priest', 'Your mum', 'The landlord'] },
  { q: 'What do you traditionally need to kill a vampire?', a: 'A wooden stake', w: ['A silver spoon', 'Holy cake', 'A garlic naan'] },
  { q: 'In "A Nightmare on Elm Street", where does Freddy attack his victims?', a: 'In their dreams', w: ['In the shower', 'At summer camp', 'In a well'] },
  { q: 'Which of these is a fear of marriage?', a: 'Gamophobia', w: ['Nyctophobia', 'Arachnophobia', 'Trypophobia'] },
  { q: 'In "The Ring", how many days do you have after watching the tape?', a: 'Seven', w: ['Three', 'Thirteen', 'One'] },
  { q: 'What colour is the dress of the ghost bride in most Victorian legends?', a: 'White', w: ['Red', 'Black', 'Green'] },
  { q: 'In "Shaun of the Dead", where do they wait for it all to blow over?', a: 'The Winchester pub', w: ['A cinema', 'A church', 'A supermarket'] },
  { q: 'Which zombie show begins with a sheriff waking up from a coma?', a: 'The Walking Dead', w: ['Kingdom', 'Black Summer', 'All of Us Are Dead'] },
  { q: 'What is the traditional gift for a 1st wedding anniversary?', a: 'Paper', w: ['Gold', 'Silk', 'Tin'] },
  { q: 'Which famous fictional count lives in Transylvania?', a: 'Dracula', w: ['Monte Cristo', 'Orlok of Delhi', 'Chocula'] },
  { q: 'In "Bhool Bhulaiyaa", what is the name of the spirit?', a: 'Manjulika', w: ['Chandramukhi', 'Stree', 'Pari'] },
  { q: 'In the Bollywood horror-comedy "Stree", what is written on the walls to keep her away?', a: 'O Stree, kal aana', w: ['Ghar mat aana', 'Ram Ram', 'No entry'] },
  { q: 'Which bird is traditionally an omen of death in folklore?', a: 'The raven', w: ['The parrot', 'The flamingo', 'The pigeon'] },
  { q: 'How many ghosts visit Scrooge in "A Christmas Carol" (not counting Marley)?', a: 'Three', w: ['Two', 'Four', 'Seven'] },
  { q: 'Which instrument plays the famous "Psycho" shower scene screech?', a: 'Violins (strings)', w: ['Trumpets', 'Organ', 'Synthesizer'] },
  { q: 'In "Get Out", what household object triggers the hypnosis?', a: 'A teacup and spoon', w: ['A doorbell', 'A clock', 'A record player'] },
  { q: 'Which of these is NOT a real superstition about weddings?', a: 'The groom must wear socks inside out', w: ['Rain on the day is good luck', 'Groom shouldn\'t see the bride before', 'Something borrowed, something blue'] },
  { q: 'In "Train to Busan", the zombie outbreak happens on a train to which city?', a: 'Busan', w: ['Seoul', 'Tokyo', 'Daegu'] },
  { q: 'What is a group of crows called?', a: 'A murder', w: ['A funeral', 'A haunt', 'A coven'] },
  { q: 'In "It", what does Pennywise use to lure kids?', a: 'A red balloon', w: ['Ice cream', 'A puppy', 'A paper boat'] },
  { q: 'What is the fear of the number 13 called?', a: 'Triskaidekaphobia', w: ['Hexakosioihexekontahexaphobia', 'Numerophobia', 'Decaphobia'] },
  { q: 'Which planet would a werewolf on Earth fear the most?', a: 'Trick question — the Moon is not a planet', w: ['Mars', 'Venus', 'Saturn'] },
  { q: 'In "The Sixth Sense", what does the boy famously say?', a: 'I see dead people', w: ['I hear dead people', 'They are here', 'Here\'s Johnny'] },
  { q: 'In "Tumbbad", what does the family greedily search for?', a: 'Gold', w: ['A ring', 'A diary', 'Grain'] },
];

// "Who among you…" — everyone votes for a guest. Majority voters score.
export const ACCUSE = {
  mild: [
    'Who among you would be the first to die in a horror movie?',
    'Who would hide in the cupboard and survive the whole night?',
    'Who would try to make friends with the ghost?',
    'Who is most likely to cry at the wedding before {GROOM} does?',
    'Who would get lost on the way to the wedding venue?',
    'Who would read the cursed book out loud "just to see"?',
    'Who would be possessed and nobody would notice the difference?',
    'Who would sell out the whole group to escape?',
    'Who will be the last one on the dance floor at the wedding?',
    'Who would survive a zombie apocalypse on snacks alone?',
  ],
  spicy: [
    'Who has the most chaotic search history in this room?',
    'Who would sacrifice {GROOM} to the ghost to save themselves?',
    'Who is most likely to give an embarrassing wedding speech?',
    'Who here has the worst taste in movies?',
    'Who would scream the loudest at a jump scare?',
    'Who would still be replying to work emails during a zombie apocalypse?',
    'Who is secretly the most competitive person here?',
    'Who would blame everyone else after losing this game?',
    'Who is most likely to fake being possessed to get out of a meeting?',
    'Who would steal the best snacks before the zombies arrive?',
  ],
};

// Prefilled suggestions for the host's groom quiz (host types the answers).
export const GROOM_QUESTION_SUGGESTIONS = [
  'Where did {GROOM} and {BRIDE} first meet?',
  "What is {GROOM}'s most-ordered food?",
  "What is {GROOM}'s hidden talent?",
  'Who said "I love you" first?',
  "What is {GROOM}'s biggest fear?",
  "What was {GROOM}'s first job?",
  "What is {GROOM}'s go-to karaoke song?",
  'What will {GROOM} most likely forget on the wedding day?',
];
