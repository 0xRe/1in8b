import type { Life } from '../game/types';
import type { Locale, translator } from './i18n';
import { countryName } from '../game/countries';

export type WishAxis = 'pw' | 'rf' | 'cv' | 'tm';
export type WishPole = 'p' | 'w' | 'r' | 'f' | 'c' | 'v' | 't' | 'm';

export interface WishMoment {
  pole: WishPole;
  lifeId?: string;
  name?: string;
  flag?: string;
  age?: number;
  country?: string;
  text: string;
}

export interface WishQuestion {
  axis: WishAxis;
  options: [WishMoment, WishMoment];
}

export interface WishResult {
  code: string; // 4-letter code, e.g. 'prct'
  percentages: Record<WishAxis, { poleA: WishPole; pctA: number; poleB: WishPole; pctB: number }>;
  counts: Record<WishPole, number>;
  matchedLives: Partial<Record<WishPole, Life>>;
}

export const WISH_AXES: WishAxis[] = ['pw', 'rf', 'cv', 'tm'];

export const WISH_ARCHETYPES: Record<string, { en: string; ko: string; zh: string; zhHans: string; ja: string; fr: string; de: string; es: string }> = {
  prct: {
    en: 'The Veranda Neighbor',
    ko: '툇마루의 이웃',
    zh: '邻里廊下的温情守候',
    zhHans: '邻里廊下的温情守候',
    ja: '縁側の隣人',
    fr: 'Le voisin bienveillant',
    de: 'Der nachbarschaftliche Hüter',
    es: 'El vecino entrañable',
  },
  prcm: {
    en: 'The Deep-Rooted Tree',
    ko: '뿌리 깊은 나무',
    zh: '根深叶茂的守护者',
    zhHans: '根深叶茂的守护者',
    ja: '深く根を張る大樹',
    fr: "L'arbre aux racines profondes",
    de: 'Der tief verwurzelte Baum',
    es: 'El árbol de raíces profundas',
  },
  prvt: {
    en: 'The Feast Host',
    ko: '잔치를 여는 사람',
    zh: '欢聚盛宴的热情主人',
    zhHans: '欢聚盛宴的热情主人',
    ja: '宴を開くもてなし人',
    fr: 'L’hôte des grands banquets',
    de: 'Der festliche Gastgeber',
    es: 'El anfitrión de celebraciones',
  },
  prvm: {
    en: 'The Village Builder',
    ko: '마을을 일구는 사람',
    zh: '营建家园的开拓者',
    zhHans: '营建家园的开拓者',
    ja: '村を育てる開拓者',
    fr: 'Le bâtisseur de village',
    de: 'Der Dorfgemeinschaftsbauer',
    es: 'El constructor de la comunidad',
  },
  pfct: {
    en: 'The Ever-Welcoming Host',
    ko: '어디서나 밥상을 차리는 사람',
    zh: '四海为家的暖心归宿',
    zhHans: '四海为家的暖心归宿',
    ja: 'どこでも温かい食卓を囲む人',
    fr: 'L’hôte universel',
    de: 'Der gastfreundliche Wanderer',
    es: 'El acogedor del mundo',
  },
  pfcm: {
    en: 'The Long Journeyer for Family',
    ko: '가족을 위해 먼 길을 가는 사람',
    zh: '为家远行的远征者',
    zhHans: '为家远行的远征者',
    ja: '家族のために遠路を歩む人',
    fr: 'Le voyageur au long cours pour les siens',
    de: 'Der weite Wanderer für die Familie',
    es: 'El viajero abnegado por la familia',
  },
  pfvt: {
    en: 'The Friend on the Road',
    ko: '길 위의 친구',
    zh: '漫漫旅途上的知己',
    zhHans: '漫漫旅途上的知己',
    ja: '道すがらの友',
    fr: "L'ami sur la route",
    de: 'Der Weggefährte',
    es: 'El amigo del camino',
  },
  pfvm: {
    en: 'The Bridge Builder',
    ko: '다리를 놓는 사람',
    zh: '跨越山海的修桥人',
    zhHans: '跨越山海的修桥人',
    ja: '架け橋を築く人',
    fr: 'Le bâtisseur de ponts',
    de: 'Der Brückenbauer',
    es: 'El constructor de puentes',
  },
  wrct: {
    en: 'The Dedicated Craftsman',
    ko: '한 우물을 파는 장인',
    zh: '择一事终一生的匠人',
    zhHans: '择一事终一生的匠人',
    ja: '一途に道を究める職人',
    fr: "L'artisan dévoué",
    de: 'Der hingebungsvolle Handwerker',
    es: 'El artesano consagrado',
  },
  wrcm: {
    en: 'The Seed Sower',
    ko: '씨앗을 심는 사람',
    zh: '播种未来的深耕者',
    zhHans: '播种未来的深耕者',
    ja: '種を蒔き育てる人',
    fr: 'Le semeur d’avenir',
    de: 'Der Saatgut-Säer',
    es: 'El sembrador de futuros',
  },
  wrvt: {
    en: 'The Enterprise Creator',
    ko: '새 일을 벌이는 사람',
    zh: '勇开新局的创业者',
    zhHans: '勇开新局的创业者',
    ja: '新たな扉を開く挑戦者',
    fr: 'Le créateur d’entreprises audacieuses',
    de: 'Der schaffensfrohe Wegbereiter',
    es: 'El emprendedor audaz',
  },
  wrvm: {
    en: 'The Hometown Rebuilder',
    ko: '고향을 새로 짓는 사람',
    zh: '重塑故里的引路人',
    zhHans: '重塑故里的引路人',
    ja: '故郷を新しく紡ぐ人',
    fr: 'Le bâtisseur de renouveau natal',
    de: 'Der Heimat-Erneuerer',
    es: 'El renovador de la patria',
  },
  wfct: {
    en: 'The Steadfast Global Contributor',
    ko: '어디서든 제 몫을 하는 사람',
    zh: '随遇而安的大任担当',
    zhHans: '随遇而安的大任担当',
    ja: 'どこにいても誠を尽くす人',
    fr: 'L’artisan du devoir partout dans le monde',
    de: 'Der beständige Weltbürger',
    es: 'El trabajador incansable del mundo',
  },
  wfcm: {
    en: 'The Distant Pioneer',
    ko: '먼 곳에서 터전을 닦는 사람',
    zh: '拓荒远方的拓荒者',
    zhHans: '拓荒远方的拓荒者',
    ja: '遠き地で礎を築く開拓者',
    fr: 'Le pionnier des terres lointaines',
    de: 'Der fernwehe Pionier',
    es: 'El pionero de tierras lejanas',
  },
  wfvt: {
    en: 'The Wind Rider',
    ko: '바람을 타는 사람',
    zh: '乘风破浪的探险家',
    zhHans: '乘风破浪的探险家',
    ja: '風に乗る冒険者',
    fr: 'Le chevaucheur de vent',
    de: 'Der Windreiter',
    es: 'El jinete de los vientos',
  },
  wfvm: {
    en: 'The Trailblazer',
    ko: '새 길을 내는 사람',
    zh: '披荆斩棘的开拓先锋',
    zhHans: '披荆斩棘的开拓先锋',
    ja: '新道を切り拓く先駆者',
    fr: 'Le défricheur de chemins',
    de: 'Der unermüdliche Pfadfinder',
    es: 'El abridor de caminos',
  },
};

