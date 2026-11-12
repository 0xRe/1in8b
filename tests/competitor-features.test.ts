import test from 'node:test';
import assert from 'node:assert/strict';
import { worldSurvivalCurve } from '../src/game/world-survival';
import { getLifeMilestones } from '../src/game/life-milestones';
import { whoRemembered } from '../src/lib/ending-story';
import { translator } from '../src/lib/i18n';
import { getCountries } from '../src/game/countries';
import { COMPETITOR_PARITY_CATALOGS } from '../src/lib/catalogs/competitor-parity';
import { getCompanionStatus } from '../src/components/LiveCompanions';
import { computeEstateSettlement } from '../src/components/EstateSettlement';
import { selectAutoChoice, type AutoLean } from '../src/lib/auto-lean';
import {
  extractMomentsFromLives,
  buildWishQuestions,
  calculateWishResult,
  WISH_ARCHETYPES,
  type WishPole,
} from '../src/lib/life-wish';
import { generateUnfulfilledWishes } from '../src/lib/unfulfilled-wishes';
import type { Life, Companion, Decision } from '../src/game/types';
import type { Locale } from '../src/lib/i18n';

test('world survival curve calculates population-weighted survival per sex', () => {
  for (const sex of ['F', 'M'] as const) {
    const curve = worldSurvivalCurve(sex);
    assert.equal(curve.length, 101, 'Curve has 101 points (0 to 100)');
    assert.equal(curve[0], 100, 'Survival starts at 100%');
    assert.ok(curve[5] > 90, 'Infant/child survival is above 90% globally');
    assert.ok(curve[20] > 85, 'Youth survival is above 85% globally');
    assert.ok(curve[80] < curve[50], 'Survival declines with age');
    // Ensure monotonically non-increasing
    for (let i = 1; i < curve.length; i++) {
      assert.ok(curve[i] <= curve[i - 1], `Survival at ${i} should not exceed ${i - 1}`);
    }
  }
});

test('life milestones detects key lifecycle moments with correct symbols', () => {
  const dummyLife: Partial<Life> = {
    alive: false,
    deathAge: 75,
    cause: 'event.deathOldAge',
    age: 75,
    family: {
      parents: [],
      siblings: [],
      partner: { id: 'p1', name: 'Elena', age: 72, job: 'unemployed', alive: true },
      children: [],
      married: true,
      marriageAge: 24,
    },
    events: [
      { id: 'e1', age: 6, year: 2032, kind: 'education', key: 'event.primarySchoolStart', icon: '🏫', importance: 'major' },
      { id: 'e2', age: 10, year: 2036, kind: 'bereavement', key: 'event.fatherDied', icon: '†', importance: 'major' },
      { id: 'e3', age: 24, year: 2050, kind: 'romance', key: 'event.married', icon: '♥', importance: 'major' },
      { id: 'e4', age: 26, year: 2052, kind: 'family', key: 'event.childBorn', icon: '👶', importance: 'major' },
      { id: 'e5', age: 30, year: 2056, kind: 'work', key: 'event.jobPromotion', icon: '💼', importance: 'major' },
    ],
  };

  const milestones = getLifeMilestones(dummyLife as Life);

  assert.equal(milestones.get(6)?.symbol, 'S', 'Age 6 has school symbol S');
  assert.equal(milestones.get(10)?.symbol, '†', 'Age 10 has bereavement symbol †');
  assert.equal(milestones.get(24)?.symbol, '♥', 'Age 24 has love symbol ♥');
  assert.equal(milestones.get(26)?.symbol, '+', 'Age 26 has child birth symbol +');
  assert.equal(milestones.get(30)?.symbol, '★', 'Age 30 has career milestone symbol ★');
  assert.equal(milestones.get(75)?.symbol, '†', 'Age 75 (death) has death symbol †');
});

