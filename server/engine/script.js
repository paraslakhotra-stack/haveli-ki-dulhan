// Builds the night's running order from the story (see STORY.md). Each entry is { kind, params }.
import { groomQuestions } from './personalize.js';
import { makeCrypt } from './puzzles.js';

export function buildScript(g) {
  const S = [];
  const story = (beat, scene, extra = {}) => S.push({ kind: 'story', params: { beat, scene, ...extra } });
  const title = (chapter) => S.push({ kind: 'chapterTitle', params: { chapter } });
  const end = (chapter, withForfeit = true) => {
    S.push({ kind: 'chapterEnd', params: { chapter } });
    if (withForfeit) S.push({ kind: 'forfeit', params: { chapter } });
  };

  g.secrets.crypt = makeCrypt(g.rng);
  g.secrets.groomQs = groomQuestions(g.settings, g.rng).slice(0, 5);

  // PROLOGUE — The Invitation
  title('prologue');
  story('prologue', 'manor');
  story('sorting', 'manor');
  S.push({ kind: 'sorting', params: {} });
  story('sortingEnd', 'manor');

  // I — The Guest Book
  title('guestbook');
  story('guestbookIntro', 'foyer');
  story('seanceHowTo', 'foyer');
  S.push({ kind: 'seance', params: { round: 1, length: 4 } });
  S.push({ kind: 'seance', params: { round: 2, length: 5 } });
  story('guestbookEnd', 'foyer', { fx: 'call' });
  end('guestbook');

  // II — The Library of Whispers
  title('library');
  story('libraryIntro', 'library');
  const groomCount = g.secrets.groomQs.length;
  const qs = [];
  if (groomCount) for (let i = 0; i < groomCount; i++) qs.push({ qtype: 'groom', idx: i, round: 'The Diary Asks' });
  else for (let i = 0; i < 2; i++) qs.push({ qtype: 'accuse', round: 'The Diary Asks' });
  for (let i = 0; i < 4; i++) qs.push({ qtype: 'trivia', round: 'Whispers in the Stacks' });
  for (let i = 0; i < 3; i++) qs.push({ qtype: 'accuse', round: 'The Accused' });
  qs.forEach((q, i) => S.push({ kind: 'quiz', params: { ...q, n: i + 1, total: qs.length } }));
  story('libraryEnd', 'library');
  end('library');

  // III — The Nursery
  title('nursery');
  story('nurseryIntro', 'nursery');
  const trials = ['candle', 'musicbox', 'banish', 'blink', 'gallery'];
  trials.forEach((t, i) => S.push({ kind: 'trial', params: { trial: t, n: i + 1, total: trials.length } }));
  story('nurseryEnd', 'nursery');
  end('nursery');

  // IV — The Reception Hall
  title('reception');
  story('receptionIntro', 'hall');
  S.push({ kind: 'possess', params: {} });
  story('toastIntro', 'hall');
  S.push({ kind: 'toast', params: { round: 1 } });
  S.push({ kind: 'toast', params: { round: 2 } });
  story('glassIntro', 'hall');
  S.push({ kind: 'glass', params: {} });
  story('unmaskIntro', 'hall');
  S.push({ kind: 'unmask', params: {} });
  story('receptionEnd', 'hall', { fx: 'rise' });
  end('reception');

  // V — The Dead Don't Dance
  title('arena');
  story('arenaIntro', 'garden');
  S.push({ kind: 'arena', params: {} });
  story('arenaEnd', 'garden');
  end('arena', false);

  // VI — The Midnight Vow
  title('vow');
  story('vowIntro', 'chapel');
  S.push({ kind: 'crypt', params: {} });
  story('bridesIntro', 'chapel');
  S.push({ kind: 'brides', params: {} });
  story('@ending', 'chapel');
  story('vowWriteIntro', 'chapel');
  S.push({ kind: 'vowWrite', params: {} });

  // EPILOGUE — Dawn
  title('dawn');
  story('epilogue', 'dawn');
  S.push({ kind: 'credits', params: {} });
  return S;
}