export const POLE_NAMES: Record<WishPole, Record<string, string>> = {
  p: { en: 'People & Warmth', ko: '곁 (사람과 온기)', zh: '人情相伴', zhHans: '人情相伴', ja: '人のぬくもり', fr: 'Chaleur humaine', de: 'Mitmenschlichkeit', es: 'Compañía y calor humano' },
  w: { en: 'Work & Mastery', ko: '일 (성취와 장인)', zh: '事功建树', zhHans: '事功建树', ja: '仕事と達成', fr: 'Œuvre et accomplissement', de: 'Wirken und Meisterschaft', es: 'Obra y maestría' },
  r: { en: 'Roots & Heritage', ko: '뿌리 (고향과 안식)', zh: '深根故土', zhHans: '深根故土', ja: '故郷と根', fr: 'Racines et ancrage', de: 'Wurzeln und Heimat', es: 'Raíces y arraigo' },
  f: { en: 'Wanderlust & Horizon', ko: '바람 (먼 세상과 여정)', zh: '远方浪潮', zhHans: '远方浪潮', ja: '遠い地平と風', fr: 'Vent du large', de: 'Horizont und Weite', es: 'Horizontes y aventura' },
  c: { en: 'Calm & Steadiness', ko: '고요 (평온과 지속)', zh: '岁月静好', zhHans: '岁月静好', ja: '静けさと安らぎ', fr: 'Sérénité et constance', de: 'Stille und Beständigkeit', es: 'Calma y serenidad' },
  v: { en: 'Waves & Renewal', ko: '물결 (변화와 새로운 시작)', zh: '波澜蜕变', zhHans: '波澜蜕变', ja: '変革と波', fr: 'Élan et renouveau', de: 'Wandel und Aufbruch', es: 'Cambio y vitalidad' },
  t: { en: 'Today & Gratitude', ko: '오늘 (지금의 기쁨)', zh: '珍惜当下', zhHans: '珍惜当下', ja: '今を慈しむ', fr: 'Le présent vécu', de: 'Die Gegenwart geniessen', es: 'El presente vivo' },
  m: { en: 'Tomorrow & Legacy', ko: '내일 (미래의 씨앗)', zh: '播种未来', zhHans: '播种未来', ja: '未来を紡ぐ', fr: 'L’avenir semé', de: 'Die Zukunft gestalten', es: 'El porvenir sembrado' },
};

