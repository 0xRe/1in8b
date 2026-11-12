import {qualificationLabel} from './qualification-label';
import { familyMembers, householdPartners } from '../game/descendants';
import { countryName } from '../game/countries';
import { companionLifetimes } from '../game/endings';
import { lifeInsights } from './life-insights';
import { translator, type Locale } from './i18n';
import type { Life } from '../game/types';
import type { SceneKind } from './pixel-art';

type T = ReturnType<typeof translator>;

export function endingSummary(life: Life) {
  const reflection = Object.entries(life.reflections)
    .filter(([age, text]) => Number(age) <= life.age && text.trim())
    .sort((a, b) => Number(b[0]) - Number(a[0]))[0];
  return {
    days: Math.floor(life.age * 365.25),
    children: life.family.children.length,
    grandchildren: life.descendants.grandchildren.length,
    survivors: familyMembers(life).filter(p => p.alive).length,
    reflection: reflection?.[1] ?? null,
    reflectionAge: reflection ? Number(reflection[0]) : null,
  };
}

export function epilogueStory(life: Life, t: T = translator('en')): { title: string; age: number; scene: SceneKind; lines: string[] } {
  const age = Math.min(life.age, Math.max(0, Math.floor(life.age * 0.72)));
  const hobby = [...life.hobbies].sort((a, b) => b.skill - a.skill)[0]?.id;
  const index = hobby === 'reading' ? 4 : hobby === 'music' ? 5 : hobby === 'nature' ? 3 : (life.seed >>> 0) % 4;
  const variant = life.age < 5 ? 'nursery' : life.age < 18 ? 'school' : ['city', 'beach', 'home', 'farm', 'park', 'music'][index];
  const scene: SceneKind = variant === 'music' ? 'home' : variant as SceneKind;
  return {
    title: t(`epilogue.${variant}.title`),
    age,
    scene,
    lines: [0, 1, 2].map(i => t(`epilogue.${variant}.${i}`, { name: life.name })),
  };
}

export function generateBiography(life: Life, locale: Locale, t: T): string {
  const info = lifeInsights(life);
  const country = countryName(life.migration.birthCountry, locale);
  const gender = life.sex === 'M' ? t('bio.boy') : t('bio.girl');
  const quintile = life.stats.incomeQuintile;
  const background = quintile === 1 ? t('bio.familyModest')
    : quintile === 2 ? t('bio.familyOrdinary')
    : quintile === 3 ? t('bio.familyComfortable')
    : quintile === 4 ? t('bio.familyWellOff')
    : t('bio.familyRichest');
  const residence = life.residence === 'urban' ? t('urban') : t('rural');

  const sentences: string[] = [];
  sentences.push(t('bio.born', { gender, background, residence, country }));

  const eduLevel = life.stats.education;
  if (life.academics) sentences.push(t('bio.academicQualification',{qualification:qualificationLabel(eduLevel,life.academics,t)}));
  else if (eduLevel === 0) sentences.push(t('bio.educationNone'));
  else if (eduLevel === 1) sentences.push(t('bio.educationPrimary'));
  else if (eduLevel === 2) sentences.push(t('bio.educationSecondary'));
  else if (eduLevel === 3) sentences.push(t('bio.educationVocational'));
  else if (eduLevel >= 4) sentences.push(t('bio.educationUniversity'));

  if (info.lastJob) {
    sentences.push(t('bio.workedAs', { job: t(`job.${info.lastJob}`) }));
  }

  if (life.talents.length > 0) {
    sentences.push(t('bio.talent', { talent: t(`hobby.${life.talents[0]}`) }));
  }

  if (info.partneredYears > 0) {
    sentences.push(t('bio.partnerShared', { years: info.partneredYears }));
  } else if (!life.family.partner && !life.family.secondPartner && life.family.marriageAge === null) {
    sentences.push(t('bio.single'));
  }
  if (life.family.secondPartner) {
    sentences.push(t('bio.secondPartner', { name: life.family.secondPartner.name }));
  }

  const childCount = life.family.children.length;
  const deadChildren = life.family.children.filter(c => !c.alive).length;
  const deadText = deadChildren > 0 ? t('bio.extraDead', { count: deadChildren }) : '';
  const grandCount = life.descendants.grandchildren.length;
  const grandText = grandCount > 0 ? t('bio.extraGrand', { count: grandCount }) : '';
  const greatCount = life.descendants.greatGrandchildren?.length ?? 0;
  const greatText = greatCount > 0 ? t('bio.extraGreat', { count: greatCount }) : '';
  const greaterCount = life.descendants.greatGreatGrandchildren?.length ?? 0;
  const greaterText = greaterCount > 0 ? t("bio.extraGreatGreat", {count: greaterCount}) : "";
  const extra = `${deadText}${grandText}${greatText}${greaterText}`;

  if (childCount > 0) {
    sentences.push(t('bio.descendantsSummary', { children: childCount, extra }));
  }

  const money = t.money(life.stats.netAssets);
  sentences.push(t('bio.wealthLeft', { amount: money }));

  return sentences.join(' ');
}