test('whoRemembered generates tender parting eulogy quote for adult lives', () => {
  const tEn = translator('en');
  const tZh = translator('zh');

  const adultLife: Partial<Life> = {
    age: 78,
    seed: 42,
    family: {
      parents: [],
      siblings: [],
      partner: { id: 'sp', name: 'Anna', age: 75, job: 'unemployed', alive: true },
      children: [
        { id: 'c1', name: 'Maya', age: 45, job: 'employed', alive: true, sex: 'F' },
      ],
      married: true,
      marriageAge: 26,
    },
    hobbies: [{ id: 'gardening', name: 'Gardening', level: 3, skill: 3 }],
    stats: {
      health: 0,
      happiness: 70,
      knowledge: 50,
      social: 60,
      netAssets: 20000,
      annualIncome: 15000,
      stress: 20,
    },
    temperament: { kind: 'calm', trait: 'thoughtful' } as any,
    events: [],
    care: null,
    migration: { moves: [] },
    focus: 'health',
  };

  const eulogyEn = whoRemembered(adultLife as Life, 'en', tEn);
  assert.ok(eulogyEn, 'Adult eulogy should not be null');
  assert.ok(eulogyEn.includes('Maya'), 'Eulogy mentions daughter Maya');
  assert.ok(eulogyEn.includes('“') || eulogyEn.includes('"'), 'Eulogy quotes words');

  const eulogyZh = whoRemembered(adultLife as Life, 'zh', tZh);
  assert.ok(eulogyZh, 'Chinese eulogy should not be null');
  assert.ok(eulogyZh.includes('Maya'), 'Chinese eulogy mentions daughter Maya');

  const childLife: Partial<Life> = {
    age: 12,
    seed: 1,
    family: { parents: [], siblings: [], children: [], married: false },
  };
  assert.equal(whoRemembered(childLife as Life, 'en', tEn), null, 'Child under 18 returns null');
});

test('countries list has population and demographic data for simulation table', () => {
  const countries = getCountries();
  assert.ok(countries.length > 50, 'Has comprehensive list of countries');
  const india = countries.find(c => c.id === 'IND');
  const china = countries.find(c => c.id === 'CHN');
  const usa = countries.find(c => c.id === 'USA');
  assert.ok(india && india.pop > 1000000, 'India has population data');
  assert.ok(china && china.pop > 1000000, 'China has population data');
  assert.ok(usa && usa.pop > 300000, 'USA has population data');
});

test('getCompanionStatus generates accurate lifecycle labels for live parallel companions', () => {
  const tEn = translator('en');
  const dummyCountry = getCountries()[0];

  const infantComp: Companion = {
    id: 'c1',
    name: 'Karim',
    country: dummyCountry,
    sex: 'M',
    age: 2,
    alive: true,
    deathAge: null,
    cause: null,
    health: 90,
    happiness: 80,
    education: 0,
    job: 'none',
    lastJob: null,
    children: 0,
    netAssets: 0,
  };
  assert.equal(getCompanionStatus(infantComp, 2, 'en', tEn), tEn('infancy'));

  const studentComp: Companion = {
    ...infantComp,
    age: 14,
    education: 2,
    job: 'student',
  };
  assert.equal(getCompanionStatus(studentComp, 14, 'en', tEn), tEn('student'));

  const adultComp: Companion = {
    ...infantComp,
    age: 32,
    education: 3,
    job: 'artisan',
    children: 2,
  };
  const adultStatus = getCompanionStatus(adultComp, 32, 'en', tEn);
  assert.ok(adultStatus.includes(tEn('job.artisan')));
  assert.ok(adultStatus.includes('2'));

  const deadComp: Companion = {
    ...infantComp,
    age: 4,
    alive: false,
    deathAge: 0,
    cause: 'cause.infant',
  };
  const deadStatus = getCompanionStatus(deadComp, 4, 'en', tEn);
  assert.ok(deadStatus.startsWith('† at 0'));
});