const UNIVERSAL_MOMENTS: Record<WishPole, string[]> = {
  p: [
    'A quiet dinner around the table with family after an honest day.',
    'Holding a dear friend’s hand through their most difficult hour.',
    'The laughter of children ringing across the porch on a golden afternoon.',
  ],
  w: [
    'Working late into the night with steady hands to finish a craft.',
    'Overcoming hardship through dedication and earning honest respect.',
    'Building something lasting that people rely upon year after year.',
  ],
  r: [
    'Growing old in the neighborhood where you were born, known by everyone.',
    'Tending the same garden year after year as the seasons turn.',
    'Knowing every cobblestone, tree, and friendly face on your street.',
  ],
  f: [
    'Crossing oceans to see what lies beyond the distant mountain range.',
    'Learning a new language in a strange, bustling marketplace far away.',
    'Starting over in an unfamiliar land with only courage in your pocket.',
  ],
  c: [
    'Gentle, quiet mornings that repeat with peaceful and reliable comfort.',
    'Walking the same familiar path each evening under twilight skies.',
    'A serene life untroubled by great storms or chaotic upheavals.',
  ],
  v: [
    'Starting completely fresh in a new vocation every few years.',
    'Diving into unexpected turns of fortune and finding joy in adventure.',
    'A life of dramatic color, varied passions, and lively surprises.',
  ],
  t: [
    'Spending a whole afternoon lost in a hobby you love without guilt.',
    'Resting under a shady tree listening to the wind and feeling alive right now.',
    'Enjoying an ordinary cup of tea with no rush and no worries.',
  ],
  m: [
    'Enduring hard study today so that the road ahead will be brighter.',
    'Saving and planting seeds so that those who follow will eat the fruit.',
    'Steadily building knowledge and skills that will endure for tomorrow.',
  ],
};