export function causeMortalityContext(life: Life, locale: Locale, t: T) {
  const info = lifeInsights(life);
  const country = countryName(life.country, locale);
  const gender = life.sex === 'M' ? t('bio.boy') : t('bio.girl');

  const age = life.age;
  const ageBracket = age < 5 ? t('bracket.under5')
    : age < 15 ? t('bracket.5to14')
    : age < 30 ? t('bracket.15to29')
    : age < 50 ? t('bracket.30to49')
    : age < 70 ? t('bracket.50to69')
    : t('bracket.70plus');

  const causeKey = life.cause ?? 'cause.age';
  const pctBase = causeKey.includes('heart') ? 16
    : causeKey.includes('cancer') ? 18
    : causeKey.includes('accident') ? 10
    : causeKey.includes('infection') ? 14
    : causeKey.includes('infant') ? 22
    : 20;
  const hash = Math.abs(life.seed + life.age * 7) % 7;
  const percent = pctBase + hash - 3;
  const chance = Math.round(info.cohortSurvival * 100);

  const contextText = t('record.causeContext', {
    country,
    percent,
    ageBracket,
    gender,
    age: life.age,
    chance,
  });

  return { percent, ageBracket, chance, contextText };
}

export function whoSaidGoodbye(life: Life, locale: Locale, t: T): string {
  const names = householdPartners(life).filter(p => p.alive).map(p => p.name);
  const partner = new Intl.ListFormat(locale === 'zh' ? 'zh-Hant' : locale === 'zh-hans' ? 'zh-Hans' : locale, { type: 'conjunction' }).format(names);
  const livingChildren = life.family.children.filter(c => c.alive).length;
  const livingGrandchildren = life.descendants.grandchildren.filter(g => g.alive).length;

  // Counts of zero are left out rather than listed ("0 grandchildren").
  if (partner && livingGrandchildren === 0) {
    return livingChildren > 0 ? t('record.goodbyeKids', { partner, children: livingChildren }) : t('record.goodbyeSpouseOnly', { partner });
  }
  if (!partner && livingGrandchildren === 0 && livingChildren > 0) return t('record.goodbyeKidsNoSpouse', { children: livingChildren });
  if (partner) {
    return t('record.goodbyeFull', {
      partner,
      children: livingChildren,
      grandchildren: livingGrandchildren,
    });
  }
  if (livingChildren > 0 || livingGrandchildren > 0) {
    return t('record.goodbyeNoSpouse', {
      children: livingChildren,
      grandchildren: livingGrandchildren,
    });
  }
  return t('record.goodbyeSimple');
}

export function whoRemembered(life: Life, _locale: Locale, t: T): string | null {
  if (life.age < 18) return null;

  let speaker = '';
  const spouse = life.family.partner?.alive ? life.family.partner : null;
  const livingKids = life.family.children.filter(c => c.alive);
  const eldestChild = livingKids[0];
  const livingSiblings = life.family.siblings.filter(s => s.alive);

  if (eldestChild) {
    const isDaughter = eldestChild.sex === 'F';
    speaker = t(isDaughter ? 'rel.daughter' : 'rel.son', { name: eldestChild.name });
  } else if (spouse) {
    speaker = t('rel.partner', { name: spouse.name });
  } else if (livingSiblings.length > 0) {
    speaker = t('rel.sibling');
  } else {
    speaker = t('rel.lifelongFriend');
  }

  const quotes: string[] = [];

  if (life.care?.who === 'self') {
    quotes.push(t('quote.caredParents'));
  }
  if (life.migration?.moves?.length > 0) {
    quotes.push(t('quote.protectedFamilyAbroad'));
  }
  if (life.family.children.length >= 2 || life.focus === 'relationships') {
    quotes.push(t('quote.alwaysOnOurSide'));
  }
  if (life.stats.annualIncome > 0 && life.career?.length > 0) {
    quotes.push(t('quote.honestWorker'));
  }
  if (life.hobbies.length > 0) {
    quotes.push(t('quote.sparkledHobby'));
  }
  if (life.stats.social >= 65 || life.temperament.kind === 'sociable') {
    quotes.push(t('quote.lovedPeople'));
  } else if (life.stats.happiness >= 65) {
    quotes.push(t('quote.warmSmile'));
  }
  quotes.push(t('quote.quietPresence'));

  const seedHash = Math.abs((life.seed || 1) + life.age);
  const selectedQuote = quotes[seedHash % quotes.length];

  return t('record.partingSaid', { who: speaker, quote: selectedQuote });
}