test('computeEstateSettlement divides net assets accurately among surviving heirs', () => {
  const tEn = translator('en');
  const dummyCountry = getCountries()[0];

  const baseLife: Partial<Life> = {
    age: 65,
    country: dummyCountry,
    stats: {
      health: 80, happiness: 70, knowledge: 50, social: 60,
      education: 2, netAssets: 0, savings: 0, investments: 0, annualIncome: 0, debt: 0,
      employment: 'retired', job: 'retired', incomeQuintile: 3, birthPlaceType: 'urban', religion: 'none',
    },
    family: {
      parents: [],
      siblings: [],
      partner: null,
      children: [],
      married: false,
      marriageAge: null,
    },
  };

  // Zero / negative net worth
  const zeroEst = computeEstateSettlement(baseLife as Life, tEn);
  assert.equal(zeroEst.summary, tEn('ui.estateDebtSettled'));
  assert.equal(zeroEst.rows.length, 0);

  // Modest assets under 500
  const modestLife = { ...baseLife, stats: { ...baseLife.stats!, netAssets: 300 } };
  const modestEst = computeEstateSettlement(modestLife as Life, tEn);
  assert.equal(modestEst.summary, tEn('ui.estateModest'));
  assert.equal(modestEst.rows.length, 0);

  // Both spouse and 2 children survive with $10,000
  const familyLife = {
    ...baseLife,
    stats: { ...baseLife.stats!, netAssets: 10000 },
    family: {
      ...baseLife.family!,
      partner: { id: 'p1', name: 'Maria', age: 62, job: 'none' as const, alive: true },
      children: [
        { id: 'c1', name: 'Alex', age: 30, sex: 'M' as const, country: 'USA', birthYear: 2020, alive: true, deathAge: null, job: 'teacher' as const },
        { id: 'c2', name: 'Sam', age: 28, sex: 'F' as const, country: 'USA', birthYear: 2022, alive: true, deathAge: null, job: 'nurse' as const },
      ],
    },
  };
  const familyEst = computeEstateSettlement(familyLife as Life, tEn);
  assert.equal(familyEst.summary, tEn('ui.estateSpouseChildren'));
  assert.equal(familyEst.rows.length, 3);
  assert.equal(familyEst.rows[0].name, 'Maria');
  assert.equal(familyEst.rows[0].amount, 5000); // 50%
  assert.equal(familyEst.rows[1].amount, 2500); // 25%
  assert.equal(familyEst.rows[2].amount, 2500); // 25%

  // Spouse only
  const spouseOnlyLife = {
    ...familyLife,
    family: { ...familyLife.family, children: [] },
  };
  const spouseEst = computeEstateSettlement(spouseOnlyLife as Life, tEn);
  assert.equal(spouseEst.summary, tEn('ui.estateSpouseOnly'));
  assert.equal(spouseEst.rows[0].amount, 10000);

  // Solitary community legacy
  const solitaryLife = {
    ...baseLife,
    stats: { ...baseLife.stats!, netAssets: 5000 },
  };
  const solEst = computeEstateSettlement(solitaryLife as Life, tEn);
  assert.equal(solEst.summary, tEn('ui.estateSolitary'));
  assert.equal(solEst.rows[0].name, tEn('ui.heirCommunity'));
});

