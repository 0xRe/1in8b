import{hobbyDisplayId}from'./physical-hobbies';
import{isPhysicalEquipmentDecision,physicalEquipmentDecision,resolvePhysicalEquipment,refreshScheduledPhysicalEquipment}from'./physical-decisions';
import {observePhysicalYear} from './physical-runtime';
import {settleOccupationExperience,snapshotOccupationMigration} from './occupation-experience';
import {occupationQuoteCurrent,hasQueuedJobDecision} from './occupation-quote';
import {WORK_JOB_IDS} from './job-identities';
import {isMajorDecision,prepareUniversityMajor,universityMajorDecision,resolveUniversityMajor,scheduleUniversityMajor} from './university-major-runtime';
import {hobbyPurchasePlan,hobbyPurchaseAllowed,payHobbyPurchase} from './hobby-purchase';
import {returnFromOverseasStudy} from './study-family';
import {isStudyGraduation,studyGraduationDecision,resolveStudyGraduation,scheduleStudyGraduation,prepareNaturalStudyGraduation} from './study-graduation';
import {automaticLessonsAvailable,automaticLessonTarget,hobbyLessonPrice,hobbyLessonGain,settleAutomaticLessons} from './hobby-lessons';
import {hobbyLifeCandidate} from './hobby-life';
import {isStudyDecision,studyDecision,resolveStudyChoice,scheduleStudyChoice} from './study-choice-runtime';
import {hobbyPracticeBlocked,isNamedSport} from './named-sports';
import {hobbyMilestoneCandidate,annualCraftIncome} from './hobby-milestones';
import {resumeStudyPartnerWork} from './study-settlement-runtime';
import {physicalCountry} from './physical-residence';
import {hobbySpendingAccess} from './hobby-spending';
import {hobbyDecision,refreshHobbyDecision,isHobbyDecision,prepareHobbyDecision,resolveHobbyChoice,addObservedHobby,hobbySearchAvailable,hobbySearchPrice,annualHobbyCost} from './hobby-runtime';
import { hobbyDefinition } from './hobby-catalog';
import {prepareNaturalOfficerYear,observeNaturalOfficerFinance} from './natural-officer-runtime';
import {automaticRetakeProbability} from './school-admissions';
import {universityRetakeDecision,resolveUniversityRetake,settleUniversityRetake,isUniversityRetakeDecision,scheduleUniversityRetake} from './university-retake-runtime';
import {refreshEducationContext,settleEducationHobbies} from './education-context-lifecycle';
import {refreshNewFocus} from './school-focus';
import {prepareSupportedAdult} from './supported-adult-runtime';
import {prepareSupportedSchool} from './supported-school-runtime';
import {childDevelopmentYear} from './child-development-observation';
import {childLearningYear} from './child-learning-observation';
import {observeDevelopment} from './development-observation';
import {drawBirthDevelopment} from './birth-development';
import {preparePrimaryRuntime,settlePrimaryRuntime,primaryReturnEligible,resolvePrimaryReturn} from './primary-school-runtime';
import {prepareCollegeRuntime,collegeDecision,resolveCollegeRuntime,isCollegeDecision} from './college-runtime';
import {observeGuardianLoss,guardianDecision,resolveGuardianDecision,guardianAnnualCost,guardianArrangement,guardianYear} from './grandchild-guardianship-runtime';
import {canAskChildren,settleRequestedChildHelp} from './child-help-runtime';
import {isMilitaryRetirement,militaryRetirementDecision,resolveMilitaryRetirementRuntime,prepareMilitaryRetirementRuntime,rollMilitaryRetirementFacts} from './military-retirement-runtime';
import {prepareMilitaryPensionRuntime,settleDepartedOfficerIncome,settleRetiredOfficerIncome,indexMilitaryPensionRuntime,rollMilitaryServiceState} from './military-pension-runtime';
import {prepareOfficerPromotionRuntime,officerPromotionDecision,resolveOfficerPromotionRuntime,isOfficerPromotion} from './officer-promotion-runtime';
import {settleOfficerRuntime,settleOfficerRecovery} from './officer-runtime';
import {commissionAcademyRuntime} from './academy-runtime';
import {prepareUpperRuntime,upperSecondaryDecision,resolveUpperRuntime,isUpperSecondaryDecision,schoolWithdrawalDecision,isSchoolWithdrawalDecision,expireSchoolWithdrawal,resolveWithdrawalRuntime,settleUpperRuntime,settleEquivalencyRuntime} from './upper-secondary-runtime';
import {lowerSecondaryDropoutProbability} from './lower-secondary';
import {prepareSecondaryRuntime,secondaryDecision,resolveSecondaryRuntime,isLowerSecondaryDecision} from './lower-secondary-runtime';
import {childWorkIncome} from './income-distribution';
import {educationEraInputs} from './education-era';
import {resolveChildWork,resolveSchoolReturn} from './child-school-work';
import {academyDropoutProbability,postgraduateDropoutProbability,universityDropoutProbability} from './school-retention';
import {academicContinuationDecision,academicDecisionAge,resolveAcademicContinuation,preparePostgraduateContinuation,postgraduateJobDue} from './academic-continuation';
import {schoolDuration,settleSchoolYear,graduateSchool} from './school-model';
import {settleFocusStats} from './focus-effects';
import {addKnowledge,settleLearningYear} from './learning-state';
import {learningContext} from './learning-context';
import {fixedDecisionAt} from './decision-ages';
import {advanceYearTimeline,planYearTimeline} from './year-timeline';
import {newFeedState,planAnnualFeed,fireNextFeed,type FeedCandidate} from './annual-feed';
import {custodyFeedCandidates} from './custody-feed';
import { childcareChoices, hasLocalYoungChild, localPartnerPresent } from './childcare';
import { parseDescendantDecision, refreshScheduledFamilyDecisions, FAMILY_LIMITS, addChildProgress, emptyDescendants, familyMembers, householdPartners, migrateDependents, nextDescendantDecision, resolveDescendantDecision, yearlyDescendants } from './descendants';
import { emptyHealthcare,FOLLOWUP_TREATMENTS,HEALTH_TREATMENTS,healthDecisionKey,treatmentCost } from './health';
export { emptyHealthcare, getHealthSummary, treatmentCost } from './health';
export {hobbySearchAvailable,hobbySearchPrice} from './hobby-runtime';
import { getCountries } from './countries';
import type { Allocation,Budget,Country,DailyTheme,Decision,Era,EventKind,EventParams,Focus,HealthEpisode,HealthTreatment,HobbyId,Job,Life,Person,PetKind,Religion,Settings,Sex,SpendingCategory,Stats,Trajectory } from './types';
export type * from './types';
export { ENGINE_MESSAGES } from './messages';

export const DEFAULT_SETTINGS: Settings = {
  weightMode: 'births', era: 'today', duration: 60,
  gentler: false, classroom: false, autoChoices: false,
};
export const FOCUSES: Focus[] = ['balanced', 'health', 'knowledge', 'career', 'relationships', 'creativity'];
export const ALLOCATIONS: Allocation[] = ['cash', 'bonds', 'balanced', 'stocks', 'business'];
export const REFLECTION_AGES = [5, 15, 30, 50, 70];
export const HOBBIES: HobbyId[] = ['reading', 'music', 'sport', 'art', 'craft', 'nature'];
export const TEMPERAMENTS = ['curious', 'sociable', 'careful', 'energetic'] as const;
export const PET_KINDS:PetKind[]=['dog','cat','parrot','rabbit','fish'];
export const SPENDING_CATEGORIES:SpendingCategory[]=['health','education','experiences','giving','family'];
export function getDailyTheme(day=new Date().toISOString().slice(0,10)):DailyTheme {
  const timestamp=Date.parse(day);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==day)throw new Error('Invalid theme date.');
  const offset=Math.floor((timestamp-Date.UTC(2026,9,20))/86400000);
  return {id:(['safeRoads','learning','kindness','freshAir'] as const)[((offset%4)+4)%4],day};
}
export function emptyBudget(): Budget { return { income: 0, tax: 0, food: 0, housing: 0, transport: 0, health: 0, leisure: 0, education: 0, dependents: 0, totalExpenses: 0, annualSavings: 0 }; }
const countries = getCountries();
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 100) / 100;

/** Mulberry32, with all mutable random state explicitly owned by the save. */
function random(state: { rng: number }): number {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let value = state.rng;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}
function pick<T>(state: { rng: number }, values: readonly T[]): T { return values[Math.floor(random(state) * values.length)]; }
function weightedCountry(state: { rng: number }, settings: Settings): Country {
  const explicit = countries.find(country => country.id === settings.country);
  if (explicit) return { ...explicit };
  const field = settings.weightMode === 'population' ? 'pop' : 'births';
  const weights = countries.map(c => settings.weightMode === 'equal' ? 1 : c[field]);
  let draw = random(state) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < countries.length; i++) { draw -= weights[i]; if (draw < 0) return { ...countries[i] }; }
  return { ...countries[countries.length - 1] };
}

interface Table { q: number[]; survival: number[]; expectancy: number }
const tableCache = new Map<string, Table>();
function table(country: Country, sex: Sex): Table {
  const key = [country.id, country.le, country.gap, country.u5, country.im, sex].join(':');
  const cached = tableCache.get(key);
  if (cached) return cached;
  // Infant/under-five hazards and a calibrated Gompertz–Makeham adult curve.
  // Adapted from the MIT born-somewhere reference, with terminal-year calibration.
  const target = country.le + country.gap * (sex === 'F' ? 0.49 : -0.51);
  const sexFactor = sex === 'F' ? 0.92 : 1.08;
  const q0 = clamp(country.im / 1000 * sexFactor, 0.00001, 0.25);
  const under5 = clamp(country.u5 / 1000 * sexFactor, q0 + 0.00005, 0.35);
  const childHazard = -Math.log((1 - under5) / (1 - q0));
  const firstYears = [q0, ...[0.4, 0.27, 0.19, 0.14].map(w => 1 - Math.exp(-childHazard * w))];
  const makeham = 0.00025 + 0.000028 * country.u5;
  const growth = clamp(0.112 - 0.00016 * country.u5, 0.085, 0.112);
  const build = (b: number): Table => {
    const q = Array.from({ length: 111 }, (_, age) => age < 5 ? firstYears[age] : age === 110 ? 1 : -Math.expm1(-(makeham + b * Math.exp(growth * (age + 0.5)))));
    const survival = [1];
    let expectancy = 0;
    for (let age = 0; age <= 110; age++) {
      const deaths = survival[age] * q[age];
      expectancy += survival[age] - (age === 0 ? 0.85 : 0.5) * deaths;
      survival.push(survival[age] * (1 - q[age]));
    }
    return { q, survival, expectancy };
  };
  let low = Math.log(1e-10), high = Math.log(0.1);
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (build(Math.exp(mid)).expectancy > target) low = mid; else high = mid;
  }
  const result = build(Math.exp((low + high) / 2));
  tableCache.set(key, result);
  return result;
}
export function lifeTable(country: Country, sex: Sex): Table {
  const result = table(country, sex);
  return { q: [...result.q], survival: [...result.survival], expectancy: result.expectancy };
}