export function lookingBackReflection(life: Life, _locale: Locale, t: T): string {
  if (life.stats.netAssets < 0 && life.family.children.length >= 2) {
    return t('reflection.familyOverWealth');
  }
  if (life.stats.netAssets > 60000) {
    return t('reflection.steadyComfort');
  }
  if (life.migration.moves.length > 0) {
    return t('reflection.journey');
  }
  const maxSkill = Math.max(0, ...life.hobbies.map(h => h.skill));
  if (maxSkill >= 6) {
    return t('reflection.craft');
  }
  return t('reflection.ordinary');
}

export function todayThemeFact(life: Life, locale: Locale, t: T) {
  const country = countryName(life.country, locale);
  const roadRate = Math.round(life.country.road || 24);
  const total = (830000 + (Math.abs(life.seed) % 20000)).toLocaleString(locale === 'zh-hans' ? 'zh-Hans' : locale);
  const percent = 7;

  return {
    title: t('record.todayThemeTitle'),
    themeName: t('record.themeRoad'),
    passedText: t('record.themePassedWithout'),
    statText: t('record.themeRoadStat', { country, rate: roadRate }),
    contextText: t('record.themeRoadContext', { total, percent }),
  };
}

export function fiveCompanions(life: Life, locale: Locale, t: T) {
  const companions = companionLifetimes(life);
  const playerItem = {
    name: life.name,
    age: life.age,
    country: countryName(life.country, locale),
    isPlayer: true,
    bio: generateBiography(life, locale, t),
  };

  const others = companions.map(c => {
    const cCountry = countryName(c.country, locale);
    const gender = c.sex === 'M' ? t('bio.boy') : t('bio.girl');
    const edu = t(`education${c.education}`);
    const jobText = c.lastJob ? t(`job.${c.lastJob}`) : t('record.unknown');
    const causeText = t(c.cause ?? 'cause.age');
    // Only the facts that apply: no schooling for infants, no job when none was held, one child in the singular.
    const bio = [
      t('feel.bio.born', { gender, country: cCountry }),
      c.education > 0 ? t('feel.bio.edu', { edu }) : '',
      c.lastJob ? t('feel.bio.job', { job: jobText }) : '',
      c.children === 1 ? t('feel.bio.child') : c.children > 1 ? t('feel.bio.children', { children: c.children }) : '',
      t('feel.bio.died', { cause: causeText, age: c.age }),
    ].filter(Boolean).join(' ');
    return {
      name: c.name,
      age: c.age,
      country: cCountry,
      isPlayer: false,
      bio,
    };
  });

  const all = [playerItem, ...others].sort((a, b) => a.age - b.age);
  const ages = all.map(p => String(p.age)).join(', ');
  const closingText = t('record.fiveCompanionsClosing', { ages });

  return { companions: all, closingText };
}

export function globalImpactCauses(_life: Life, _locale: Locale, t: T) {
  return [
    {
      id: 'hunger',
      title: t('record.hungerTitle'),
      whereText: t('record.whereWorkGoes'),
      stat: t('record.hungerStat'),
      orgs: [
        { name: 'World Food Programme ↗', url: 'https://www.wfp.org/emergency-relief' },
        { name: 'Helen Keller Intl ↗', url: 'https://helenkellerintl.org/combatting-vitamin-a-deficiencies/' },
      ],
    },
    {
      id: 'malaria',
      title: t('record.malariaTitle'),
      whereText: t('record.whereWorkGoes'),
      stat: t('record.malariaStat'),
      orgs: [
        { name: 'Against Malaria Foundation ↗', url: 'https://www.againstmalaria.com/Nets.aspx' },
        { name: 'Malaria Consortium ↗', url: 'https://www.malariaconsortium.org/resources/seasonal-malaria-chemoprevention' },
      ],
    },
    {
      id: 'vaccines',
      title: t('record.vaccinesTitle'),
      whereText: t('record.whereWorkGoes'),
      stat: t('record.vaccinesStat'),
      orgs: [
        { name: 'Gavi, the Vaccine Alliance ↗', url: 'https://www.gavi.org/' },
        { name: 'UNICEF ↗', url: 'https://www.unicef.org/immunization' },
      ],
    },
  ];
}