test('competitor parity catalog has 100% key and placeholder parity across all 14 languages', () => {
  const locales: Locale[] = ['en', 'zh-hans', 'zh', 'ja', 'ko', 'vi', 'fr', 'th', 'es', 'de', 'tr', 'ru', 'pt', 'id'];
  const enKeys = Object.keys(COMPETITOR_PARITY_CATALOGS.en).sort();

  for (const loc of locales) {
    const locKeys = Object.keys(COMPETITOR_PARITY_CATALOGS[loc]).sort();
    assert.deepEqual(locKeys, enKeys, `Locale ${loc} must have identical keys to en`);

    for (const key of enKeys) {
      const enVal = COMPETITOR_PARITY_CATALOGS.en[key];
      const locVal = COMPETITOR_PARITY_CATALOGS[loc][key];
      assert.ok(locVal && locVal.length > 0, `Locale ${loc} key ${key} must not be empty`);

      // Verify placeholder matching
      const enPlaceholders = (enVal.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();
      const locPlaceholders = (locVal.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();
      assert.deepEqual(locPlaceholders, enPlaceholders, `Locale ${loc} key ${key} placeholders must match en`);
    }
  }
});

test('selectAutoChoice steers choices according to life philosophy inclinations', () => {
  // Decision 1: Discipline
  const disciplineDecision: Decision = {
    id: 'child_discipline',
    type: 'choice',
    age: 28,
    key: 'decision.discipline',
    params: {},
    choices: [
      { id: 'hit', key: 'choice.discipline.hit', params: {} },
      { id: 'calm', key: 'choice.discipline.calm', params: {} },
      { id: 'talk', key: 'choice.discipline.talk', params: {} },
    ],
  };

  for (const lean of ['balanced', 'cautious', 'adventurous', 'family'] as AutoLean[]) {
    const choice = selectAutoChoice(disciplineDecision, lean);
    assert.notEqual(choice, 'hit', `Lean ${lean} must never pick destructive hit option`);
    assert.ok(choice === 'talk' || choice === 'calm', `Lean ${lean} should pick a constructive choice`);
  }

  // Decision 2: Career opportunity vs caution
  const careerDecision: Decision = {
    id: 'career_offer',
    type: 'choice',
    age: 32,
    key: 'decision.career',
    params: {},
    choices: [
      { id: 'stay', key: 'choice.career.stay', params: {} },
      { id: 'pursueDream', key: 'choice.career.pursueDream', params: {} },
      { id: 'wait', key: 'choice.career.wait', params: {} },
    ],
  };

  assert.equal(selectAutoChoice(careerDecision, 'adventurous'), 'pursueDream');
  assert.equal(selectAutoChoice(careerDecision, 'cautious'), 'stay');

  // Decision 3: Migration together vs alone vs stay
  const migrationDecision: Decision = {
    id: 'migration_choice',
    type: 'choice',
    age: 35,
    key: 'decision.migration',
    params: {},
    choices: [
      { id: 'migrateAlone', key: 'choice.migrate', params: {} },
      { id: 'migrateTogether', key: 'choice.migrateTogether', params: {} },
      { id: 'stay', key: 'choice.stay', params: {} },
    ],
  };

  assert.equal(selectAutoChoice(migrationDecision, 'family'), 'migrateTogether');
  assert.equal(selectAutoChoice(migrationDecision, 'cautious'), 'stay');
});

test('past lives village and simulation lab keys render correctly in all languages', () => {
  const locales: Locale[] = ['en', 'zh-hans', 'zh', 'ja', 'ko', 'vi', 'fr', 'th', 'es', 'de', 'tr', 'ru', 'pt', 'id'];

  for (const loc of locales) {
    const t = translator(loc);
    assert.ok(t('ui.seeAsVillage').length > 0, `ui.seeAsVillage in ${loc}`);
    assert.ok(t('ui.villageTitle').length > 0, `ui.villageTitle in ${loc}`);
    assert.ok(t('ui.bornAgain').length > 0, `ui.bornAgain in ${loc}`);
    assert.ok(t('ui.classCodeLabel').length > 0, `ui.classCodeLabel in ${loc}`);
    assert.ok(t('ui.labOpen').length > 0, `ui.labOpen in ${loc}`);
    assert.ok(t('ui.withSound').length > 0, `ui.withSound in ${loc}`);
  }
});

test('the life I wish for discovery engine computes archetypes and renders across all 14 languages', () => {
  const locales: Locale[] = ['en', 'zh-hans', 'zh', 'ja', 'ko', 'vi', 'fr', 'th', 'es', 'de', 'tr', 'ru', 'pt', 'id'];

  // Test question builder with empty lives
  const moments = extractMomentsFromLives([], 'en', translator('en'));
  assert.ok(moments.p.length >= 3, 'Moments have at least 3 moments for pole p');
  assert.ok(moments.w.length >= 3, 'Moments have at least 3 moments for pole w');

  const questions = buildWishQuestions(moments);
  assert.equal(questions.length, 12, 'Wish engine generates exactly 12 pairwise questions');

  // Test archetype calculation
  // Answers: 3 p, 3 r, 3 c, 3 t => prct
  const answersPRCT: WishPole[] = ['p', 'r', 'c', 't', 'p', 'r', 'c', 't', 'p', 'r', 'c', 't'];
  const resPRCT = calculateWishResult(answersPRCT, []);
  assert.equal(resPRCT.code, 'prct', 'Calculates archetype prct correctly');
  assert.ok(WISH_ARCHETYPES.prct, 'Archetype prct exists');
  assert.equal(resPRCT.percentages.pw.pctA, 100);
  assert.equal(resPRCT.percentages.pw.pctB, 0);

  // Answers: 3 w, 3 f, 3 v, 3 m => wfvm
  const answersWFVM: WishPole[] = ['w', 'f', 'v', 'm', 'w', 'f', 'v', 'm', 'w', 'f', 'v', 'm'];
  const resWFVM = calculateWishResult(answersWFVM, []);
  assert.equal(resWFVM.code, 'wfvm', 'Calculates archetype wfvm correctly');

  // Verify all 16 archetypes are defined
  const expectedCodes = [
    'prct', 'prcm', 'prvt', 'prvm',
    'pfct', 'pfcm', 'pfvt', 'pfvm',
    'wrct', 'wrcm', 'wrvt', 'wrvm',
    'wfct', 'wfcm', 'wfvt', 'wfvm',
  ];
  for (const code of expectedCodes) {
    assert.ok(WISH_ARCHETYPES[code], `Archetype ${code} must be defined`);
    assert.ok(WISH_ARCHETYPES[code].en.length > 0, `Archetype ${code} has en title`);
    assert.ok(WISH_ARCHETYPES[code].ko.length > 0, `Archetype ${code} has ko title`);
    assert.ok(WISH_ARCHETYPES[code].zh.length > 0, `Archetype ${code} has zh title`);
  }

  // Verify catalog keys in all 14 languages
  for (const loc of locales) {
    const t = translator(loc);
    assert.ok(t('ui.seeAsWish').length > 0, `ui.seeAsWish in ${loc}`);
    assert.ok(t('ui.wishTitle').length > 0, `ui.wishTitle in ${loc}`);
    assert.ok(t('ui.wishDesc').length > 0, `ui.wishDesc in ${loc}`);
    assert.ok(t('ui.wishStart').length > 0, `ui.wishStart in ${loc}`);
    assert.ok(t('ui.wishSaveImage').length > 0, `ui.wishSaveImage in ${loc}`);
    assert.ok(t('ui.wishTryAgain').length > 0, `ui.wishTryAgain in ${loc}`);
    assert.ok(t('ui.villagePick').length > 0, `ui.villagePick in ${loc}`);
    assert.ok(t('ui.villagePickNewest').length > 0, `ui.villagePickNewest in ${loc}`);
    assert.ok(t('ui.villagePickConfirm').length > 0, `ui.villagePickConfirm in ${loc}`);
  }
});

test('unfulfilled wishes generator and photo wall keys render correctly in all 14 languages', () => {
  const locales: Locale[] = ['en', 'zh-hans', 'zh', 'ja', 'ko', 'vi', 'fr', 'th', 'es', 'de', 'tr', 'ru', 'pt', 'id'];

  const sampleLife: Partial<Life> = {
    name: 'Kenji Sato',
    age: 58,
    birthYear: 1968,
    year: 2026,
    country: { id: 'JP', name: 'Japan', flag: '🇯🇵' },
    family: {
      children: [{ id: 'k1', name: 'Hana', age: 22, alive: true, job: 'employed', sex: 'F' }],
      parents: [],
      siblings: [],
      partner: null,
      married: false,
      marriageAge: null,
    },
    migration: {
      moves: [{ age: 25, country: 'US', together: false }],
      birthCountry: { id: 'JP', name: 'Japan', flag: '🇯🇵' },
      offerCountry: null,
      lastMoveAge: 25,
      familyCountry: null,
    },
    schooling: {
      childLabor: true,
      droppedOut: false,
      enrolled: true,
      years: 5,
    },
    stats: {
      knowledge: 35,
      health: 0,
      happiness: 60,
      social: 50,
      netAssets: 10000,
      annualIncome: 20000,
      stress: 20,
    },
  };

  const wishes = generateUnfulfilledWishes(sampleLife as Life, 'en', translator('en'));
  assert.ok(wishes.length >= 4, 'Kenji gets at least 4 unfulfilled wishes (kid, home, school, read/peace)');
  assert.ok(wishes.some((w) => w.id === 'kid'), 'Includes child graduation wish');
  assert.ok(wishes.some((w) => w.id === 'home'), 'Includes homecoming wish');
  assert.ok(wishes.some((w) => w.id === 'school'), 'Includes first day of school wish');
  assert.ok(wishes.some((w) => w.id === 'peace'), 'Includes porch peace wish');

  // Verify all 14 languages have the keys
  for (const loc of locales) {
    const t = translator(loc);
    assert.ok(t('ui.unfulfilledWishesTitle').length > 0, `ui.unfulfilledWishesTitle in ${loc}`);
    assert.ok(t('ui.photoWall').length > 0, `ui.photoWall in ${loc}`);
    assert.ok(t('ui.photoWallTitle').length > 0, `ui.photoWallTitle in ${loc}`);
    assert.ok(t('ui.photoPrint').length > 0, `ui.photoPrint in ${loc}`);
    assert.ok(t('ui.photoPng').length > 0, `ui.photoPng in ${loc}`);
    assert.ok(t('ui.memoFarDead').length > 0, `ui.memoFarDead in ${loc}`);
    assert.ok(t('ui.memoRand').length > 0, `ui.memoRand in ${loc}`);
    assert.ok(t('ui.wishKidTitle', { name: 'Hana' }).includes('Hana'), `wishKidTitle contains name in ${loc}`);
  }
});

test('past lives showcase and memory room customizer keys render correctly in all 14 languages', () => {
  const locales: Locale[] = ['en', 'zh-hans', 'zh', 'ja', 'ko', 'vi', 'fr', 'th', 'es', 'de', 'tr', 'ru', 'pt', 'id'];

  for (const loc of locales) {
    const t = translator(loc);
    assert.ok(t('ui.pastShelfTitle').length > 0, `ui.pastShelfTitle in ${loc}`);
    assert.ok(t('ui.pastShelfSubtitle').length > 0, `ui.pastShelfSubtitle in ${loc}`);
    assert.ok(t('ui.saveShowcasePng').length > 0, `ui.saveShowcasePng in ${loc}`);
    assert.ok(t('ui.shelfSubtitle').length > 0, `ui.shelfSubtitle in ${loc}`);
    assert.ok(t('ui.kpRoomTry').length > 0, `ui.kpRoomTry in ${loc}`);
    assert.ok(t('ui.reviewLife').length > 0, `ui.reviewLife in ${loc}`);
    assert.ok(t('ui.viewMemoryRoom').length > 0, `ui.viewMemoryRoom in ${loc}`);
    assert.ok(t('ui.shelfOnlyHere').length > 0, `ui.shelfOnlyHere in ${loc}`);
  }
});