export function extractMomentsFromLives(past: Life[], locale: Locale, t: ReturnType<typeof translator>): Record<WishPole, WishMoment[]> {
  const result: Record<WishPole, WishMoment[]> = {
    p: [],
    w: [],
    r: [],
    f: [],
    c: [],
    v: [],
    t: [],
    m: [],
  };

  past.forEach((life) => {
    const flag = life.country.flag;
    const cName = countryName(life.country, locale);

    // Pole P (People)
    if (life.family.children.length > 0) {
      result.p.push({
        pole: 'p',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Raised ${life.family.children.length} children through care and warmth.`,
      });
    } else if (life.family.partner) {
      result.p.push({
        pole: 'p',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Shared life's quiet journey together with ${life.family.partner.name}.`,
      });
    }

    // Pole W (Work)
    if (life.stats.job) {
      result.w.push({
        pole: 'w',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Dedicated years of honest skill as ${t(`job.${life.stats.job}`)}.`,
      });
    }

    // Pole R (Roots)
    if (!life.migration?.moves || life.migration.moves.length === 0) {
      result.r.push({
        pole: 'r',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Lived a whole life deeply rooted in ${cName}.`,
      });
    }

    // Pole F (Horizon / Wanderlust)
    if (life.migration?.moves && life.migration.moves.length > 0) {
      result.f.push({
        pole: 'f',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Traveled beyond borders to build a new life in a distant land.`,
      });
    }

    // Pole C (Calm)
    if (life.age >= 60) {
      result.c.push({
        pole: 'c',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Walked a calm and enduring journey across ${life.age} years.`,
      });
    }

    // Pole V (Waves / Change)
    if (life.career && life.career.length >= 2) {
      result.v.push({
        pole: 'v',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Embraced change and took on ${life.career.length} different callings.`,
      });
    }

    // Pole T (Today)
    if (life.hobbies && life.hobbies.length > 0) {
      result.t.push({
        pole: 't',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Found pure joy in personal passions and savoring the present day.`,
      });
    }

    // Pole M (Tomorrow / Legacy)
    if (life.schooling.years > 10 || (life.descendants?.grandchildren && life.descendants.grandchildren.length > 0)) {
      result.m.push({
        pole: 'm',
        lifeId: life.id,
        name: life.name,
        flag,
        age: life.age,
        country: cName,
        text: `Built knowledge and left behind roots for the next generation.`,
      });
    }
  });

  // Ensure every pole has at least 3 moments by backfilling from UNIVERSAL_MOMENTS
  (Object.keys(UNIVERSAL_MOMENTS) as WishPole[]).forEach((pole) => {
    UNIVERSAL_MOMENTS[pole].forEach((text) => {
      result[pole].push({ pole, text });
    });
  });

  return result;
}

export function buildWishQuestions(momentsByPole: Record<WishPole, WishMoment[]>): WishQuestion[] {
  const questions: WishQuestion[] = [];
  const axisPoles: Record<WishAxis, [WishPole, WishPole]> = {
    pw: ['p', 'w'],
    rf: ['r', 'f'],
    cv: ['c', 'v'],
    tm: ['t', 'm'],
  };

  // 3 rounds per axis = 12 questions
  for (let round = 0; round < 3; round++) {
    for (const axis of WISH_AXES) {
      const [poleA, poleB] = axisPoles[axis];
      const listA = momentsByPole[poleA] || [];
      const listB = momentsByPole[poleB] || [];

      const momentA = listA[round % listA.length] || { pole: poleA, text: '...' };
      const momentB = listB[round % listB.length] || { pole: poleB, text: '...' };

      // Randomize display order
      const flip = Math.random() < 0.5;
      questions.push({
        axis,
        options: flip ? [momentB, momentA] : [momentA, momentB],
      });
    }
  }

  return questions;
}

export function calculateWishResult(answers: WishPole[], past: Life[]): WishResult {
  const counts: Record<WishPole, number> = {
    p: 0,
    w: 0,
    r: 0,
    f: 0,
    c: 0,
    v: 0,
    t: 0,
    m: 0,
  };

  answers.forEach((pole) => {
    if (counts[pole] !== undefined) {
      counts[pole]++;
    }
  });

  const pickPole = (a: WishPole, b: WishPole): WishPole => (counts[a] >= counts[b] ? a : b);

  const dominantP = pickPole('p', 'w');
  const dominantR = pickPole('r', 'f');
  const dominantC = pickPole('c', 'v');
  const dominantT = pickPole('t', 'm');

  const code = `${dominantP}${dominantR}${dominantC}${dominantT}`;

  const getPercentages = (a: WishPole, b: WishPole) => {
    const total = (counts[a] + counts[b]) || 1;
    return {
      poleA: a,
      pctA: Math.round((counts[a] / total) * 100),
      poleB: b,
      pctB: Math.round((counts[b] / total) * 100),
    };
  };

  const percentages: Record<WishAxis, { poleA: WishPole; pctA: number; poleB: WishPole; pctB: number }> = {
    pw: getPercentages('p', 'w'),
    rf: getPercentages('r', 'f'),
    cv: getPercentages('c', 'v'),
    tm: getPercentages('t', 'm'),
  };

  // Find sample lives from past that match each dominant pole
  const matchedLives: Partial<Record<WishPole, Life>> = {};
  if (past.length > 0) {
    matchedLives[dominantP] = past[0];
    if (past[1]) matchedLives[dominantR] = past[1];
    if (past[2]) matchedLives[dominantC] = past[2];
    if (past[3]) matchedLives[dominantT] = past[3];
  }

  return {
    code,
    percentages,
    counts,
    matchedLives,
  };
}