// Compact independently assembled regional name pools; names are data, never HTML.
const namePools: Record<string, [string[], string[], string[]]> = {
  en: [['Oliver', 'James', 'Noah', 'Ethan', 'Samuel', 'Leo'], ['Amelia', 'Olivia', 'Grace', 'Maya', 'Emma', 'Sophie'], ['Morgan', 'Taylor', 'Wilson', 'Brown', 'Clarke', 'Reed']],
  fr: [['Louis', 'Gabriel', 'Hugo', 'Jules', 'Adam', 'Arthur'], ['Louise', 'Alice', 'Jade', 'Camille', 'Inès', 'Lina'], ['Martin', 'Bernard', 'Dubois', 'Laurent', 'Moreau', 'Petit']],
  de: [['Felix', 'Leon', 'Paul', 'Lukas', 'Jonas', 'Elias'], ['Hannah', 'Emilia', 'Mia', 'Lena', 'Clara', 'Anna'], ['Müller', 'Schmidt', 'Weber', 'Fischer', 'Wagner', 'Becker']],
  es: [['Mateo', 'Santiago', 'Diego', 'Daniel', 'Lucas', 'Javier'], ['Sofía', 'Lucía', 'Valentina', 'Isabella', 'Camila', 'Elena'], ['García', 'Rodríguez', 'López', 'Martínez', 'Hernández', 'Pérez']],
  pt: [['João', 'Miguel', 'Pedro', 'Gabriel', 'Lucas', 'Rafael'], ['Maria', 'Ana', 'Sofia', 'Beatriz', 'Clara', 'Luiza'], ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa']],
  ar: [['Omar', 'Yusuf', 'Adam', 'Ali', 'Ibrahim', 'Amir'], ['Maryam', 'Fatima', 'Layla', 'Nour', 'Amira', 'Salma'], ['Hassan', 'Ahmed', 'Khalil', 'Mansour', 'Saleh', 'Nasser']],
  hi: [['Aarav', 'Arjun', 'Rohan', 'Vihaan', 'Aditya', 'Dev'], ['Anaya', 'Diya', 'Ishita', 'Kavya', 'Meera', 'Asha'], ['Sharma', 'Patel', 'Singh', 'Kumar', 'Das', 'Rao']],
  zh: [['伟', '浩宇', '明', '俊杰', '子轩', '宇航'], ['欣怡', '雨桐', '雅婷', '静', '子涵', '佳怡'], ['王', '李', '张', '刘', '陈', '林']],
  ja: [['Haruto', 'Ren', 'Yuto', 'Sota', 'Minato', 'Riku'], ['Yui', 'Aoi', 'Hana', 'Sakura', 'Rin', 'Mei'], ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito']],
  ko: [['Min-jun', 'Seo-jun', 'Ji-ho', 'Do-yun', 'Jun-seo', 'Ha-jun'], ['Seo-yeon', 'Ji-woo', 'Ha-eun', 'Min-seo', 'Su-bin', 'Ji-a'], ['Kim', 'Lee', 'Park', 'Choi', 'Jeong', 'Kang']],
  vi: [['Minh', 'Huy', 'Nam', 'Duc', 'Khoa', 'An'], ['Linh', 'Thao', 'Trang', 'Mai', 'Ngoc', 'Huong'], ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu']],
  th: [['Arthit', 'Niran', 'Somchai', 'Chai', 'Anan', 'Kiet'], ['Mali', 'Anong', 'Siriporn', 'Nok', 'Dara', 'Kanya'], ['Saetang', 'Wongchai', 'Srisai', 'Saengchan', 'Thongdee', 'Chaiyaporn']],
  ru: [['Alexander', 'Dmitri', 'Ivan', 'Mikhail', 'Alexei', 'Nikolai'], ['Anastasia', 'Maria', 'Sofia', 'Anna', 'Daria', 'Elena'], ['Ivanov', 'Petrov', 'Smirnov', 'Volkov', 'Sokolov', 'Popov']],
  tr: [['Yusuf', 'Emir', 'Kerem', 'Ali', 'Arda', 'Deniz'], ['Zeynep', 'Elif', 'Defne', 'Ada', 'Meryem', 'Ece'], ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız']],
  id: [['Budi', 'Adi', 'Rizky', 'Dimas', 'Agus', 'Arif'], ['Siti', 'Dewi', 'Putri', 'Ayu', 'Intan', 'Nur'], ['Pratama', 'Saputra', 'Wijaya', 'Santoso', 'Hidayat', 'Nugroho']],
  ssa: [['Kofi', 'Kwame', 'Amadou', 'Moussa', 'Ibrahim', 'Emmanuel'], ['Amina', 'Fatou', 'Ama', 'Abena', 'Grace', 'Mariam'], ['Mensah', 'Diallo', 'Traoré', 'Diop', 'Kamara', 'Okafor']],
};
function personName(state: { rng: number }, country: Country, sex: Sex): string {
  const group = country.id === 'CHN' || country.id === 'TWN' || country.id === 'HKG' || country.id === 'MAC' ? 'zh'
    : country.id === 'IND' || country.id === 'NPL' ? 'hi'
    : country.id === 'JPN' ? 'ja' : country.id === 'KOR' || country.id === 'PRK' ? 'ko'
    : country.id === 'VNM' ? 'vi' : country.id === 'THA' ? 'th'
    : country.id === 'BRA' || country.id === 'PRT' ? 'pt'
    : country.id === 'DEU' || country.id === 'AUT' || country.id === 'CHE' ? 'de'
    : country.id === 'TUR' ? 'tr' : country.id === 'IDN' ? 'id'
    : country.id === 'RUS' || country.id === 'BLR' || country.id === 'UKR' ? 'ru'
    : namePools[country.lang] ? country.lang : country.region === 'ssa' ? 'ssa'
    : country.region === 'mena' ? 'ar' : country.region === 'lac' ? 'es' : 'en';
  const pool = namePools[group];
  const first = pick(state, pool[sex === 'M' ? 0 : 1]);
  const last = pick(state, pool[2]);
  return group === 'zh' ? last + first : ['ko', 'vi'].includes(group) ? `${last} ${first}` : `${first} ${last}`;
}
function religion(state: { rng: number }, country: Country): Religion {
  const map: Record<string, Religion> = { C: 'christianity', M: 'islam', H: 'hinduism', B: 'buddhism', J: 'judaism', F: 'folk', O: 'other', N: 'none' };
  const groups = country.rel.split(',').map(s => ({ type: map[s[0]] || 'other', weight: Number(s.slice(1)) || 0 }));
  let roll = random(state) * groups.reduce((sum, group) => sum + group.weight, 0);
  for (const group of groups) { roll -= group.weight; if (roll < 0) return group.type; }
  return 'none';
}
function jobFor(state: { rng: number }, country: Country, education: number): Job {
  if (education >= 4) return pick(state, ['teacher', 'nurse', 'engineer']);
  if (education === 3) return 'artisan';
  return random(state) < country.agr / 100 ? 'farmer' : 'service';
}
function person(life: Life, role: string, age: number, sex: Sex): Person {
  return { id: `${role}-${life.rng.toString(36)}`, name: personName(life, life.country, sex), sex, country: life.country.id, citizenship:life.country.id, age,
    birthYear: life.year - age, alive: true, deathAge: null, job: age >= 18 ? jobFor(life, life.country, 2) : 'none' };
}
function event(life: Life, key: string, kind: EventKind, icon: string, params: EventParams = {}) {
  const last = Number(life.events.at(-1)?.id.split('-').at(-1) ?? -1);
  let sequence = Number.isSafeInteger(last) && last < Number.MAX_SAFE_INTEGER - 2000 ? last + 1 : life.events.length;
  while (life.events.some(e => e.id === `${life.id}-${sequence}`)) sequence++;
  life.events.push({ id: `${life.id}-${sequence}`, age: life.age, year: life.year, key, kind, icon, params });
  if (life.events.length > 1500) life.events.splice(1, life.events.length - 1500);
}
function trajectory(life: Life): Trajectory {
  const { health, happiness, knowledge, social, netAssets } = life.stats;
  const ledger = life.timeline?.focusTime;
  const total = ledger ? Object.values(ledger).reduce((sum, time) => sum + time, 0) : 0;
  const prior = life.history?.at(-1);
  const recordedFocus = prior?.age === life.age && prior.annual?.completed !== undefined
    ? {completed: prior.annual.completed, ...(prior.annual.focusWeights !== undefined ? {focusWeights: prior.annual.focusWeights} : {})} : {};
  const focusRecord = ledger ? {completed: life.timeline!.complete,
    focusWeights: life.timeline!.complete ? Object.fromEntries(Object.entries(ledger).map(([focus,time]) => [focus,total > 0 ? time / total : 0])) : null} : recordedFocus;
  const stageLedger = life.timeline?.stageFocusTime;
  const stageTotal = stageLedger ? Object.values(stageLedger).reduce((sum,time) => sum + time,0) : 0;
  const stageRecord = stageLedger ? {completed: life.timeline!.complete, stageFocusWeights: life.timeline!.complete
    ? Object.fromEntries(Object.entries(stageLedger).filter(([,time]) => time > 0).map(([focus,time]) => [focus,time / stageTotal])) : null}
    : prior?.age === life.age && prior.annual?.stageFocusWeights !== undefined ? {stageFocusWeights:prior.annual.stageFocusWeights} : {};
  return { age: life.age, health, happiness, knowledge, social, netAssets, annual: {
    ...focusRecord, ...stageRecord,
    ...(life.academics ? {academic:{qualification:life.academics.qualification,doctorate:life.academics.doctorate}} : {}),
    country: life.country.id, job: life.stats.job, employment: life.stats.employment, education: life.stats.education,
    focus: life.focus, allocation: life.allocation, personalIncome: life.stats.annualIncome, income: life.budget.income, totalExpenses: life.budget.totalExpenses,
    annualSavings: life.budget.annualSavings, savings: life.stats.savings, investments: life.stats.investments, debt: life.stats.debt,
    partner: householdPartners(life).some(partner => partner.alive), children: life.family.children.length,
    childrenAlive: life.family.children.filter(person => person.alive).length,
    relativesAlive: familyMembers(life).filter(person => person.alive).length,
    grandchildren: life.year >= life.descendants.observedSince ? life.descendants.grandchildren.length : null,
    ...Object.fromEntries(['greatGrandchildren','greatGreatGrandchildren'].flatMap(key => {
      const people = life.descendants[key as 'greatGrandchildren' | 'greatGreatGrandchildren'] ?? [];
      const known = life.descendants.laterObservedSince !== undefined && life.year >= life.descendants.laterObservedSince;
      return [[key,known ? people.length : null],[`${key}Alive`,known ? people.filter(p=>p.alive).length : null]];
    })),
    grandchildrenAlive: life.year >= life.descendants.observedSince ? life.descendants.grandchildren.filter(p => p.alive).length : null,
  } };
}
function recordCareer(life: Life) {
  const job = life.stats.job;
  if (WORK_JOB_IDS.includes(job) && life.career.at(-1)?.job !== job) life.career.push({ age: life.age, job });
}
function normalize(life: Life) {
  refreshEducationContext(life);refreshNewFocus(life);
  recordCareer(life);
  for (const key of ['health', 'happiness', 'knowledge', 'social'] as const) life.stats[key] = round(clamp(life.stats[key]));
  for (const key of ['savings', 'investments', 'annualIncome'] as const) life.stats[key] = round(clamp(life.stats[key], 0, 1e12));
  life.stats.debt = round(clamp(life.stats.debt, 0, 1e12));
  life.stats.netAssets = round(life.stats.savings + life.stats.investments + life.belongings.housingValue - life.stats.debt);
  refreshScheduledFamilyDecisions(life);
  refreshScheduledPhysicalEquipment(life);
}
function updateCurrentHistory(life: Life) {
  normalize(life);
  life.history[life.history.length - 1] = trajectory(life);
}
function normalizedSettings(settings: Settings): Settings {
  let themeDay=new Date().toISOString().slice(0,10);
  try { themeDay=getDailyTheme(settings.dailyThemeDay).day; } catch { /* Invalid optional settings use today's theme. */ }
  return {
    weightMode: ['births', 'population', 'equal'].includes(settings.weightMode) ? settings.weightMode : 'births',
    era: ['past', 'today', 'future', 'random'].includes(settings.era) ? settings.era : 'today',
    duration: [30, 60, 90].includes(settings.duration) ? settings.duration : 60,
    gentler: settings.gentler === true, classroom: settings.classroom === true, autoChoices: settings.autoChoices === true,
    ...(countries.some(c => c.id === settings.country) ? { country: settings.country } : {}),
    ...(countries.some(c => c.id === settings.realCountry) ? { realCountry: settings.realCountry } : {}),
    dailyThemeDay:themeDay,
  };
}
function eraIncome(era: Era) { return era === 'past' ? 0.65 : era === 'future' ? 1.35 : 1; }

export function createLife(settings: Settings = DEFAULT_SETTINGS, seed?: number): Life {
  const supplied = Number.isFinite(seed) ? seed! : globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? Date.now();
  const initial = supplied >>> 0;
  const rng = { rng: initial };
  const normalized = normalizedSettings(settings);
  const era = normalized.era === 'random' ? pick(rng, ['past', 'today', 'future'] as const) : normalized.era;
  const country = weightedCountry(rng, normalized);
  const sex: Sex = random(rng) < 0.5 ? 'M' : 'F';
  const name = personName(rng, country, sex);
  const quintile = 1 + Math.floor(random(rng) * 5);
  const birthYear = era === 'past' ? 1990 : era === 'future' ? 2080 : 2026;
  const stats: Stats = {
    health: 95, happiness: 65 + random(rng) * 20, knowledge: 5, social: 40 + random(rng) * 25,
    education: 0, netAssets: 0, savings: country.ppp * [0.005, 0.015, 0.04, 0.09, 0.2][quintile - 1] * eraIncome(era), investments: 0, annualIncome: 0, debt: 0,
    employment: 'none', job: 'none', incomeQuintile: quintile,
    birthPlaceType: random(rng) < country.urb / 100 ? 'urban' : 'rural', religion: religion(rng, country),
  };
  const life: Life = {
    version: 1, id: `${country.id}-${initial.toString(36)}-${rng.rng.toString(36)}`, seed: initial, rng: rng.rng,
    settings: normalized, era, country, name, sex, age: 0, year: birthYear, birthYear,
    certificate: `${country.id}-${birthYear}-${String(initial % 10_000_000).padStart(7, '0')}`,
    alive: true, deathAge: null, cause: null, stats,
    family: { parents: [], siblings: [], partner: null, children: [], married: false, marriageAge: null }, companions: [], events: [], history: [],
    pendingDecision: null, focus: 'balanced', allocation: 'cash', reflections: {}, conditions: [], decisions: [],
    mechanicsVersion: 7, descendants: emptyDescendants(initial, birthYear), career: [], occupationExperience:{version:1,sinceYear:birthYear,years:{},unclassifiedYears:0}, healthcare: emptyHealthcare(), temperament: { kind: 'undecided', settled: false }, talents: [], hobbies: [],
    schooling: { enrolled: false, droppedOut: false, years: 0, childLabor: false }, budget: emptyBudget(),
    belongings: { phone: false, transport: 'none', housing: 'family', housingValue: 0 }, residence: stats.birthPlaceType, jobOffers: [],
    training: { kind: null, endsAt: null, previousIncome: 0, previousJob: 'none' }, justice: { prisonUntil: null },
    relationship: { status: 'single', childPlan: 'open', nextChildDecisionAge: 24, partnerIncome: 0 },
    care: { until: null, who: null, previousIncome: 0, previousJob: 'none', previousPartnerIncome: 0, daycareUntil: null, handledChildren: [] },
    opportunities: { lastRiskAge: -10, lastDebtAge: -10, nextNightSchoolAge: 23, nextRelationshipAge: 22, moneylenderUntil: null },
    lifestyle:{diet:'balanced',insurance:'basic',gifts:'modest'},annualSpending:{health:0,education:0,experiences:0,giving:0,family:0},pets:[],dailyTheme:getDailyTheme(normalized.dailyThemeDay),
    migration:{birthCountry:{...country},offerCountry:null,lastMoveAge:null,familyCountry:null,moves:[]},
  };
  const developmentalRng={rng:(initial^0x6e647831)>>>0};
  life.birthDevelopment=drawBirthDevelopment(sex,educationEraInputs(country,era,birthYear).statistics.ppp,()=>random(developmentalRng));
  life.family.parents = [person(life, 'mother', 20 + Math.floor(random(life) * 18), 'F'), person(life, 'father', 22 + Math.floor(random(life) * 20), 'M')];
  const siblings = Math.min(5, Math.floor(random(life) * Math.max(1, country.tfr)));
  for (let i = 0; i < siblings; i++) life.family.siblings.push(person(life, `sibling-${i}`, 1 + Math.floor(random(life) * 10), random(life) < 0.5 ? 'M' : 'F'));
  for (let i = 0; i < 4; i++) {
    const c = weightedCountry(life, { ...normalized, country: undefined });
    const s = random(life) < 0.5 ? 'M' : 'F';
    life.companions.push({ id: `companion-${i}`, name: personName(life, c, s), country: c, sex: s, age: 0, alive: true, deathAge: null, cause: null,
      health: 95, happiness: 70, education: 0, job: 'none', lastJob: null, children: 0, netAssets: round(c.ppp * 0.04) });
  }
  normalize(life);
  life.history.push(trajectory(life));
  event(life, 'event.birth', 'birth', '✦', { name: life.name });
  // A separate deterministic birth draw leaves unaffected birth identities and yearly RNG unchanged.
  const birthDraw = random({ rng: (initial ^ 0x45d9f3b) >>> 0 });
  const birthHazard = mortality(country, sex, 0, era);
  const birthIncidence = Math.max(0.07, birthHazard / 0.98);
  // Both screening outcomes consume the infant interval; all its risk is allocated here.
  life.healthcare.lastCheckedAge = 0;
  if (birthDraw < birthIncidence) {
    beginHealthEpisode(life, 'self', 'premature', 'neonatal', birthHazard / birthIncidence);
    updateCurrentHistory(life);
  }
  return life.settings.autoChoices && life.pendingDecision ? automaticDecision(life) : life;
}

/** Health and mortality share one annual checkpoint. Resolving care never rerolls that year. */
function beginHealthEpisode(life: Life, patientId: string, diagnosis: HealthEpisode['diagnosis'], level: HealthEpisode['level'], untreatedRisk: number) {
  const patient = patientId === 'self' ? null : life.family.children.find(child => child.id === patientId)!;
  const country = patient ? countries.find(country => country.id === patient.country)! : life.country;
  const patientAge = patient?.age ?? life.age;
  const access = clamp(0.3 + country.le / 180 + (life.residence === 'urban' ? 0.08 : -0.08) + life.stats.incomeQuintile * 0.025, 0.25, 0.95);
  const episode: HealthEpisode = {
    id: `health-${life.age}-${life.healthcare.episodes.length}`, patientId, patientName: patient?.name ?? life.name,
    patientAge, country: country.id, diagnosis, level, startedAge: life.age, status: 'awaiting', treatment: null,
    cost: 0, untreatedRisk: clamp(untreatedRisk * ((life.settings.gentler || life.settings.classroom) && patientAge < 50 ? 0.15 : 1), 0, 0.98), access,
    closedAge: null, recoveryUntil: null,
  };
  life.healthcare.episodes.push(episode); life.healthcare.activeEpisodeId = episode.id;
  const options = level === 'followup' ? FOLLOWUP_TREATMENTS : HEALTH_TREATMENTS;
  choice(life, episode.id, healthDecisionKey(level), options, { name: episode.patientName });
  life.pendingDecision!.choices.forEach(option => option.params = { amount: treatmentCost(life, episode, option.id) });
  if (level !== 'followup') {
    if (patientId === 'self') life.stats.health -= level === 'clinic' ? 7 : 18;
    life.stats.happiness -= level === 'clinic' ? 1 : 4;
  }
  event(life, level === 'neonatal' ? 'event.healthNeonatal' : level === 'icu' ? 'event.healthIcu' : level === 'followup' ? 'event.healthFollowup' : 'event.healthAdmission', 'health', '✚', { name: episode.patientName });
  updateCurrentHistory(life);
}
function checkHealthcare(life: Life) {
  const medical = life.healthcare;
  if (medical.lastCheckedAge !== life.age) {
    medical.lastCheckedAge = life.age;
    const roadFactor = life.dailyTheme.id === 'safeRoads' ? 1 - 0.4 * life.country.road / (life.country.road + 200) : 1;
    const hazard = mortality(life.country, life.sex, life.age, life.era, life.stats.health, life.conditions.length) * roadFactor;
    const draw = random(life);
    // At old ages the existing peaceful/age-related ending remains a possible outcome.
    if (life.age >= 85) {
      if (draw < hazard) { finish(life); return; }
    } else {
      const criticalIncidence = Math.max(hazard, 0.008 + Math.max(0, 65 - life.stats.health) * 0.003 + medical.chronic.length * 0.008);
      if (draw < criticalIncidence) {
        beginHealthEpisode(life, 'self', life.age === 0 ? 'premature' : life.age >= 40 ? 'cardiac' : 'infection', life.age === 0 ? 'neonatal' : 'icu', Math.min(0.98, hazard / criticalIncidence));
        return;
      }
      if (draw < criticalIncidence + 0.025) {
        beginHealthEpisode(life, 'self', life.age % 2 ? 'infection' : 'injury', 'clinic', 0);
        return;
      }
    }
  }
  for (const child of life.family.children.filter(child => child.alive && child.age < 18)) {
    if (medical.childChecks.some(check => check.id === child.id && check.age === life.age)) continue;
    medical.childChecks = medical.childChecks.filter(check => check.id !== child.id);
    medical.childChecks.push({ id: child.id, age: life.age });
    const country = countries.find(country => country.id === child.country)!;
    const hazard = mortality(country, child.sex, child.age, life.era);
    const incidence = Math.max(hazard, child.age === 0 ? 0.07 : 0.025);
    if (random(life) < incidence) {
      beginHealthEpisode(life, child.id, child.age === 0 ? 'premature' : 'infection', child.age === 0 ? 'neonatal' : 'hospital', Math.min(0.98, hazard / incidence));
      return;
    }
  }
  const review = medical.chronic.find(condition => condition.nextReviewAge <= life.age);
  if (review) beginHealthEpisode(life, 'self', 'chronic', 'followup', 0);
}
function resolveHealthcare(life: Life, treatment: HealthTreatment): Life {
  const medical = life.healthcare;
  const episode = medical.episodes.find(episode => episode.id === medical.activeEpisodeId)!;
  const cost = treatmentCost(life, episode, treatment), paid = Math.min(life.stats.savings, cost);
  life.stats.savings -= paid; life.stats.debt += cost - paid;
  medical.totalOutOfPocket = round(medical.totalOutOfPocket + cost);
  episode.cost = cost; episode.treatment = treatment; episode.closedAge = life.age;
  medical.activeEpisodeId = null; life.pendingDecision = null; life.decisions.push(episode.id);
  event(life, 'event.healthTreatment', 'health', '✚', { name: episode.patientName, amount: cost });
  if (episode.level === 'followup') {
    const condition = medical.chronic.find(condition => condition.nextReviewAge <= life.age)!;
    condition.managed = treatment === 'attendFollowup'; condition.nextReviewAge = life.age + (condition.managed ? 3 : 1);
    life.stats.health += condition.managed ? 4 : -3;
    episode.status = 'recovered';
    event(life, condition.managed ? 'event.healthManaged' : 'event.healthMissed', 'health', '✚');
  } else {
    const effectiveness = treatment === 'intensiveCare' ? 0.25 + (1 - episode.access) * 0.35 : treatment === 'localCare' ? 0.6 + (1 - episode.access) * 0.2 : 1;
    if (random(life) < episode.untreatedRisk * effectiveness) {
      episode.status = 'deceased';
      if (episode.patientId === 'self') {
        event(life, 'event.healthLoss', 'health', '◌', { name: episode.patientName });
        finish(life, episode.diagnosis === 'cardiac' ? 'cause.heart' : episode.diagnosis === 'premature' ? 'cause.infant' : episode.diagnosis === 'injury' ? 'cause.accident' : 'cause.infection');
      } else {
        const child = life.family.children.find(child => child.id === episode.patientId)!;
        child.alive = false; child.deathAge = child.age; life.stats.happiness -= 10;
        event(life, 'event.healthLoss', 'family', '◌', { name: child.name });
      }
    } else {
      episode.status = 'recovering'; episode.recoveryUntil = life.age + (treatment === 'intensiveCare' ? 1 : 2);
      if (episode.patientId === 'self') {
        life.stats.health += treatment === 'intensiveCare' ? 12 : treatment === 'localCare' ? 6 : 1;
        // Some serious illness leaves a long-term condition that requires future care.
        if (episode.level === 'icu' && medical.chronic.length < 4 && random(life) < 0.4) {
          const diagnosis = episode.diagnosis === 'cardiac' ? 'cardiac' : 'respiratory';
          if (!medical.chronic.some(condition => condition.diagnosis === diagnosis)) {
            medical.chronic.push({ id: `condition-${medical.chronic.length}`, diagnosis, diagnosedAge: life.age, managed: true, nextReviewAge: life.age + 3 });
            life.conditions.push('chronic');
            event(life, 'event.healthChronic', 'health', '✚');
          }
        }
      }
      life.stats.happiness += 2;
      event(life, 'event.healthDischarge', 'health', '♡', { name: episode.patientName });
    }
  }
  updateBudget(life); updateCurrentHistory(life);
  return life;
}
function yearlyRecovery(life: Life) {
  for (const episode of life.healthcare.episodes) {
    if (episode.status !== 'recovering' || episode.recoveryUntil === null || life.age < episode.recoveryUntil) continue;
    episode.status = 'recovered'; episode.recoveryUntil = null;
    const patientAlive = episode.patientId === 'self' ? life.alive : life.family.children.some(child => child.id === episode.patientId && child.alive);
    if (!patientAlive) continue;
    if (episode.patientId === 'self') life.stats.health += 6;
    event(life, 'event.healthRecovered', 'health', '🌿', { name: episode.patientName });
  }
  for (const condition of life.healthcare.chronic) life.stats.health -= condition.managed ? 0.3 : 2;
}

function mortality(country: Country, sex: Sex, age: number, era: Era, health = 85, conditions = 0): number {
  if (age >= 110) return 1;
  const base = table(country, sex).q[age];
  const eraFactor = era === 'past' ? 1.28 : era === 'future' ? 0.78 : 1;
  const healthFactor = age < 5 ? 1 : clamp(1 + (80 - health) * 0.012 + conditions * 0.15, 0.75, 2.4);
  return clamp(1 - (1 - base) ** (eraFactor * healthFactor), 0, 1);
}
function deathCause(life: Life, age = life.age, country = life.country): string {
  if (life.settings.gentler || life.settings.classroom) return 'cause.peaceful';
  if (age < 5) return 'cause.infant';
  if (age > 85) return 'cause.age';
  const weights = age < 40
    ? [['cause.accident', 20 + country.road], ['cause.infection', 8 + country.mal * 20 + country.hiv * 4], ['cause.conflict', country.war * 10], ['cause.illness', 15]] as const
    : [['cause.heart', 40], ['cause.cancer', 28], ['cause.infection', 5 + country.mal * 10], ['cause.accident', country.road / 2], ['cause.illness', 15]] as const;
  let draw = random(life) * weights.reduce((sum, item) => sum + item[1], 0);
  for (const item of weights) { draw -= item[1]; if (draw < 0) return item[0]; }
  return 'cause.illness';
}
function finish(life: Life, cause?: string) {
  if (!life.alive) return;
  life.alive = false; life.deathAge = life.age; life.cause = life.settings.gentler || life.settings.classroom ? 'cause.peaceful' : cause ?? deathCause(life); life.pendingDecision = null;
  event(life, 'event.death', 'death', '◌', { age: life.age });
  updateCurrentHistory(life);
}
function yearlyFamily(life: Life) {
  const relatives = [...life.family.parents, ...life.family.siblings, ...life.family.children, ...householdPartners(life)];
  for (const relative of relatives) {
    if (!relative.alive) continue;
    const age = relative.age, country=countries.find(country=>country.id===relative.country)??life.country;
    const medicallyChecked = life.healthcare.childChecks.some(check => check.id === relative.id && check.age === life.age - 1);
    if (!medicallyChecked && random(life) < mortality(country, relative.sex, age, life.era)) {
      relative.alive = false; relative.deathAge = age;
      if (relative === life.family.partner) {
        life.relationship.partnerIncome = 0;
        if (life.care.who === 'partner') { life.care.who = null; life.care.until = null; }
      }
      life.stats.happiness -= 5;
      event(life, 'event.familyDeath', 'family', '🕯', { name: relative.name });
      if(life.family.children.includes(relative)&&observeGuardianLoss(life,relative.id)==='otherParent')event(life,'event.guardianOtherParent','family','⌂',{name:relative.name});
    } else relative.age++;
  }
}
function yearlyCompanions(life: Life) {
  for (const companion of life.companions) {
    if (!companion.alive) continue;
    if (random(life) < mortality(companion.country, companion.sex, companion.age, life.era, companion.health)) {
      companion.alive = false; companion.deathAge = companion.age; companion.cause = deathCause(life, companion.age, companion.country);
      continue;
    }
    companion.age++;
    companion.health = round(clamp(companion.health + (random(life) - 0.5) * 5 - (companion.age > 50 ? 0.6 : 0)));
    companion.happiness = round(clamp(companion.happiness + (random(life) - 0.5) * 6));
    if (companion.age === 6) { companion.education = 1; companion.job = 'student'; }
    if (companion.age === 12) companion.education = 2;
    if (companion.age === 18) {
      companion.education = random(life) * 100 < companion.country.ter ? 4 : random(life) < 0.4 ? 3 : 2;
      companion.job = companion.education === 4 ? 'student' : jobFor(life, companion.country, companion.education);
    }
    if (companion.age === 22 && companion.job === 'student') companion.job = jobFor(life, companion.country, 4);
    if (companion.age > 22 && companion.age < 45 && random(life) < companion.country.tfr / 27 && companion.children < 6) companion.children++;
    if (!['none', 'student', 'retired'].includes(companion.job)) companion.lastJob = companion.job;
    if (companion.age === 65) companion.job = 'retired';
    if (companion.age >= 18 && companion.job !== 'student') {
      const multiplier = companion.education >= 4 ? 0.14 : 0.06;
      companion.netAssets = round(clamp(companion.netAssets * (1 + (random(life) - 0.4) * 0.06) + companion.country.ppp * multiplier * eraIncome(life.era), 0, 1e12));
    }
  }
}
function beginWork(life: Life, education: number) {
  life.stats.employment = 'employed';
  life.stats.job = jobFor(life, life.country, education);
  life.stats.annualIncome = life.country.ppp * eraIncome(life.era) * (education >= 4 ? 0.9 : education === 3 ? 0.6 : 0.38) * (0.8 + random(life) * 0.4);
}
/** Persist the paid/unpaid draw; retries and returning to this state never reroll it. */
function beginChildWork(life: Life, forcePaid = false) {
  const priorPaid = life.schooling.childWorkPaid ?? (life.schooling.childLabor && life.stats.job === 'farmer' ? life.stats.annualIncome > 0 : undefined);
  life.schooling.enrolled = false; life.schooling.droppedOut = true; life.schooling.childLabor = true;
  life.schooling.childWorkPaid = resolveChildWork(priorPaid, {
    region: life.country.region as Parameters<typeof resolveChildWork>[1]['region'],
    quintile: life.stats.incomeQuintile, war: life.country.war,
  }, forcePaid, () => random(life));
  life.stats.job = 'childwork';
  life.stats.employment = life.schooling.childWorkPaid ? 'employed' : 'none';
  settleChildWorkIncome(life);
}
function settleChildWorkIncome(life: Life) {
  const statistics = educationEraInputs(life.country, life.era, life.year).statistics;
  life.stats.annualIncome = childWorkIncome({...life.country, ppp: statistics.ppp}, life.schooling.childWorkPaid === true);
}
function updateBudget(life: Life) {
  const s = life.stats, b = emptyBudget();
  b.income = round(life.descendants.annualTransfers + s.annualIncome + (localPartnerPresent(life) && ['married', 'cohabiting'].includes(life.relationship.status) ? life.relationship.partnerIncome : 0));
  if (life.age < 18) {
    b.dependents = round(b.income * 0.75); // A working child's contribution to the household.
  } else {
    const base = life.country.ppp * eraIncome(life.era);
    const urban = life.residence === 'urban' ? 1.15 : 0.85;
    b.tax = round(b.income * (s.job === 'farmer' || s.job === 'artisan' || s.job === 'entrepreneur' ? 0.06 : 0.13));
    b.food = round(base * 0.055 * urban);
    if(life.lifestyle.diet==='healthy')b.food=round(b.food*1.35);
    if(life.lifestyle.diet==='convenient')b.food=round(b.food*0.85);
    b.housing = round(base * (life.belongings.housing === 'owned' ? 0.015 : life.belongings.housing === 'rent' ? 0.085 : 0.025) * urban);
    b.transport = round(base * (life.belongings.transport === 'car' ? 0.04 : life.belongings.transport === 'bicycle' ? 0.003 : 0.01));
    b.health = round(base * (0.012 + life.country.oop / 100 * 0.018) * (life.conditions.length ? 1.5 : 1));
    if(life.lifestyle.insurance==='full')b.health=round(b.health*0.6+base*0.025);
    b.leisure = round(base * 0.012 + b.income * 0.025);
    b.leisure+=round(annualHobbyCost(life));
    b.leisure+=round(base*(life.lifestyle.gifts==='generous'?0.01:life.lifestyle.gifts==='modest'?0.004:0));
    b.education = life.justice.prisonUntil === null && (life.schooling.enrolled || life.training.kind === 'nightSchool') ? round(base * 0.04) : 0;
    b.dependents = round(life.family.children.filter(c => c.alive && c.age < 18 && c.country === physicalCountry(life) && life.descendants.children.some(state => state.childId === c.id && state.residence === 'home')).length * base * 0.035);
    b.dependents+=round(life.descendants.grandchildren.filter(g=>!guardianArrangement(life,g.id)&&g.alive&&g.age<18&&g.residence==='home'&&g.country===physicalCountry(life)&&life.descendants.children.some(c=>c.childId===g.parentId&&c.residence==='home')).length*base*0.035);
    b.dependents+=round(guardianAnnualCost(life));
    b.dependents+=round(life.pets.filter(pet=>pet.alive).length*base*0.002);
    if (life.care.daycareUntil !== null && life.age < life.care.daycareUntil && hasLocalYoungChild(life)) b.dependents += round(base * 0.035);
    if (life.justice.prisonUntil !== null) { b.housing = 0; b.food = 0; b.transport = 0; b.leisure = 0; }
  }
  b.income = round(b.income + annualCraftIncome(life));
  b.totalExpenses = round(b.tax + b.food + b.housing + b.transport + b.health + b.leisure + b.education + b.dependents);
  b.annualSavings = round(b.income - b.totalExpenses);
  life.budget = b;
}
/** Settle only time actually registered by active timeline ticks; legacy years lack this ledger. */
function applyYearFocus(life: Life, time: Partial<Record<Focus, number>>, total: number) {
  const s = life.stats, weight = (focus: Focus) => (time[focus] ?? 0) / total;
  s.health += 1.4 * weight('health') + .3 * weight('balanced');
  addKnowledge(life, 1.5 * weight('knowledge') + .5 * weight('creativity'));
  s.social += 1.7 * weight('relationships');
  s.happiness += .8 * weight('relationships') + 1.3 * weight('creativity') + .3 * weight('balanced');
  if (s.employment === 'employed' && s.job !== 'childwork') { s.annualIncome *= 1 + .025 * weight('career'); s.happiness -= .8 * weight('career'); }
}
function yearlyFinance(life: Life) {
  settleOccupationExperience(life);
  const s = life.stats;
  if(prepareMilitaryPensionRuntime(life)&&s.employment!=='retired') {
    const employment=life.academics!.academy!.employment!;
    event(life,'event.militaryPensionStarted','career','◦',{years:employment.career!.experienceYears,amount:employment.pension!.value/12});
  }
  if(indexMilitaryPensionRuntime(life))event(life,'event.pensionIncreased','career','↗');
  settleDepartedOfficerIncome(life);
  settleRetiredOfficerIncome(life);
  if (life.schooling.childLabor && !life.schooling.enrolled && s.job === 'farmer') beginChildWork(life);
  if (s.job === 'childwork') settleChildWorkIncome(life);
  const ranges: Record<Allocation, [number, number]> = { cash: [0, 0.008], bonds: [-0.015, 0.065], balanced: [-0.12, 0.22], stocks: [-0.23, 0.33], business: [-0.3, 0.43] };
  const [low, high] = ranges[life.allocation];
  s.investments *= 1 + low + random(life) * (high - low);
  s.savings *= 1.008;
  s.debt *= life.opportunities.moneylenderUntil !== null && life.age <= life.opportunities.moneylenderUntil ? 1.16 : 1.04;
  observeNaturalOfficerFinance(life);
  const officerSettled=settleOfficerRuntime(life,()=>random(life));
  settleOfficerRecovery(life);
  if(officerSettled&&life.academics?.academy?.employment?.healthExit?.age===life.age&&s.job==='none')event(life,'event.officerHealthExit','health','◦');
  if (!officerSettled && life.age >= 18 && s.employment === 'employed' && s.job !== 'childwork' && !life.training.kind && life.justice.prisonUntil === null && life.care.who !== 'self') {
    if (random(life) < 0.02 && life.age < 60) {
      s.employment = 'unemployed'; s.job = 'none'; s.annualIncome = 0;
      settleDepartedOfficerIncome(life);
      event(life, 'event.jobLoss', 'career', '↘');
      if (life.family.partner?.alive && life.relationship.partnerIncome > 0) {
        event(life, 'event.spouseSupport', 'family', '♡', { name: life.family.partner.name });
      }
    } else if (random(life) < (life.focus === 'career' ? 0.18 : 0.07)) {
      s.annualIncome *= 1.08 + random(life) * 0.1; addKnowledge(life, 1);
      event(life, 'event.promotion', 'career', '↗');
    } else s.annualIncome *= 1.015;
  }
  updateBudget(life);
  let remaining = s.savings + life.budget.annualSavings;
  if (remaining < 0) {
    const withdraw = Math.min(s.investments, -remaining);
    s.investments -= withdraw; remaining += withdraw;
    if (remaining < 0) { s.debt += -remaining; s.happiness -= 2; s.health -= 0.5; }
  }
  s.savings = Math.max(0, remaining);
  if (s.debt > 0 && s.savings > 0) { const repaid = Math.min(s.debt, s.savings * 0.3); s.savings -= repaid; s.debt -= repaid; }
  if (life.age >= 18 && life.allocation !== 'cash' && s.savings > life.country.ppp * 0.1) {
    const amount = Math.min(s.savings, Math.max(0, s.annualIncome * 0.08));
    s.savings -= amount; s.investments += amount;
  }
  if(life.age>=18&&life.justice.prisonUntil===null)for(const category of SPENDING_CATEGORIES) {
    const amount=life.annualSpending[category];
    if(amount>0&&s.savings>=amount*3)applySpending(life,category,amount);
  }
}
function choice(life: Life, id: string, key: string, ids: string[], params: EventParams = {}) {
  if (life.decisions.includes(id)) return;
  life.pendingDecision = { id, type: 'choice', age: life.age, key, params, choices: ids.map(id => ({ id, key: `choice.${id}`, params: {} })) };
}
function milestones(life: Life) {
  const age = life.age, s = life.stats;
  if (age === 1) event(life, 'event.firstSteps', 'milestone', '🌱');
  if (age === 2) choice(life, 'temperament', 'decision.temperament', [...TEMPERAMENTS]);
  if (age === 3) event(life, 'event.play', 'milestone', '☀');
  if (age === 5) { life.temperament.settled = true; event(life, 'event.temperament', 'milestone', '✧'); }
  {const supported=prepareSupportedSchool(life,()=>random(life));if(supported)event(life,`event.supportedSchool.${supported}`,'milestone','🎒');}
  {const supported=prepareSupportedAdult(life,()=>random(life));if(supported)event(life,`event.supportedAdult.${supported.kind}`,'career','◦');}
  if(age===5||age===6){const result=preparePrimaryRuntime(life,()=>random(life),()=>beginChildWork(life));if(result)event(life,`event.primary.${result}`,'milestone','🎒');}
  if (age === 6) {
    life.talents = [pick(life, HOBBIES)];
    const extra = pick(life, HOBBIES);
    if (extra !== life.talents[0] && random(life) < 0.35) life.talents.push(extra);
    event(life, 'event.talent', 'milestone', '✧');
    if (!life.academics) {
    const access = clamp(life.country.eys / 18 + s.incomeQuintile * 0.055 + (life.residence === 'urban' ? 0.12 : 0), 0.35, 0.99);
    life.schooling.enrolled = random(life) < access;
    life.schooling.droppedOut = !life.schooling.enrolled;
    if (life.schooling.enrolled) { s.education = 1; s.employment = 'student'; s.job = 'student'; event(life, 'event.school', 'milestone', '🎒'); }
    else { beginChildWork(life); event(life, 'event.noSchool', 'milestone', '◦'); }
    }
  }
  if (age === 7 && life.academics?.origin!=='birth') {
    choice(life, 'hobby', 'decision.hobby', ['reading', 'music', 'sport', 'art']);
    life.pendingDecision?.choices.forEach(c => c.key = `hobby.${c.id}`);
  }
  if(primaryReturnEligible(life))choice(life,'school','decision.school',['returnSchool','helpFamily']);
  if (!life.academics && age === 8 && (!life.schooling.enrolled || (s.incomeQuintile <= 2 && random(life) < Math.max(0, 0.2 - life.country.eys * 0.01)))) {
    beginChildWork(life);
    choice(life, 'school', 'decision.school', ['returnSchool', 'helpFamily']);
  }
  if (!life.academics && age > 8 && age < 15 && life.schooling.enrolled && s.incomeQuintile === 1 && random(life) < Math.max(0, (13 - life.country.eys) * 0.012)) {
    beginChildWork(life);
    event(life, 'event.childLabor', 'career', '◦');
  }
  if (!life.academics && age === 12 && life.schooling.enrolled) { s.education = 2; event(life, 'event.secondary', 'milestone', '📚'); }
  if (age === 16 && life.residence === 'rural') choice(life, 'relocation', 'decision.relocation', ['move', 'stay']);
  if (!life.academics && age === 18 && life.justice.prisonUntil === null) {
    event(life, 'event.graduate', 'milestone', '🎓');
    choice(life, 'education', 'decision.education', ['university', 'vocational', 'work']);
  }
  const university = life.schooling.university;
  if (!life.academics && university && life.justice.prisonUntil === null && life.schooling.enrolled && s.employment === 'student' && age > university.lastProgressAge && university.completedYears < 4) {
    university.completedYears++;
    university.lastProgressAge = age;
    if (university.completedYears === 4) {
      s.education = Math.max(4, s.education);
      life.schooling.enrolled = false;
      beginWork(life, s.education);
      event(life, 'event.degree', 'career', '🎓');
    }
  }
  // Existing saves without course progress retain their legacy completion schedule.
  if (!life.academics && !university && life.justice.prisonUntil === null && age === 22 && s.employment === 'student') { life.schooling.enrolled = false; beginWork(life, s.education); event(life, 'event.degree', 'career', '🎓'); }
  if (age === 25) choice(life, 'opportunity', 'decision.opportunity', ['ambition', 'stability']);
  if (age === 21 && !life.family.partner) {
    // The prospective person's name is generated once and stays in decision params.
    const name = personName(life, life.country, life.sex === 'M' ? 'F' : 'M');
    choice(life, 'relationship', 'decision.relationship', ['partner', 'independent'], { name });
  }
  if (age === 40) choice(life, 'balance', 'decision.balance', ['family', 'explore', 'health']);
  if (age > 32 && life.family.partner?.alive && random(life) < 0.009 && s.social < 65) {
    event(life, 'event.separation', 'family', '◦', { name: life.family.partner.name });
    life.family.partner = null; life.family.married = false; life.relationship.status = 'single'; life.relationship.partnerIncome = 0; s.happiness -= 6;
    if(life.care.who==='partner'){life.care.who=null;life.care.until=null;}
  }
  if (age === 65 && s.employment !== 'retired') {
    s.employment = 'retired'; s.job = 'retired';
    // An existing military entitlement survives the legacy retirement transition.
    s.annualIncome = Math.max(s.annualIncome * 0.3, life.country.ppp * eraIncome(life.era) * 0.07, life.academics?.academy?.employment?.pension?.value ?? 0);
    event(life, 'event.retirement', 'milestone', '🌅');
  }
  if (REFLECTION_AGES.includes(age) && life.reflections[String(age)] === undefined) {
    life.pendingDecision = { id: `reflection-${age}`, type: 'reflection', age, key: `decision.reflection.${age}`, params: {}, choices: [
      { id: 'reflect', key: 'choice.reflect', params: {} }, { id: 'skip', key: 'choice.skip', params: {} },
    ] };
  }
}
function feedCandidates(life: Life): FeedCandidate[] {
  const age = life.age, s = life.stats;
  const pool: [string, 'health' | 'happiness' | 'knowledge' | 'social', number, string][] = age < 6
    ? [['event.play', 'happiness', 2, '☀'], ['event.familyTime', 'social', 2, '♡'], ['event.discovery', 'knowledge', 2, '✧']]
    : age < 23 ? [['event.study', 'knowledge', 3, '📖'], ['event.friendship', 'social', 3, '♡'], ['event.exercise', 'health', 2, '🌿'], ['event.creativity', 'happiness', 3, '✧'], ['event.challenge', 'happiness', -3, '◦']]
    : age < 65 ? [['event.friendship', 'social', 2, '♡'], ['event.exercise', 'health', 2, '🌿'], ['event.familyTime', 'happiness', 3, '☀'], ['event.discovery', 'knowledge', 2, '✧'], ['event.challenge', 'happiness', -3, '◦'], ['event.quiet', 'happiness', 1, '◦'], ['event.travel', 'knowledge', 2, '↗']]
    : [['event.mentoring', 'social', 3, '✧'], ['event.garden', 'happiness', 2, '🌿'], ['event.legacy', 'happiness', 1, '◌'], ['event.familyTime', 'social', 3, '♡'], ['event.quiet', 'happiness', 1, '◦']];
  // Transitional legacy narratives remain explicitly identified until their original registry counterparts are audited.
  const candidates: FeedCandidate[] = pool.map(([key, stat, delta, icon]) => ({
    id: `legacy_${key.slice(6).replace(/[A-Z]/g,letter=>`_${letter.toLowerCase()}`)}`,
    minAge: 0, maxAge: 110, weight: 1, repeatable: true,
    eligible: () => life.alive && life.justice.prisonUntil === null,
    run: () => {if(stat==='knowledge')addKnowledge(life,delta);else s[stat] += delta; event(life,key,'everyday',icon);},
  }));
  candidates.push(hobbyLifeCandidate(life,{random:()=>random(life),event:(key,params)=>event(life,key,'everyday','✧',params)}));
  candidates.push(hobbyMilestoneCandidate(life,{event:(key,params)=>{event(life,key,'milestone','✧',params);updateBudget(life);}}));
  candidates.push(...custodyFeedCandidates(life,{random:()=>random(life),event:(key,params)=>event(life,key,'family','◦',params)}));
  candidates.push({id:'legacy_conflict',minAge:0,maxAge:110,weight:1,
    eligible:gate=>life.alive&&life.justice.prisonUntil===null&&!life.settings.gentler&&!life.settings.classroom&&gate(clamp(life.country.war*.04,0,.08)),
    run:()=>{s.happiness-=7;s.health-=3;event(life,'event.conflict','everyday','◈');}});
  candidates.push({id:'legacy_future',minAge:0,maxAge:110,weight:1,
    eligible:gate=>life.alive&&life.justice.prisonUntil===null&&life.era==='future'&&gate(.07),
    run:()=>{if(random(life)<.5){s.health-=1;event(life,'event.heat','everyday','☀')}else{addKnowledge(life, 3);event(life,'event.opportunity','everyday','✧')}}});
  return candidates;
}
function postgraduateJobDecision(life:Life):Decision|null {
  if(!postgraduateJobDue(life))return null;
  const offered=requestJobOffers({...life,pendingDecision:null});
  if(offered.pendingDecision?.id!==`job-${life.age}`)return null;
  life.rng=offered.rng;life.jobOffers=offered.jobOffers;if(offered.jobOfferBatch)life.jobOfferBatch=offered.jobOfferBatch;else delete life.jobOfferBatch;
  return offered.pendingDecision;
}
function yearlyEvent(life: Life, elapsed: number) {
  expireSchoolWithdrawal(life);
  const secondary = prepareSecondaryRuntime(life,()=>random(life),forced=>beginChildWork(life,forced));
  if(secondary)event(life,`event.lowerSecondary.${secondary}`,'milestone','📚');
  for(const kind of prepareUpperRuntime(life,()=>random(life),paid=>beginChildWork(life,paid)))event(life,`event.upperSecondary.${kind}`,'milestone','📚');
  const college=prepareCollegeRuntime(life);
  if(college)event(life,`event.college.${college}`,'milestone','📚');
  const retake=settleUniversityRetake(life,()=>random(life));if(retake)event(life,`event.universityRetake.${retake}`,'milestone','📚');
  preparePostgraduateContinuation(life,()=>random(life));
  prepareNaturalStudyGraduation(life);
  prepareUniversityMajor(life,()=>random(life));
  // Stage transitions must select their activity before the first tick is earned.
  refreshNewFocus(life);
  const age = life.age, candidates = feedCandidates(life);
  life.feed ??= newFeedState();
  planAnnualFeed(life.feed,life.year,age,candidates,()=>random(life));
  const continuation = universityMajorDecision(life) ?? studyGraduationDecision(life) ?? studyDecision(life) ?? universityRetakeDecision(life) ?? schoolWithdrawalDecision(life) ?? secondaryDecision(life) ?? upperSecondaryDecision(life) ?? collegeDecision(life) ?? academicContinuationDecision(life) ?? (life.pendingDecision?.id === `job-${life.age}` ? null : postgraduateJobDecision(life));
  const scheduledDecisions = [...(continuation ? [continuation] : []),...(life.pendingDecision ? [life.pendingDecision] : [])];
  life.pendingDecision = null;
  prepareNaturalOfficerYear(life);
  if(scheduledDecisions.length<2){const equipment=physicalEquipmentDecision(life);if(equipment)scheduledDecisions.push(equipment);}
  if(scheduledDecisions.length<2){
    prepareMilitaryRetirementRuntime(life,()=>random(life));
    const retirement=militaryRetirementDecision(life);
    if(retirement)scheduledDecisions.push(retirement);
  }
  if (scheduledDecisions.length === 1) {
    const discovery = structuredClone(life);
    discovery.decisions.push(...scheduledDecisions.map(decision => decision.id));
    const additional = nextDescendantDecision(discovery);
    if (additional) scheduledDecisions.push(additional);
  }
  prepareOfficerPromotionRuntime(life,scheduledDecisions.length,()=>random(life));
  const officerPromotion=officerPromotionDecision(life);
  if(scheduledDecisions.length<2&&officerPromotion)scheduledDecisions.push(officerPromotion);
  if(scheduledDecisions.length<2){const hobby=prepareHobbyDecision(life,()=>random(life));if(hobby)scheduledDecisions.push(hobby);}
  life.timeline = {
    year: life.year, age, financePending: true, focusTime: {},
    ...(life.stageFocus ? {stageFocusTime:{}} : {}),
    ...planYearTimeline(life.feed.plan!.queue, scheduledDecisions, () => random(life)),
    scheduledDecisions,
  };
  Object.assign(life, advanceTimeline(life, elapsed));
  if (life.timeline?.complete && !life.timeline.focusTime) delete life.timeline;
}

function recurringChoice(input: Life, kind: string, options: string[], params: EventParams = {}, suffix = ''): Life {
  const life = structuredClone(input);
  choice(life, `${kind}-${life.age}${suffix}`, `decision.${kind}`, options, params);
  return life;
}
/** Offers are discovered between years, so no annual milestone can overwrite one. */
function nextAdultDecision(input: Life): Life {
  const equipment=physicalEquipmentDecision(input);if(equipment){const offered=structuredClone(input);offered.pendingDecision=equipment;return offered;}
  const age = input.age;
  if (age < 17 || age >= 65 || input.justice.prisonUntil !== null) return input;
  if (input.care.who === 'self' && input.care.until !== null && age >= input.care.until && !input.decisions.includes(`returnWork-${age}`)) return recurringChoice(input, 'returnWork', ['returnWork', 'remainHome']);
  if (input.stats.debt > input.country.ppp * 0.05 && age - input.opportunities.lastRiskAge >= 7 && !input.settings.gentler && !input.settings.classroom) return recurringChoice(input, 'risky', ['refuseRisk', 'acceptRisk']);
  if (!input.academics?.circumstances?.developmentalProtection && age >= 19 && age <= 23 && input.stats.education < 4 && !input.schooling.enrolled && !input.training.kind && !input.decisions.some(id => id.startsWith('apprenticeship-'))) return recurringChoice(input, 'apprenticeship', ['mechanic', 'hairdresser', 'keepJob']);
  if (input.family.partner?.alive && ['dating', 'cohabiting'].includes(input.relationship.status) && age >= input.opportunities.nextRelationshipAge) return recurringChoice(input, 'marriage', ['marry', 'cohabit', 'keepDating', 'breakUp']);
  const POLYGAMY_COUNTRIES = ['UGA', 'NGA', 'MLI', 'SEN', 'BFA', 'TCD', 'GIN', 'NER', 'CIV', 'CMR', 'KEN', 'TZA', 'GHA', 'SSD', 'SOM', 'SDN'];
  if (!input.settings.gentler && !input.settings.classroom && input.sex === 'M' && input.family.married && input.family.partner?.alive && !input.family.secondPartner && age >= 42 && age <= 52 && (POLYGAMY_COUNTRIES.includes(input.country.id) || input.country.tfr >= 4.0) && random(input) < 0.16) {
    return recurringChoice(input, 'secondWife', ['takeSecondWife', 'refuseSecondWife']);
  }
  if (!input.settings.gentler && !input.settings.classroom && !householdPartners(input).some(partner => partner.alive) && age >= 25 && age <= 62 && age >= input.opportunities.nextRelationshipAge && random(input) < 0.12) {
    const partnerSex = input.sex === 'M' ? 'F' : 'M';
    const candidate = person(input, 'partner', Math.max(18, age - 4 + Math.floor(random(input) * 8)), partnerSex);
    return recurringChoice(input, 'remarriage', ['partner', 'independent'], { name: candidate.name });
  }
  const childIndex = input.family.children.findIndex(child => child.alive && child.country === physicalCountry(input) && child.age === 1 && !input.care.handledChildren.includes(child.id));
  if (childIndex >= 0) return recurringChoice(input, 'care', childcareChoices(input), { name: input.family.children[childIndex].name }, `-${childIndex}`);
  const maxChildAge = (input.sex === 'M' || (input.family.secondPartner && input.family.secondPartner.age <= 45)) ? 55 : 45;
  if (age >= 24 && age <= maxChildAge && (input.family.partner?.alive || input.family.secondPartner?.alive) && ['married', 'cohabiting'].includes(input.relationship.status) && input.relationship.childPlan !== 'childfree' && age >= input.relationship.nextChildDecisionAge && input.family.children.length < FAMILY_LIMITS.children) return recurringChoice(input, 'children', ['haveChild', 'waitChild', 'childfree']);
  if (!input.academics?.circumstances?.developmentalProtection && age >= 23 && input.stats.education < 3 && !input.schooling.enrolled && !input.training.kind && age >= input.opportunities.nextNightSchoolAge && input.care.who !== 'self') return recurringChoice(input, 'nightSchool', ['nightSchool', 'laterSchool']);
  if (age >= 18 && input.stats.debt > input.country.ppp * 0.2 && age - input.opportunities.lastDebtAge >= 5) return recurringChoice(input, 'debt', ['familyHelp', 'moneylender']);
  return input;
}
function yearlyTransitions(life: Life) {
  if (life.justice.prisonUntil !== null && life.age >= life.justice.prisonUntil) {
    life.justice.prisonUntil = null; life.stats.employment = 'unemployed'; life.stats.job = 'none';
    // Older saves may retain enrollment despite sentencing having ended student employment.
    if (life.schooling.enrolled) { life.schooling.enrolled = false; life.schooling.droppedOut = true; }
    if (life.training.kind && life.training.kind !== 'nightSchool') { life.stats.employment = 'employed'; life.stats.job = life.training.kind; life.stats.annualIncome = round(life.training.previousIncome * 0.45); }
    event(life, 'event.release', 'milestone', '↗');
  }
  if (life.training.endsAt !== null && life.age >= life.training.endsAt && life.justice.prisonUntil === null) {
    if (life.training.kind === 'nightSchool') { life.schooling.years += life.stats.education === 0 ? 1 : 2; life.stats.education = Math.min(3, life.stats.education + 1); addKnowledge(life, 8); }
    else if (life.training.kind) { life.stats.education = Math.max(3, life.stats.education); life.stats.job = life.training.kind; life.training.previousJob = life.training.kind; life.stats.employment = 'employed'; life.stats.annualIncome = Math.max(life.country.ppp * eraIncome(life.era) * 0.65, life.training.previousIncome * 1.3); }
    life.training.kind = null; life.training.endsAt = null;
    event(life, 'event.qualification', 'career', '🎓');
  }
  if (life.care.who === 'partner') {
    const present = localPartnerPresent(life);
    if (!present) {
      life.relationship.partnerIncome = 0;
      life.care.who = null; life.care.until = null;
    } else if (life.care.until !== null && life.age >= life.care.until) {
      life.relationship.partnerIncome = life.care.previousPartnerIncome;
      life.care.who = null; life.care.until = null;
      event(life, 'event.careReturn', 'family', '↗');
    }
  }
  resumeStudyPartnerWork(life);
}
function automaticDecision(life: Life): Life {
  for (let i = 0; i < 8 && life.pendingDecision; i++) {
    const decision=life.pendingDecision;
    if(decision.type==='reflection'){life=addReflection(life,'');continue;}
    const choice=isUniversityRetakeDecision(decision.id)
      ? random(life)<automaticRetakeProbability(life.country.id,life.universityAdmissions?.offer?.retakes??0,life.stats.incomeQuintile)?'retakePrepare':'retakeWork'
      : pick(decision.id.startsWith('descendant-')?life.descendants:life,decision.choices).id;
    life=makeChoice(life,choice);
  }
  return life;
}

/** Continue a saved narrative year without repeating annual simulation effects. */
export function advanceTimeline(input: Life, elapsed: number): Life {
  if (!input.alive || input.pendingDecision || !input.timeline || input.timeline.complete) return input;
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError('Invalid timeline duration');
  const timeline = input.timeline, plan = input.feed?.plan;
  if (timeline.year !== input.year || timeline.age !== input.age || !plan || plan.year !== input.year || plan.age !== input.age)
    throw new Error('Timeline does not match the current year');
  // Do not silently discard kinds whose game effects are not implemented yet.
  for (const slot of timeline.queue) {
    if (slot.kind === 'feed') continue;
    const decision = timeline.scheduledDecisions?.find(item => item.id === slot.id);
    const reflection = decision?.type === 'reflection' && REFLECTION_AGES.includes(input.age) &&
      decision.id === `reflection-${input.age}` && decision.key === `decision.reflection.${input.age}`;
    const physicalAid=decision?.type==='choice'&&isPhysicalEquipmentDecision(decision.id)&&physicalEquipmentDecision(input)?.id===decision.id;
    const hobby = decision?.type==='choice'&&isHobbyDecision(decision.id)&&hobbyDecision(input)?.id===decision.id;
    const fixed = decision?.type === 'choice' && fixedDecisionAt(decision.id, input.age) && decision.key === `decision.${decision.id}`;
    const academic = decision?.type === 'choice' && academicDecisionAge(decision.id) === input.age && decision.key === (decision.id.startsWith('academicPhd-') ? 'decision.academicPhd' : 'decision.academicAfterUniversity');
    const militaryRetirement=decision?.type==='choice'&&decision.id===`militaryRetirement-${input.age}`&&decision.key==='decision.militaryRetirement';
    const officer=decision?.type==='choice'&&decision.id===`officerPromotion-${input.age}`&&['decision.officerPromotion.field','decision.officerPromotion.general'].includes(decision.key);
    const secondary = decision?.type === 'choice' && decision.id === `lowerSecondary-${input.age}` && ['decision.lowerSecondary','decision.lowerSecondaryBanned'].includes(decision.key);
    const withdrawal = decision?.type === 'choice' && decision.id === `schoolWithdrawal-${input.age}` && decision.key.startsWith('decision.schoolWithdrawal.');
    const upper = decision?.type === 'choice' && decision.id === `upperSecondary-${input.age}` && decision.key === 'decision.upperSecondary';
    const major=decision?.type==='choice'&&decision.id===`universityMajor-${input.age}`&&decision.key==='decision.universityMajor';
    const studyGraduation=decision?.type==='choice'&&isStudyGraduation(decision.id)&&decision.id===`studyGraduation-${input.age}`&&decision.key==='decision.studyGraduation';
    const study = decision?.type==='choice'&&isStudyDecision(decision.id)&&decision.id.endsWith(`-${input.age}`)&&decision.key===(decision.id.startsWith('studyDomestic-')?'decision.studyDomestic':'decision.studyDestination');
    const retake = decision?.type === 'choice' && isUniversityRetakeDecision(decision.id) && decision.key==='decision.universityRetake';
    const college = decision?.type === 'choice' && isCollegeDecision(decision.id) && decision.key === 'decision.college';
    const job = decision?.type === 'choice' && decision.id === `job-${input.age}` && decision.key === 'decision.job' && (input.jobOfferBatch ? input.jobOffers.length <= 3 : input.jobOffers.length === 3);
    if (slot.kind !== 'decision' || !decision || decision.age !== input.age ||
        !(parseDescendantDecision(slot.id) || physicalAid || hobby || fixed || reflection || academic || officer || militaryRetirement || secondary || upper || college || withdrawal || major || studyGraduation || study || retake || job))
      throw new Error('Unsupported or missing scheduled decision');
  }
  const expectedFeed = timeline.queue.filter(slot => slot.kind === 'feed');
  if (expectedFeed.length !== plan.queue.length || expectedFeed.some((slot, index) => slot.id !== plan.queue[index].id || slot.at !== plan.queue[index].at))
    throw new Error('Timeline feed queue mismatch');
  const life = structuredClone(input);
  refreshScheduledFamilyDecisions(life);
  const candidates = feedCandidates(life);
  // Early childhood has no chosen focus, including saves from older builds
  // that incorrectly accumulated the hidden balanced default.
  if (life.age < 6 && life.timeline!.focusTime) life.timeline!.focusTime = {};
  if (life.age < 6 && life.timeline!.stageFocusTime) life.timeline!.stageFocusTime = {};
  const stageTime = life.timeline!.stageFocusTime;
  const stageFocus = life.stageFocus?.selection.current;
  const focusTime = life.timeline!.focusTime;
  const focus = life.focus, startedAt = life.timeline!.position;
  advanceYearTimeline(life.timeline!, elapsed, slot => {
    if (slot.kind === 'feed') {
      fireNextFeed(life.feed!, life.year, life.age, candidates, () => random(life));
      refreshScheduledFamilyDecisions(life);
      return !life.alive;
    }
    let decision = life.timeline!.scheduledDecisions!.find(item => item.id === slot.id);
    life.timeline!.scheduledDecisions = life.timeline!.scheduledDecisions!.filter(item => item.id !== slot.id);
    if(decision&&isHobbyDecision(decision.id)&&life.hobbyState?.offer?.age===life.age)decision=refreshHobbyDecision(life,()=>random(life))??undefined;
    if(decision&&isSchoolWithdrawalDecision(decision.id)&&!schoolWithdrawalDecision(life)){expireSchoolWithdrawal(life);return false;}
    if (!decision || life.decisions.includes(decision.id) ||
        decision.type === 'reflection' && life.reflections[String(life.age)] !== undefined ||
        decision.id === 'relationship' && life.family.partner?.alive ||
        decision.id === 'education' && life.justice.prisonUntil !== null ||
        decision.id === 'school' && !!life.academics && !primaryReturnEligible(life) ||
        isOfficerPromotion(decision.id) && !officerPromotionDecision(life) ||
        isMilitaryRetirement(decision.id) && !militaryRetirementDecision(life) ||
        academicDecisionAge(decision.id) !== null && !academicContinuationDecision(life) ||
        isMajorDecision(decision.id) && !universityMajorDecision(life) ||
        isStudyGraduation(decision.id) && !studyGraduationDecision(life) ||
        isStudyDecision(decision.id) && !studyDecision(life) ||
        isCollegeDecision(decision.id) && !collegeDecision(life) ||
        isUniversityRetakeDecision(decision.id) && !universityRetakeDecision(life) ||
        isLowerSecondaryDecision(decision.id) && !secondaryDecision(life) ||
        isUpperSecondaryDecision(decision.id) && !upperSecondaryDecision(life) ||
        decision.id === `job-${life.age}` && (!occupationQuoteCurrent(life) || life.schooling.enrolled || life.justice.prisonUntil !== null || life.stats.employment === 'retired')) return false;
    life.pendingDecision = decision;
    return true;
  });
  // A decision consumes only the time before its slot; unused tick time is lost.
  const consumed = life.timeline!.position - startedAt;
  if (life.age >= 6 && consumed > 0) {
    if (stageTime && stageFocus) stageTime[stageFocus] = (stageTime[stageFocus] ?? 0) + consumed;
    if (focusTime) focusTime[focus] = (focusTime[focus] ?? 0) + consumed;
  }
  if (life.timeline!.complete && life.alive) {
    if (stageTime) {
      const effects = settleFocusStats(life.stats,life.age,stageTime);
      life.stats.health = effects.health;
      life.stats.happiness = effects.happiness;
      life.stats.social = effects.social;
      settleEducationHobbies(life,stageTime);
      if (life.learning) {
        const learning = settleLearningYear(life.learning,learningContext(life),stageTime);
        life.learning = learning.state;
        if (learning.knowledge !== null) life.stats.knowledge = learning.knowledge;
      }
    } else if (focusTime) {
      const total = Object.values(focusTime).reduce((sum, time) => sum + time, 0);
      if (total > 0) applyYearFocus(life, focusTime, total);
    }
  }
  if(life.timeline!.complete&&life.alive&&!stageTime)settleEducationHobbies(life,{});
  if(life.timeline!.complete&&life.alive){const outcome=settleEquivalencyRuntime(life,()=>random(life));if(outcome)event(life,`event.equivalency.${outcome}`,'milestone','🎓');}
  if (life.timeline!.complete && life.alive && life.academics?.enrollment && life.justice.prisonUntil === null) {
    const academic = life.academics;
    const school = academic.enrollment!;
    const duration=schoolDuration(school.stage,life.country.id,academic.medicine,academic.studyCountry ?? undefined);
    const settled=settleSchoolYear(school,life.age,duration);
    academic.enrollment=settled;
    if(settled!==school){
      // Keep the compatibility total on the same observed-year boundary as course credit.
      life.schooling.years=Math.min(Math.max(0,life.age-5),life.schooling.years+1);
      if(school.stage==='primary'){const outcome=settlePrimaryRuntime(life,duration,()=>random(life),()=>beginChildWork(life));if(outcome)event(life,`event.primary.${outcome}`,'milestone','◦');}
      if(['upperSecondary','vocational'].includes(school.stage)){const outcome=settleUpperRuntime(life,()=>random(life),paid=>beginChildWork(life,paid));if(outcome)event(life,`event.upperSecondary.${outcome}`,'milestone','◦');}
      const probability=school.stage==='lowerSecondary'
        ?(academic.circumstances?lowerSecondaryDropoutProbability(school.retention,settled.completedYears,duration,life.temperament.kind==='persistent',academic.circumstances.developmentalProtection):null)
        :school.stage==='university'
        ?(academic.academy?academyDropoutProbability(settled.completedYears,duration,life.temperament.kind==='persistent'):universityDropoutProbability(school.retention,settled.completedYears,duration,life.stats.knowledge,life.temperament.kind==='persistent'))
        :postgraduateDropoutProbability(school.stage,settled.completedYears,duration,life.stats.knowledge,life.stats.health,life.temperament.kind==='persistent');
      if(probability!==null&&random(life)<probability){
        const academyBranch=school.stage==='university'?academic.academy?.branch:undefined;
        if(academyBranch)delete academic.academy;
        academic.lastWithdrawal={stage:school.stage as 'lowerSecondary'|'university'|'graduate'|'phd',age:life.age,completedYears:settled.completedYears,country:academic.studyCountry??life.country.id};
        academic.enrollment=null;
        life.schooling.enrolled=false;life.schooling.droppedOut=true;
        life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;life.stats.happiness-=4;
        if(school.stage==='lowerSecondary'&&life.age<15)beginChildWork(life);
        if(returnFromOverseasStudy(life))event(life,'event.studyWithdrawalReturn','milestone','🎓');
        const reason=school.stage==='university'
          ?((life.timeline!.stageFocusTime?.parttime??0)>0&&life.stats.knowledge<80?'parttime':life.stats.knowledge<60?'academic':'direction'):null;
        event(life,academyBranch?`event.academicWithdrawal.academy${academyBranch==='jp'||academyBranch==='cn'?`.${academyBranch}`:''}`:`event.academicWithdrawal.${school.stage}${reason?`.${reason}`:''}`,'milestone','◦',{years:settled.completedYears});
      }
    }
  }
  if (life.timeline!.complete && life.timeline!.financePending && life.alive) {
    life.timeline!.financePending = false;
    yearlyFinance(life);
    settleAutomaticLessons(life,(key,params)=>event(life,key,'finance','✧',params));
    updateBudget(life);
  }
  if (life.history.at(-1)?.age === life.age) updateCurrentHistory(life);
  else normalize(life);
  return life.settings.autoChoices && life.pendingDecision && life.history.at(-1)?.age === life.age ? automaticDecision(life) : life;
}

export function advanceYear(previous: Life, elapsed = 1): Life {
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError('Invalid year duration');
  if (elapsed === 0) return previous;
  if (!previous.alive || previous.pendingDecision) return previous;
  const careOffer=guardianDecision(previous);
  if(careOffer){const offered=structuredClone(previous);offered.pendingDecision=careOffer;return offered.settings.autoChoices?automaticDecision(offered):offered;}
  if (previous.timeline && !previous.timeline.complete) return advanceTimeline(previous, elapsed);
  // Opportunity checks consume RNG too; isolate them from the saved prior state.
  const input = structuredClone(previous);
  delete input.timeline;
  const descendantOffer = nextDescendantDecision(input);
  if (descendantOffer) { const offered = structuredClone(input); offered.pendingDecision = descendantOffer; return offered.settings.autoChoices ? automaticDecision(offered) : offered; }
  const retakeOffer=universityRetakeDecision(input);if(retakeOffer){input.pendingDecision=retakeOffer;return input.settings.autoChoices?automaticDecision(input):input;}
  const adultDecision = nextAdultDecision(input);
  if (adultDecision !== input) return adultDecision.settings.autoChoices ? automaticDecision(adultDecision) : adultDecision;
  if (jobSearchEligible(input) && (input.stats.employment === 'none' || input.stats.employment === 'unemployed' || input.schooling.childLabor)) {
    const offered = requestJobOffers(input);
    return offered.settings.autoChoices ? makeChoice(offered, 'offer0') : offered;
  }
  const life = structuredClone(input);
  checkHealthcare(life);
  if (!life.alive || life.pendingDecision) return life.settings.autoChoices && life.pendingDecision ? automaticDecision(life) : life;
  life.age++; life.year++;
  rollMilitaryRetirementFacts(life);
  rollMilitaryServiceState(life);
  const commissioned=commissionAcademyRuntime(life);
  if(commissioned){
    event(life,'event.academyCommission','career','🎖');
    if(commissioned.gift>0)event(life,'event.academyEntryGift','family','♡',{amount:commissioned.gift});
    if(commissioned.party)event(life,'event.academyParty','career','◦',{party:commissioned.party});
  }
  if (life.academics?.enrollment?.graduationPending) {
    const academic = life.academics;
    const result = graduateSchool(academic.enrollment,academic.qualification,academic.doctorate);
    if (result.graduated) {
      academic.enrollment = result.school;
      academic.qualification = result.education;
      academic.doctorate = result.doctorate;
      academic.lastGraduation = {stage:result.graduated,age:life.age,country:academic.studyCountry ?? life.country.id};
      life.schooling.enrolled = false;
      // Older job paths use a coarser qualification taxonomy; never downgrade it.
      const legacyQualification = result.education >= 4 ? 4 : result.graduated === 'vocational' ? 3 : Math.min(2,result.education);
      life.stats.education = Math.max(life.stats.education,legacyQualification) as Life['stats']['education'];
      if (result.graduated === 'phd') {life.stats.happiness += 8;addKnowledge(life,4);}
      event(life,`event.academicGraduation.${result.graduated}`,'milestone','🎓');
    }
  }
  const physical=observePhysicalYear(life,()=>random(life));
  if(physical)event(life,physical,physical==='event.physical.support'?'finance':'milestone','◦',physical==='event.physical.support'?{amount:life.physicalState!.support!.amount}:physical.startsWith('event.physical.sportReturn.')?{hobby:hobbyDisplayId(life,life.physicalState!.condition!.sportsAdjustment!.hobby!)}:{});
  yearlyTransitions(life);
  yearlyRecovery(life);
  yearlyFamily(life); yearlyCompanions(life);
  yearlyDescendants(life, {event, name: personName, mortality});
  guardianYear(life,key=>event(life,key,'family','⌂'));
  const s = life.stats;
  if(life.lifestyle.diet==='healthy')s.health+=0.5;
  if(life.lifestyle.diet==='convenient'){s.health-=0.35;s.happiness+=0.3;}
  if(life.lifestyle.gifts==='generous')s.social+=0.25;else if(life.lifestyle.gifts==='modest')s.social+=0.1;
  if(life.dailyTheme.id==='learning')addKnowledge(life, 0.35);
  if(life.dailyTheme.id==='kindness')s.social+=0.35;
  if(life.dailyTheme.id==='freshAir')s.health+=0.25;
  for(const pet of life.pets)if(pet.alive){
    const span=({dog:13,cat:15,parrot:30,rabbit:9,fish:5} as const)[pet.kind];
    pet.age++;if(pet.age>=span*2||random(life)<0.004+(pet.age/span)**4*0.07){pet.alive=false;event(life,'event.petFarewell','family','◦');s.happiness-=2;}else s.happiness+=0.12;
  }
  if (life.training.kind === 'nightSchool') { s.health -= 0.5; s.happiness -= 0.2; }
  if (!life.academics && life.schooling.enrolled && life.justice.prisonUntil === null) life.schooling.years++;
  const stageLearning = !!life.learning && !!life.stageFocus;
  if (!stageLearning && life.temperament.kind === 'curious') addKnowledge(life, 0.35);
  if (life.temperament.kind === 'sociable') s.social += 0.35;
  if (life.temperament.kind === 'careful') s.health += 0.35;
  if (life.temperament.kind === 'energetic') { s.health += 0.2; s.happiness += 0.2; }
  for (const hobby of life.hobbies) {
    if(life.academics?.origin==='birth'&&hobby.progress)continue;
    hobby.skill = round(clamp(hobby.skill + 0.8 + random(life) + (life.talents.includes(hobby.id) ? 0.8 : 0)));
    if (hobby.id === 'reading' || hobby.id === 'craft') {if (!stageLearning) addKnowledge(life, 0.25);}
    else if (hobby.id === 'sport' || hobby.id === 'nature') s.health += 0.25;
    else s.happiness += 0.25;
  }
  s.health += (random(life) - 0.55) * 2.6 - Math.max(0, life.age - 45) * 0.018;
  s.happiness += (random(life) - 0.5) * 3;
  s.social += (random(life) - 0.52) * 2;
  if (!stageLearning && life.age >= 6 && life.age <= 22) addKnowledge(life, life.stats.employment === 'student' ? 1.7 : 0.4);
  refreshEducationContext(life);
  milestones(life);
  childDevelopmentYear(life,(key,name,extra)=>event(life,`event.childDevelopment.${key}`,'family','◦',{name,...extra}),()=>random(life));
  childLearningYear(life,()=>random(life),(key,name)=>event(life,`event.childLearning.${key}`,'family','◦',{name}));
  const development=observeDevelopment(life,()=>random(life));
  if(development)event(life,`event.development.${development}`,'milestone','◦');
  updateBudget(life);
  if (!life.pendingDecision) life.pendingDecision = nextDescendantDecision(life);
  yearlyEvent(life, elapsed);
  normalize(life);
  life.history.push(trajectory(life));
  if (life.age >= 110) finish(life);
  if (life.settings.autoChoices && life.pendingDecision) {
    return automaticDecision(life);
  }
  return life;
}

export function makeChoice(input: Life, choiceId: string): Life {
  if (!input.alive || !input.pendingDecision?.choices.some(choice => choice.id === choiceId)) return input;
  if (input.pendingDecision.type === 'reflection') return choiceId === 'skip' ? addReflection(input, '') : input;
  const life = structuredClone(input), decision = life.pendingDecision!;
  if(decision.id.startsWith('guardian-')){
    if(!resolveGuardianDecision(life,choiceId))return input;
    event(life,`event.${choiceId}`,'family','⌂',decision.params);updateBudget(life);updateCurrentHistory(life);return life;
  }
  // A queued or restored school offer can outlive eligibility; dismiss it without consequences.
  if (decision.id === 'education' && life.justice.prisonUntil !== null) { life.pendingDecision = null; return life; }
  if (decision.id.startsWith('job-')) {
    const offer = life.jobOffers.find(item => item.id === choiceId);
    const advertised = decision.choices.find(item => item.id === choiceId);
    if (!jobSearchEligible(life) || !occupationQuoteCurrent(life) || decision.id !== `job-${life.age}` || decision.age !== life.age || (choiceId !== 'wait' && (!offer || advertised?.params.amount !== offer.income))) {
      life.pendingDecision = null; return life;
    }
  }
  const s = life.stats;
  if(isPhysicalEquipmentDecision(decision.id)){
    const expected=physicalEquipmentDecision(life);if(!expected||JSON.stringify(expected)!==JSON.stringify(decision))return input;
    const result=resolvePhysicalEquipment(life,choiceId);if(!result)return input;
    life.pendingDecision=null;life.decisions.push(decision.id);
    if(result==='received'){const c=life.physicalState!.condition!;event(life,`event.physical.adultAid.${c.kind}${c.kind==='mobility'&&c.wheelchair?'.wheelchair':''}`,'everyday','◦');}
    event(life,'event.decision','decision','✦');normalize(life);updateBudget(life);updateCurrentHistory(life);return life;
  }
  if(isHobbyDecision(decision.id)&&hobbyDecision(life)?.id===decision.id){
    if(!resolveHobbyChoice(life,choiceId))return input;
    life.pendingDecision=null;life.decisions.push(decision.id);
    if(choiceId!=='keepHobbies')event(life,'event.hobby','milestone','✧');
    event(life,'event.decision','decision','✦');
    refreshEducationContext(life);normalize(life);updateBudget(life);updateCurrentHistory(life);return life;
  }
  if(isMajorDecision(decision.id)){
    const result=resolveUniversityMajor(life,choiceId,()=>random(life));life.pendingDecision=null;if(!result)return life;
    life.decisions.push(decision.id);event(life,`event.major.${result.outcome}`,'milestone','🎓',{major:result.major});
    refreshEducationContext(life);normalize(life);updateBudget(life);updateCurrentHistory(life);return life;
  }
  if(isStudyGraduation(decision.id)){
    const result=resolveStudyGraduation(life,choiceId,()=>random(life));life.pendingDecision=null;if(!result)return life;
    life.decisions.push(decision.id);if(choiceId==='studyFinishGraduate'&&result!=='enrolled')event(life,'event.studyGraduateRejected','milestone','🎓');event(life,`event.studyGraduation.${result}`,'milestone','🎓');scheduleUniversityMajor(life,()=>random(life));refreshEducationContext(life);normalize(life);updateBudget(life);updateCurrentHistory(life);return life;
  }
  if(isStudyDecision(decision.id)){
    const result=resolveStudyChoice(life,choiceId,()=>random(life));life.pendingDecision=null;if(!result)return life;
    life.decisions.push(decision.id);event(life,`event.study.${result}`,'milestone','🎓');scheduleStudyChoice(life);scheduleUniversityRetake(life);scheduleUniversityMajor(life,()=>random(life));refreshEducationContext(life);normalize(life);updateBudget(life);updateCurrentHistory(life);return life;
  }
  if(isUniversityRetakeDecision(decision.id)){const outcome=resolveUniversityRetake(life,choiceId);life.pendingDecision=null;if(!outcome)return life;life.decisions.push(decision.id);event(life,`event.universityRetake.${outcome}`,'milestone','📚');updateBudget(life);updateCurrentHistory(life);return life;}
  if(isMilitaryRetirement(decision.id)) {
    const expected=militaryRetirementDecision(life);
    const valid=expected?.id===decision.id&&expected.params.rank===decision.params.rank&&expected.params.amount===decision.params.amount;
    const action=choiceId==='militaryRetire'?'retire':choiceId==='militaryOther'?'other':null;
    const outcome=valid&&action?resolveMilitaryRetirementRuntime(life,action,()=>random(life)):null;
    life.pendingDecision=null;if(!outcome)return life;
    life.decisions.push(decision.id);event(life,`event.militaryRetirement.${outcome}`,'career','◦');
    updateBudget(life);updateCurrentHistory(life);return life;
  }
  if(isOfficerPromotion(decision.id)) {
    const outcome=resolveOfficerPromotionRuntime(life,choiceId);life.pendingDecision=null;
    if(!outcome)return life;
    life.decisions.push(decision.id);if(outcome==='accepted')event(life,'event.officerPromotion.accepted','career','↗');
    updateBudget(life);updateCurrentHistory(life);return life;
  }
  if (isSchoolWithdrawalDecision(decision.id)) {
    const result=resolveWithdrawalRuntime(life,choiceId);life.pendingDecision=null;
    if(!result){expireSchoolWithdrawal(life);return life;}
    life.decisions.push(decision.id);event(life,`event.schoolWithdrawal.${result}`,'milestone','📚');
    updateBudget(life);updateCurrentHistory(life);return life;
  }
  if (isUpperSecondaryDecision(decision.id)) {
    const result=resolveUpperRuntime(life,choiceId,()=>random(life),paid=>beginChildWork(life,paid));
    life.pendingDecision=null;
    if(!result)return life;
    life.decisions.push(decision.id);
    for(const kind of result)event(life,`event.upperSecondary.${kind}`,'milestone','📚');
    updateBudget(life);updateCurrentHistory(life);return life;
  }
  if(decision.id==='school'&&life.academics){
    const result=resolvePrimaryReturn(life,choiceId,()=>random(life));life.pendingDecision=null;
    if(!result)return life;
    life.decisions.push('school');event(life,result==='enrolled'?'event.schoolReturn':result==='rejected'?'event.schoolReturnRejected':'event.primary.help','milestone','📚');
    updateBudget(life);updateCurrentHistory(life);return life;
  }
  if (isCollegeDecision(decision.id)) {
    const result=resolveCollegeRuntime(life,choiceId,()=>random(life));life.pendingDecision=null;
    if(!result)return life;
    life.decisions.push(decision.id);event(life,`event.college.${result}`,'milestone','📚');
    scheduleStudyChoice(life);scheduleUniversityRetake(life);scheduleUniversityMajor(life,()=>random(life));
    updateBudget(life);updateCurrentHistory(life);return life;
  }
  if (isLowerSecondaryDecision(decision.id)) {
    const result=resolveSecondaryRuntime(life,choiceId,()=>random(life),forced=>beginChildWork(life,forced));
    life.pendingDecision=null;
    if(!result)return life;
    life.decisions.push(decision.id);event(life,`event.lowerSecondary.${result}`,'milestone','📚');
    updateBudget(life);updateCurrentHistory(life);return life;
  }
  if (academicDecisionAge(decision.id) !== null) {
    const result = resolveAcademicContinuation(life,choiceId,()=>random(life));
    life.pendingDecision = null;
    if (!result) return life;
    life.decisions.push(decision.id);
    event(life,`event.academicContinuation.${result}`,'milestone','🎓');
    scheduleStudyChoice(life);scheduleUniversityMajor(life,()=>random(life));
    updateBudget(life);updateCurrentHistory(life);
    if(result==='doctoralWork'&&studyGraduationDecision(life)){scheduleStudyGraduation(life);return life;}
    return result === 'doctoralWork' ? requestJobOffers(life) : life;
  }
  if (decision.id.startsWith('health-')) return resolveHealthcare(life, choiceId as HealthTreatment);
  if (decision.id.startsWith('descendant-')) {
    if (!resolveDescendantDecision(life, choiceId, {event, name: personName, mortality})) return input;
    life.decisions.push(decision.id); life.pendingDecision = null; updateBudget(life); updateCurrentHistory(life); return life;
  }
  const activity=decision.id.startsWith('activity-')?decision.id.split('-')[1]:null;
  const kind = activity==='familyPlanning'?'children':activity==='nightSchool'?'nightSchool':decision.id.split('-')[0];
  if(kind==='care' && (!childcareChoices(input).includes(choiceId) || input.family.children[Number(decision.id.split('-')[2])]?.country!==physicalCountry(input)))return input;
  if(activity==='business') {
    if(choiceId==='startBusiness'&&s.savings>=activityPrice(life,'business')) {
      s.savings-=activityPrice(life,'business');
      if(random(life)<0.65){s.job='entrepreneur';s.employment='employed';s.annualIncome=Math.max(s.annualIncome*1.2,life.country.ppp*eraIncome(life.era)*0.65);s.happiness+=4;event(life,'event.business','career','↗');}
      else{s.happiness-=3;event(life,'event.businessLoss','finance','◦');}
    }
  } else if(activity==='dreamJob') {
    if(choiceId==='pursueDream'&&s.savings>=activityPrice(life,'dreamJob')) {
      s.savings-=activityPrice(life,'dreamJob');
      const skill=Math.max(0,...life.hobbies.map(hobby=>hobby.skill));
      if(random(life)<Math.min(0.9,0.3+s.knowledge/300+skill/400)) {s.job=s.education>=4?'engineer':'artisan';s.employment='employed';s.annualIncome=Math.max(s.annualIncome*1.25,life.country.ppp*eraIncome(life.era)*0.7);s.happiness+=6;event(life,'event.dreamJob','career','✧');}
      else{s.happiness-=2;event(life,'event.dreamSearch','career','◦');}
    }
  } else if(activity==='divorce') {
    if(choiceId==='leaveRelationship') {
      event(life,'event.separation','family','◦',{name:life.family.partner!.name});
      s.savings*=0.5;s.investments*=0.5;
      if(life.belongings.housing==='owned'){s.savings+=life.belongings.housingValue*0.5;life.belongings.housingValue=0;life.belongings.housing='rent';}
      life.family.partner=null;life.family.married=false;life.relationship.status='single';life.relationship.partnerIncome=0;
      if(life.care.who==='partner'){life.care.who=null;life.care.until=null;}
      s.happiness-=6;s.social-=3;
    }
  } else if(activity==='migration') {
    if(choiceId!=='stay'&&life.migration.offerCountry) {
      const destination=life.migration.offerCountry,together=choiceId==='migrateTogether';
      const cost=activityPrice(life,'migration')*(together?1.4:1),paid=Math.min(s.savings,cost);s.savings-=paid;s.debt+=cost-paid;
      const oldCountry=life.country.id;
      snapshotOccupationMigration(life,destination.id);
      life.country=structuredClone(destination);life.residence='urban';life.migration.lastMoveAge=life.age;life.migration.moves.push({age:life.age,country:destination.id,together});
      life.migration.familyCountry=together?null:life.migration.familyCountry??oldCountry;
      if(together){
        migrateDependents(life,oldCountry,destination.id);
        const incomeRatio=destination.ppp/countries.find(country=>country.id===oldCountry)!.ppp;
        life.relationship.partnerIncome*=incomeRatio;
        // Leave pauses earnings, but the returning salary still follows the household's new economy.
        if(life.care.who==='partner')life.care.previousPartnerIncome=Math.round(life.care.previousPartnerIncome*incomeRatio*100)/100;
      }
      else { life.relationship.partnerIncome=0; if(life.care.who==='partner'){life.care.who=null;life.care.until=null;} for (const state of life.descendants.children) state.residence='independent'; }
      if(life.belongings.housing==='owned'){s.savings+=life.belongings.housingValue;life.belongings.housingValue=0;}life.belongings.housing='rent';
      s.employment='unemployed';s.job='none';s.annualIncome=0;addKnowledge(life, 4);s.social-=together?2:7;
      event(life,'event.migration','milestone','↗');life.migration.offerCountry=null;
    }
  } else if(activity==='adoptPet') {
    // The public adoption helper performs the same price and count checks.
  } else if (kind === 'apprenticeship') {
    if (choiceId !== 'keepJob') {
      life.training = { kind: choiceId as 'mechanic' | 'hairdresser', endsAt: life.age + (choiceId === 'mechanic' ? 3 : 2), previousIncome: s.annualIncome || life.country.ppp * 0.25, previousJob: s.job };
      s.annualIncome = round(life.training.previousIncome * 0.45); s.job = choiceId as Job; s.employment = 'employed';
      event(life, 'event.apprenticeship', 'career', '✧');
    }
  } else if (kind === 'risky') {
    life.opportunities.lastRiskAge = life.age;
    if (choiceId === 'acceptRisk') {
      s.savings += life.country.ppp * (0.2 + random(life) * 0.4);
      event(life, 'event.riskyWork', 'finance', '◈');
      if (random(life) < 0.35) {
        const sentence = 2 + Math.floor(random(life) * 4);
        life.justice.prisonUntil = life.age + sentence;
        if(life.academics?.academyAccess)life.academics.academyAccess.criminalRecord=true;
        if (life.schooling.enrolled) { life.schooling.enrolled = false; life.schooling.droppedOut = true; }
        if (life.training.endsAt !== null) life.training.endsAt += sentence;
        s.employment = 'none'; s.job = 'none'; s.annualIncome = 0; s.happiness -= 12; s.social -= 8;
        event(life, 'event.prison', 'milestone', '◦');
      }
    }
  } else if (kind === 'marriage') {
    life.opportunities.nextRelationshipAge = life.age + 4;
    if (choiceId === 'marry') {
      life.relationship.status = 'married'; life.family.married = true; life.family.marriageAge = life.age; s.social += 6; s.happiness += 5;
      event(life, 'event.marriage', 'family', '♡', { name: life.family.partner!.name });
    } else if (choiceId === 'cohabit') { life.relationship.status = 'cohabiting'; life.family.married = false; s.happiness += 3; event(life, 'event.cohabit', 'family', '♡'); }
    else if (choiceId === 'keepDating') { life.relationship.status = 'dating'; life.family.married = false; }
    else if (choiceId === 'breakUp') {
      event(life, 'event.separation', 'family', '◦', { name: life.family.partner!.name });
      life.family.partner = null; life.family.married = false; life.relationship.status = 'single'; life.relationship.partnerIncome = 0; s.happiness -= 4;
      if(life.care.who==='partner'){life.care.who=null;life.care.until=null;}
    }
  } else if (kind === 'secondWife') {
    if (choiceId === 'takeSecondWife') {
      const secondPartner = person(life, 'secondPartner', Math.max(20, Math.min(28, life.age - 18)), 'F');
      const cost = round(life.country.ppp * eraIncome(life.era) * 0.35);
      life.family.secondPartner = secondPartner;
      const paid = Math.min(s.savings, cost); s.savings -= paid; s.debt += cost - paid;
      s.social += 2; s.happiness -= 1;
      event(life, 'event.secondWife', 'family', '♡', { name: secondPartner.name, cost, firstWife: life.family.partner!.name });
    } else {
      event(life, 'event.refuseSecondWife', 'family', '◦');
    }
  } else if (kind === 'remarriage') {
    if (choiceId === 'partner') {
      const partner = person(life, 'partner', Math.max(18, life.age - 3 + Math.floor(random(life) * 7)), life.sex === 'M' ? 'F' : 'M');
      partner.name = String(decision.params.name ?? partner.name);
      life.family.partner = partner; life.family.married = false; s.social += 10; s.happiness += 6;
      life.relationship.status = 'dating'; life.relationship.partnerIncome = round(life.country.ppp * eraIncome(life.era) * 0.3); life.opportunities.nextRelationshipAge = life.age + 1;
      event(life, 'event.partner', 'family', '♡', { name: partner.name });
    } else {
      life.opportunities.nextRelationshipAge = life.age + 5;
    }
  } else if (kind === 'children') {
    life.relationship.nextChildDecisionAge = life.age + 3;
    life.relationship.childPlan = choiceId === 'childfree' ? 'childfree' : choiceId === 'waitChild' ? 'waiting' : 'open';
    if (choiceId === 'haveChild' && life.family.children.length < FAMILY_LIMITS.children) {
      const child = person(life, `child-${life.family.children.length}`, 0, random(life) < 0.5 ? 'M' : 'F');
      life.family.children.push(child); addChildProgress(life,child); s.happiness += 5;
      if (life.family.secondPartner?.alive && ((life.family.partner && life.family.partner.age > 45) || random(life) < 0.5)) {
        event(life, 'event.secondWifeBirth', 'family', '♡', { name: life.family.secondPartner.name, baby: child.name });
      } else {
        event(life, 'event.child', 'family', '🌱', { name: child.name });
      }
    }
  } else if (kind === 'care') {
    const index = Number(decision.id.split('-')[2]), child = life.family.children[index];
    life.care.handledChildren.push(child.id);
    if(life.care.who==='self'&&choiceId!=='selfCare') { s.annualIncome=life.care.previousIncome;s.job=life.care.previousJob;s.employment=s.job==='none'?'unemployed':'employed'; }
    if(life.care.who==='partner'&&choiceId!=='partnerCare')life.relationship.partnerIncome=localPartnerPresent(life)?life.care.previousPartnerIncome:0;
    if (choiceId === 'selfCare') {
      if (life.care.who !== 'self') { life.care.previousIncome = s.annualIncome; life.care.previousJob = s.job; }
      life.care.who = 'self'; life.care.until = life.age + 3; s.annualIncome = 0; s.employment = 'none'; s.job = 'none';
    } else if (choiceId === 'partnerCare') {
      if (life.care.who !== 'partner') life.care.previousPartnerIncome = life.relationship.partnerIncome;
      life.care.who = 'partner'; life.care.until = life.age + 3; life.relationship.partnerIncome = 0;
    } else {
      life.care.who=null;life.care.until=null;
      if(choiceId==='daycare')life.care.daycareUntil=life.age+4;else s.social-=2;
    }
    event(life, 'event.childcare', 'family', '♡');
  } else if (kind === 'nightSchool') {
    life.opportunities.nextNightSchoolAge = life.age + 5;
    if (choiceId === 'nightSchool') {
      const cost = life.country.ppp * eraIncome(life.era) * 0.02;
      const paid = Math.min(s.savings, cost); s.savings -= paid; s.debt += cost - paid;
      life.training = { kind: 'nightSchool', endsAt: life.age + (s.education === 0 ? 1 : 2), previousIncome: s.annualIncome, previousJob: s.job };
      s.happiness -= 1; event(life, 'event.nightSchool', 'milestone', '📚');
    }
  } else if (kind === 'debt') {
    life.opportunities.lastDebtAge = life.age;
    if (choiceId === 'familyHelp') { s.debt = Math.max(0, s.debt - life.country.ppp * (0.1 + s.incomeQuintile * 0.03)); s.social -= 6; event(life, 'event.familyHelp', 'finance', '♡'); }
    else { const borrowed = life.country.ppp * 0.1; s.savings += borrowed; s.debt += borrowed * 1.1; life.opportunities.moneylenderUntil = life.age + 5; event(life, 'event.moneylender', 'finance', '◈'); }
  } else if (kind === 'returnWork') {
    if (choiceId === 'returnWork') { life.care.who = null; life.care.until = null; s.employment = 'unemployed'; s.job = 'none'; s.annualIncome = 0; event(life, 'event.careReturn', 'career', '↗'); }
    else life.care.until = life.age + 3;
  } else if (decision.id === 'temperament') {
    life.temperament.kind = choiceId as Life['temperament']['kind'];
    if (choiceId === 'curious') addKnowledge(life, 5);
    if (choiceId === 'sociable') s.social += 5;
    if (choiceId === 'careful') s.health += 3;
    if (choiceId === 'energetic') s.happiness += 4;
  } else if (decision.id === 'hobby') {
    const hobby={ id: choiceId as HobbyId, skill: life.talents.includes(choiceId as HobbyId) ? 10 : 5, trainedAt: -1,...(life.academics?.origin==='birth'?{progress:{since:life.age,level:0}}:{}) };
    if(life.academics?.origin==='birth')life.hobbies.unshift(hobby);else life.hobbies.push(hobby);
    event(life, 'event.hobby', 'milestone', '✧');
  } else if (decision.id === 'school') {
    const result = resolveSchoolReturn(choiceId === 'returnSchool' ? 'ask' : 'help', s.incomeQuintile, s.social, () => random(life));
    s.happiness += result.happiness; s.social += result.social;
    if (result.outcome === 'enrolled') {
      life.schooling.enrolled = true; life.schooling.droppedOut = false; life.schooling.childLabor = false;
      s.education = Math.max(1, s.education); s.employment = 'student'; s.job = 'student'; s.annualIncome = 0;
      event(life, 'event.schoolReturn', 'milestone', '📚');
    } else {
      beginChildWork(life);
      event(life, result.outcome === 'rejected' ? 'event.schoolReturnRejected' : 'event.childLabor', 'career', '◦');
    }
  } else if (decision.id.startsWith('job-')) {
    const offer = life.jobOffers.find(offer => offer.id === choiceId);
    life.schooling.childLabor = false;
    if (offer) { s.job = offer.job; s.employment = 'employed'; s.annualIncome = offer.income; if(offer.terms&&life.jobOfferBatch)life.career.push({age:life.age,job:offer.job,offer:{...life.jobOfferBatch,income:offer.income,terms:structuredClone(offer.terms)}}); event(life, 'event.newJob', 'career', '↗'); }
    else { s.employment = 'unemployed'; s.annualIncome = 0; s.job = 'none'; }
  } else if (decision.id === 'education') {
    if (choiceId === 'university') {
      life.schooling.enrolled = true; life.schooling.childLabor = false;
      life.schooling.university = { startedAge: life.age, completedYears: 0, lastProgressAge: life.age };
      s.employment = 'student'; s.job = 'student'; s.annualIncome = 0; addKnowledge(life, 7);
      s.savings = Math.max(0, s.savings - life.country.ppp * 0.08);
      event(life, 'event.university', 'milestone', '🎓');
    } else {
      life.schooling.enrolled = false; life.schooling.childLabor = false;
      s.education = choiceId === 'vocational' ? 3 : 2;
      beginWork(life, s.education);
      event(life, choiceId === 'vocational' ? 'event.vocational' : 'event.work', 'career', '↗');
    }
  } else if (decision.id === 'opportunity') {
    if (choiceId === 'ambition') {
      s.annualIncome *= 1.3; addKnowledge(life, 6); s.happiness -= 3; life.focus = 'career';
      if (random(life) < 0.2) { s.savings *= 0.8; s.job = 'entrepreneur'; }
    } else { s.happiness += 5; s.health += 2; }
  } else if (decision.id === 'relationship') {
    if (choiceId === 'partner') {
      const partner = person(life, 'partner', Math.max(18, life.age - 3 + Math.floor(random(life) * 7)), life.sex === 'M' ? 'F' : 'M');
      partner.name = String(decision.params.name);
      life.family.partner = partner; s.social += 12; s.happiness += 8;
      life.relationship.status = 'dating'; life.relationship.partnerIncome = round(life.country.ppp * eraIncome(life.era) * 0.3); life.opportunities.nextRelationshipAge = life.age + 1;
      event(life, 'event.partner', 'family', '♡', { name: partner.name });
    } else { addKnowledge(life, 5); s.happiness += 4; }
  } else if (decision.id === 'balance') {
    if (choiceId === 'family') { life.focus = 'relationships'; s.social += 10; s.happiness += 5; }
    if (choiceId === 'explore') { life.focus = 'creativity'; addKnowledge(life, 9); s.happiness += 5; }
    if (choiceId === 'health') { life.focus = 'health'; s.health += 9; }
  }
  life.decisions.push(decision.id); life.pendingDecision = null;
  event(life, 'event.decision', 'decision', '✦');
  updateBudget(life);
  updateCurrentHistory(life);
  if (kind === 'children' && choiceId === 'haveChild') {
    const child = life.family.children.at(-1)!;
    const hazard = mortality(life.country, child.sex, 0, life.era);
    const incidence = Math.max(0.07, hazard / 0.98);
    life.healthcare.childChecks = life.healthcare.childChecks.filter(check => check.id !== child.id);
    life.healthcare.childChecks.push({ id: child.id, age: life.age });
    if (random(life) < incidence) {
      beginHealthEpisode(life, child.id, 'premature', 'neonatal', hazard / incidence);
      updateCurrentHistory(life);
    }
  }
  if(activity==='adoptPet'&&PET_KINDS.includes(choiceId as PetKind))return adoptPet(life,choiceId);
  if(activity==='migration'&&choiceId!=='stay')return requestJobOffers(life);
  if (decision.id === 'relocation' && choiceId === 'move') {
    const moved = relocate(life);
    return moved.settings.autoChoices && moved.pendingDecision ? makeChoice(moved, 'offer0') : moved;
  }
  if (kind === 'returnWork' && choiceId === 'returnWork') return requestJobOffers(life);
  return life;
}
export function setFocus(input: Life, focus: string): Life {
  if (!input.alive || input.pendingDecision || !availableFocuses(input).includes(focus as Focus) || input.focus === focus) return input;
  const life = structuredClone(input); life.focus = focus as Focus;
  event(life, 'event.focus', 'decision', '◎');
  updateCurrentHistory(life);
  return life;
}
export function spend(input: Life, category: string, amount: number): Life {
  amount = Math.round(amount * 100) / 100;
  if (!input.alive || input.pendingDecision || input.age < 18 || !Number.isFinite(amount) || amount <= 0 || amount > input.stats.savings || !['health', 'education', 'experiences', 'giving', 'family'].includes(category)) return input;
  const life = structuredClone(input);
  applySpending(life,category,amount);
  updateCurrentHistory(life);
  return life;
}
function applySpending(life:Life,category:string,amount:number) {
  life.stats.savings -= amount;
  const benefit = Math.min(15, amount / Math.max(100, life.country.ppp) * 50);
  if (category === 'health') life.stats.health += benefit;
  if (category === 'education') addKnowledge(life, benefit);
  if (category === 'experiences') life.stats.happiness += benefit;
  if (category === 'giving') { life.stats.happiness += benefit * 0.7; life.stats.social += benefit * 0.5; }
  if (category === 'family') { life.stats.social += benefit; life.stats.happiness += benefit * 0.5; }
  event(life, `event.spend.${category}`, 'finance', '◈', { amount: round(amount) });
}
export function invest(input: Life, allocation: string): Life {
  if (!input.alive || input.pendingDecision || input.age < 18 || !ALLOCATIONS.includes(allocation as Allocation) || input.allocation === allocation) return input;
  const life = structuredClone(input);
  life.allocation = allocation as Allocation;
  if (allocation === 'cash') { life.stats.savings += life.stats.investments; life.stats.investments = 0; }
  else { const transfer = life.stats.savings * 0.45; life.stats.savings -= transfer; life.stats.investments += transfer; }
  event(life, 'event.invest', 'finance', '↗');
  updateCurrentHistory(life);
  return life;
}
export function addReflection(input: Life, text: string): Life {
  if (!input.alive || input.pendingDecision?.type !== 'reflection' || typeof text !== 'string') return input;
  const life = structuredClone(input);
  life.reflections[String(life.pendingDecision!.age)] = text.slice(0, 2000);
  life.pendingDecision = null;
  event(life, 'event.reflection', 'reflection', '✎');
  return life;
}

export function availableFocuses(life: Life): Focus[] {
  if (life.age < 6) return [];
  return FOCUSES.filter(focus => focus !== 'career' || (life.age >= 15 && life.age < 65 && life.stats.employment === 'employed'));
}
export function chooseHobby(input: Life, id: string): Life {
  if(input.academics?.origin==='birth'){
    if(!input.alive||input.pendingDecision||input.age<7||input.justice.prisonUntil!==null)return input;
    const life=structuredClone(input);if(!addObservedHobby(life,id as HobbyId))return input;
    event(life,'event.hobby','milestone','✧');refreshEducationContext(life);updateCurrentHistory(life);return life;
  }
  if (!input.alive || input.pendingDecision || input.age < 7 || input.hobbies.length >= 3 || !HOBBIES.includes(id as HobbyId) || input.hobbies.some(hobby => hobby.id === id)) return input;
  const life = structuredClone(input);
  const hobby={ id: id as HobbyId, skill: life.talents.includes(id as HobbyId) ? 10 : 5, trainedAt: -1,...(life.academics?.origin==='birth'?{progress:{since:life.age,level:0}}:{}) };
  if(life.academics?.origin==='birth')life.hobbies.unshift(hobby);else life.hobbies.push(hobby);
  event(life, 'event.hobby', 'milestone', '✧');
  refreshEducationContext(life);
  return life;
}
export function requestHobbyChoices(input:Life):Life {
 if(!hobbySearchAvailable(input))return input;
 const price=hobbySearchPrice(input);if(!hobbyPurchaseAllowed(hobbyPurchasePlan(input,price)))return input;
 const life=structuredClone(input);if(!payHobbyPurchase(life,price))return input;
 life.hobbyState={...life.hobbyState,version:1,lastActionAge:life.age};
 const timeline=life.timeline;
 if(timeline&&!timeline.complete&&timeline.position<.95&&(timeline.scheduledDecisions?.length??0)<2){
  const decision=prepareHobbyDecision(life,()=>random(life),true);
  if(!decision)return input;
  timeline.queue.push({kind:'decision',id:decision.id,at:Math.min(.97,timeline.position+.04)});timeline.queue.sort((a,b)=>a.at-b.at);
  (timeline.scheduledDecisions??=[]).push(decision);timeline.scheduledDecisions.sort((a,b)=>timeline.queue.findIndex(s=>s.id===a.id)-timeline.queue.findIndex(s=>s.id===b.id));
 }else life.hobbyState.queuedAge=life.age+1;
 updateCurrentHistory(life);return life;
}
export function toggleHobbySpending(input:Life):Life {
 if(hobbySpendingAccess(input)!=='available')return input;
 const life=structuredClone(input);
 life.hobbyState={...life.hobbyState,version:1};
 const wasPaused=life.hobbyState.pausedSince!==undefined;
 if(wasPaused)delete life.hobbyState.pausedSince;else life.hobbyState.pausedSince=life.age;
 event(life,wasPaused?'event.hobbySpendingResumed':'event.hobbySpendingPaused','finance','✧');
 updateBudget(life);updateCurrentHistory(life);return life;
}
export function toggleAutomaticHobbyLessons(input:Life):Life {
 if(!automaticLessonsAvailable(input))return input;
 const life=structuredClone(input);life.hobbyState={...life.hobbyState,version:1};
 const enabled=!!life.hobbyState.automaticLessons;
 if(enabled)delete life.hobbyState.automaticLessons;else life.hobbyState.automaticLessons={since:life.age,pausedForFunds:false};
 event(life,enabled?'event.hobbyAutoOff':'event.hobbyAutoOn','finance','✧',{hobby:automaticLessonTarget(life)?hobbyDisplayId(life,automaticLessonTarget(life)!.id):''});
 updateCurrentHistory(life);return life;
}
export function hobbyTrainingPrice(life: Life, _id: string): number { if(life.academics?.origin==='birth'&&life.hobbies.find(h=>h.id===_id)?.progress)return hobbyLessonPrice(life);return life.age < 18 ? 0 : round(Math.max(1, life.country.ppp * eraIncome(life.era) * 0.002)); }
export function trainHobby(input: Life, id: string): Life {
  const hobby = input.hobbies.find(hobby => hobby.id === id);
  if(isNamedSport(id)&&(!hobby?.progress||input.academics?.origin!=='birth'||hobbyPracticeBlocked(input,id)))return input;
  const price = hobbyTrainingPrice(input, id);
  if(input.academics?.origin==='birth'&&hobby?.progress){
    if(!input.alive||input.pendingDecision||input.age<15||input.justice.prisonUntil!==null||!hobby?.progress||!hobbyDefinition(id)||hobbyPracticeBlocked(input,id)||input.hobbyState?.lastActionAge===input.age||!hobbyPurchaseAllowed(hobbyPurchasePlan(input,price)))return input;
    const life=structuredClone(input),target=life.hobbies.find(h=>h.id===id)!;
    if(!payHobbyPurchase(life,price))return input;
    target.progress!.level=Math.min(1000,target.progress!.level+hobbyLessonGain(life,target));target.trainedAt=life.age;
    life.hobbyState={...life.hobbyState,version:1,lastActionAge:life.age,lessonHobby:target.id};life.stats.happiness=Math.min(100,life.stats.happiness+3);
    refreshEducationContext(life);event(life,'event.hobbyTraining','everyday','✧');updateCurrentHistory(life);return life;
  }
  if (!input.alive || input.pendingDecision || !hobby || hobby.skill >= 100 || hobby.trainedAt === input.age || input.stats.savings < price) return input;
  const life = structuredClone(input), trained = life.hobbies.find(hobby => hobby.id === id)!;
  trained.skill = round(clamp(trained.skill + (life.talents.includes(trained.id) ? 5 : 3)));
  trained.trainedAt = life.age; life.stats.savings -= price;
  life.stats.happiness += 0.7;
  event(life, 'event.hobbyTraining', 'everyday', '✧'); updateCurrentHistory(life);
  return life;
}
export function purchasePrice(life: Life, category: string): number {
  const factors: Record<string, number> = { phone: 0.015, bicycle: 0.025, car: 0.6, housing: 3 };
  return Object.hasOwn(factors, category) ? round(Math.max(1, life.country.ppp * eraIncome(life.era) * factors[category])) : Infinity;
}
export function buyBelonging(input: Life, category: string): Life {
  const price = purchasePrice(input, category);
  if (!input.alive || input.pendingDecision || input.stats.savings < price || input.age < (category === 'phone' || category === 'bicycle' ? 12 : 18)) return input;
  if ((category === 'phone' && (input.belongings.phone || input.year < 2000)) || (category === 'bicycle' && input.belongings.transport !== 'none') || (category === 'car' && input.belongings.transport === 'car') || (category === 'housing' && input.belongings.housing === 'owned')) return input;
  const life = structuredClone(input);
  if (category === 'phone') { life.belongings.phone = true; life.stats.social += 2; }
  else if (category === 'bicycle' || category === 'car') life.belongings.transport = category;
  else if (category === 'housing') { life.belongings.housing = 'owned'; life.belongings.housingValue = price; }
  else return input;
  life.stats.savings -= price; life.stats.happiness += 1;
  event(life, 'event.purchase', 'finance', '◈', { amount: price });
  updateBudget(life); updateCurrentHistory(life);
  return life;
}
function jobSearchEligible(life: Life): boolean {
  return !life.academics?.circumstances?.developmentalProtection && life.alive && life.age >= 15 && life.age < 65 && !life.schooling.enrolled && life.justice.prisonUntil === null && life.care.who !== 'self' && life.training.kind === null && !life.decisions.includes(`job-${life.age}`);
}
export function requestJobOffers(input: Life): Life {
  if (input.pendingDecision || hasQueuedJobDecision(input) || !jobSearchEligible(input)) return input;
  const life = structuredClone(input);
  const roles: Job[] = life.stats.education >= 4 ? ['engineer', 'teacher', 'nurse'] : life.residence === 'rural' ? ['farmer', 'artisan', 'service'] : ['service', 'artisan', 'entrepreneur'];
  const qualified = [life.stats.job,life.care.previousJob,life.training.previousJob,...life.career.slice().reverse().map(record=>record.job)].find(job => job==='mechanic'||job==='hairdresser');
  if(qualified)roles[0]=qualified;
  delete life.jobOfferBatch;
  life.jobOffers = roles.map((job, index) => ({ id: `offer${index}`, job,
    income: round(life.country.ppp * eraIncome(life.era) * (life.stats.education >= 4 ? 0.8 : job==='mechanic'||job==='hairdresser'?0.65:0.3) * (0.85 + random(life) * 0.4 + index * 0.08) * (life.residence === 'urban' ? 1.15 : 1)) }));
  life.pendingDecision = { id: `job-${life.age}`, type: 'choice', age: life.age, key: 'decision.job', params: {}, choices: [
    ...life.jobOffers.map((offer, index) => ({ id: offer.id, key: `choice.offer${index}`, params: { amount: offer.income } })),
    { id: 'wait', key: 'choice.wait', params: {} },
  ] };
  return life;
}
export function relocationPrice(life: Life): number { return round(life.country.ppp * eraIncome(life.era) * 0.03); }
export function relocate(input: Life): Life {
  if (!input.alive || input.pendingDecision || input.justice.prisonUntil !== null || input.age < 16 || input.residence === 'urban') return input;
  const life = structuredClone(input), cost = relocationPrice(life);
  const paid = Math.min(cost, life.stats.savings);
  life.stats.savings -= paid; life.stats.debt += cost - paid;
  life.residence = 'urban';
  if (life.belongings.housing !== 'owned') life.belongings.housing = 'rent';
  addKnowledge(life, 3); life.stats.social -= 2;
  event(life, 'event.relocation', 'milestone', '↗');
  updateBudget(life); updateCurrentHistory(life);
  if (!life.schooling.enrolled && life.stats.employment !== 'retired') {
    life.decisions = life.decisions.filter(id => id !== `job-${life.age}`);
    life.stats.employment = 'unemployed'; life.stats.annualIncome = 0;
    // Build offers while the former trade still establishes qualification.
    const seeking = requestJobOffers(life);
    seeking.stats.job = 'none';
    updateBudget(seeking); updateCurrentHistory(seeking);
    return seeking;
  }
  return life;
}

export function setLifestyle(input:Life,key:string,value:string):Life {
  const values:Record<string,string[]>={diet:['balanced','healthy','convenient'],insurance:['basic','full'],gifts:['generous','modest','attendance']};
  if(!input.alive||input.pendingDecision||input.age<18||!Object.hasOwn(values,key)||!values[key].includes(value))return input;
  if(input.lifestyle[key as keyof Life['lifestyle']]===value)return input;
  const life=structuredClone(input);(life.lifestyle as Record<string,string>)[key]=value;
  event(life,'event.lifestyle','decision','◎');updateBudget(life);updateCurrentHistory(life);return life;
}
export function setAnnualSpending(input:Life,category:string,amount:number):Life {
  amount=round(amount);
  if(!input.alive||input.pendingDecision||input.age<18||!SPENDING_CATEGORIES.includes(category as SpendingCategory)||!Number.isFinite(amount)||amount<0||amount>1e9)return input;
  if(input.annualSpending[category as SpendingCategory]===amount)return input;
  const life=structuredClone(input);life.annualSpending[category as SpendingCategory]=amount;
  event(life,'event.annualPlan','finance','◎');return life;
}
export function activityPrice(life:Life,id:string):number {
  const rates:Record<string,number>={business:0.25,dreamJob:0.03,migration:0.5,nightSchool:0.02,adoptPet:0.005};
  return round(life.country.ppp*eraIncome(life.era)*(Object.hasOwn(rates,id)?rates[id]:0));
}
export function availableActivities(life:Life):string[] {
  if(!life.alive||life.pendingDecision||life.justice.prisonUntil!==null)return [];
  const ids:string[]=[];
  if(canAskChildren(life))ids.push('askKids');
  if(life.age>=6&&life.pets.length<3&&life.stats.savings>=activityPrice(life,'adoptPet'))ids.push('adoptPet');
  if(life.age>=18&&life.age<65){
    const maxPlanAge = (life.sex === 'M' || (life.family.secondPartner && life.family.secondPartner.age <= 45)) ? 55 : 45;
    if(life.age>=24&&life.age<=maxPlanAge&&(life.family.partner?.alive || life.family.secondPartner?.alive)&&['married','cohabiting'].includes(life.relationship.status)&&life.family.children.length<FAMILY_LIMITS.children)ids.push('familyPlanning');
    if(!life.training.kind&&!life.schooling.enrolled&&life.care.who!=='self'){
      if(life.stats.savings>=activityPrice(life,'business'))ids.push('business');
      if(life.stats.knowledge>=30&&life.stats.education>=2&&life.stats.savings>=activityPrice(life,'dreamJob'))ids.push('dreamJob');
      if(life.stats.education<3)ids.push('nightSchool');
      if(life.migration.moves.length<3&&(life.migration.lastMoveAge===null||life.age-life.migration.lastMoveAge>=5)&&life.stats.savings>=activityPrice(life,'migration')*0.2&&countries.some(country=>country.ppp>life.country.ppp*1.15&&country.pop>1000))ids.push('migration');
    }
    if(life.family.partner?.alive&&['married','cohabiting'].includes(life.relationship.status))ids.push('divorce');
  }
  return ids.filter(id=>!life.decisions.includes(`activity-${id}-${life.age}`));
}
export function requestActivity(input:Life,id:string):Life {
  if(!availableActivities(input).includes(id))return input;
  const life=structuredClone(input);
  if(id==='askKids'){
    const result=settleRequestedChildHelp(life,()=>random(life));if(!result)return input;
    const names=(ids:string[])=>{const value=ids.map(id=>life.family.children.find(c=>c.id===id)!.name).join(', ');return value.length<=200?value:value.slice(0,197)+'…';};
    if(result.accepted.length)event(life,'event.childHelpReceived','finance','♡',{names:names(result.accepted),amount:result.amount});
    if(result.declined.length)event(life,'event.childHelpDeclined','family','◦',{names:names(result.declined)});
    updateBudget(life);updateCurrentHistory(life);return life;
  }
  const choices:Record<string,string[]>={familyPlanning:['haveChild','waitChild','childfree'],business:['startBusiness','keepJob'],dreamJob:['pursueDream','keepJob'],divorce:['leaveRelationship','keepTogether'],nightSchool:['nightSchool','laterSchool'],migration:['migrateTogether','migrateAlone','stay'],adoptPet:[...PET_KINDS,'noPet']};
  const keys:Record<string,string>={familyPlanning:'children',adoptPet:'pet'};
  if(id==='migration')life.migration.offerCountry=structuredClone(pick(life,countries.filter(country=>country.ppp>life.country.ppp*1.15&&country.pop>1000)));
  life.pendingDecision={id:`activity-${id}-${life.age}`,type:'choice',age:life.age,key:`decision.${keys[id]??id}`,params:{},choices:choices[id].map(choice=>({id:choice,key:PET_KINDS.includes(choice as PetKind)?`pet.${choice}`:`choice.${choice}`,params:{}}))};
  return life;
}
export function adoptPet(input:Life,kind:string,name=''):Life {
  if(!input.alive||input.pendingDecision||input.justice.prisonUntil!==null||input.age<6||!PET_KINDS.includes(kind as PetKind)||input.pets.length>=3||typeof name!=='string'||input.stats.savings<activityPrice(input,'adoptPet'))return input;
  const life=structuredClone(input);life.stats.savings-=activityPrice(life,'adoptPet');
  life.pets.push({id:`pet-${life.age}-${life.pets.length}`,kind:kind as PetKind,name:name.trim().slice(0,40),age:0,alive:true});life.stats.happiness+=2;
  event(life,'event.pet','family','♡');updateBudget(life);updateCurrentHistory(life);return life;
}
