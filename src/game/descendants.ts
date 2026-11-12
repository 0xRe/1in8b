import {OCCUPATION_NAMES} from './job-identities';
import type {OccupationId} from './occupations';
import {childSupportedWork,childWorkResidence} from './child-supported-work';
import {drawBirthDevelopment} from './birth-development';
import {childLeaveAge,childDeparture,type ChildHomeDecision} from './child-home';
import {childWeddingHome} from './child-wedding-home';
import {childBoard} from './child-board';
import {childSupport} from './child-support';
import {incomeAtPercentile} from './income-distribution';
import {childRetirementAge} from './child-retirement';
import {childUniversityCost,resolveChildUniversityFunding} from './child-university-funding';
import {advanceChildAdmission,childAdmissionProbability,childHomeQuintile,childDevelopmentAdmission} from './child-admission';
import {educationAccess} from './education-access';
import {educationEraInputs} from './education-era';
import {householdIncomePercentile} from './household-percentile';
import {childImprisoned, childUniversityEndAge, childPrisonChance, drawChildSentence} from './child-prison';
import {childBirthOutcome} from './child-birth';
import {universityMarriageAge,drawChildMarriageAge,advanceChildDisclosure,initializeChildUnionPlan,childMarriageBaseline,updateChildFertilityTarget,advanceChildCohabitation,unionAvailability,canFormSameSexFamily,sameSexParentMethod} from './child-union';
import { laterGenerationsYear } from "./later-generations";
import { getCountries } from "./countries";
import type {
  ChildProgress,
  Country,
  Decision,
  Descendants,
  EventParams,
  Job,
  Grandchild,
  GrandchildOrigin,
  Life,
  Person,
  Sex,
} from "./types";
const countries = getCountries();
import { MAX_CHILD_GRANDCHILDREN,MAX_GRANDCHILDREN } from "./family-limits";
export { FAMILY_LIMITS, MAX_CHILD_GRANDCHILDREN, MAX_GRANDCHILDREN, MAX_RELATIVES } from "./family-limits";
const round = (n: number) => Math.round(n * 100) / 100;
function random(state: { rng: number }) {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let v = state.rng;
  v = Math.imul(v ^ (v >>> 15), v | 1);
  v ^= v + Math.imul(v ^ (v >>> 7), v | 61);
  return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
}
const countryOf = (id: string) => countries.find((c) => c.id === id)!;
const legacyJobStories:Partial<Record<Job,string>> = {
    cleaner: "as a cleaner", warehouse: "as a warehouse worker", cook: "as a cook",
    shop: "as a shop assistant", factory: "as a factory worker", vendor: "as a market vendor",
    dayActivities: "in supported daily activities",
    shelteredWork: "in a supported workshop",
    soldier: "as a professional soldier",
    childwork: "doing childhood work",
    farmer: "as a farmer",
    artisan: "as an artisan",
    service: "as a service worker",
    teacher: "as a teacher",
    nurse: "as a nurse",
    engineer: "as an engineer",
    entrepreneur: "as an entrepreneur",
    mechanic: "as a mechanic",
    hairdresser: "as a hairdresser",
    none: "in a new role",
    student: "in a student role",
    retired: "before retirement",
  };
const jobStory=(job:Job):string=>legacyJobStories[job]??`working in the role of ${OCCUPATION_NAMES[(job==='conscription'?'service':job) as OccupationId]}`;
const incomeBase = (life: Life, country: Country) =>
  country.ppp * (life.era === "past" ? 0.65 : life.era === "future" ? 1.35 : 1);
export function emptyDescendants(seed: number, year: number): Descendants {
  return {
    rng: (seed ^ 0xa341316c) >>> 0,
    observedSince: year,
    lastYear: year,
    children: [],
    grandchildren: [],
    annualTransfers: 0,
    totalTransfers: 0,
  };
}
export function addChildProgress(life: Life, child: Person, legacy = false): ChildProgress {
  const state = life.descendants;
  const old = state.children.find((c) => c.childId === child.id);
  if (old) return old;
  const progress = createProgress(life, child, legacy);
  // Only actual new births gain a new identity plan; old observed lives retain unknown history.
  if (!legacy && child.age === 0 && child.birthYear === life.year) {
    const country = countryOf(child.country);
    progress.birthDevelopment=drawBirthDevelopment(child.sex,educationEraInputs(country,life.era,life.year).statistics.ppp,()=>random(state));
    progress.unionPlan = initializeChildUnionPlan({age: child.age, year: life.year,
      sex: child.sex, country, weddingAge: progress.weddingAt, spouseSex: null, legacy: false,
      marriageBaseline: childMarriageBaseline(country, child.sex, life.era === "past" ? life.year : undefined),
    }, () => random(state));
  }
  state.children.push(progress);
  return progress;
}
function createProgress(
  life: Life,
  child: Pick<Person, "id" | "age" | "country" | "job" | "sex">,
  legacy = false,
): ChildProgress {
  const state = life.descendants;
  const adult = child.age >= 19;
  const progress: ChildProgress = {
    childId: child.id,
    education:
      legacy && adult
        ? "unknown"
        : child.age < 6
          ? "preschool"
          : child.age < 19
            ? "school"
            : "secondary",
    employment: adult
      ? legacy && !["none", "student", "retired"].includes(child.job)
        ? "employed"
        : child.job === "retired"
          ? "retired"
          : "unemployed"
      : child.age >= 6
        ? "student"
        : "none",
    income: 0,
    level: 0,
    studyUntil: null,
    studyFunding: null,
    universityResolved: child.age > 19,
    spouse: null,
    marriedYear: null,
    weddingAt: !legacy && child.age === 0 ? drawChildMarriageAge(countryOf(child.country), child.sex, life.era === "past" ? life.year : undefined, () => random(state)) : Math.max(child.age + 1, 23 + Math.floor(random(state) * 7)),
    weddingResolved: false,
    residence: legacy && (adult || child.country !== life.country.id) ? "independent" : "home",
    migrationAt: Math.max(child.age + 3, 28 + Math.floor(random(state) * 7)),
    migrationResolved: false,
    originCountry: child.country,
    migratedYear: null,
    lastVisitYear: null,
    firstPayYear: null,
    firstPayStatus: legacy && adult ? "unknown" : "pending",
    contribution: 0,
  };
  return progress;
}
/** One progression engine, with home always relative to the immediate parent. */
export function descendantSubjects(life: Life) {
  return [
    ...life.family.children.map((person) => ({
      person,
      state: life.descendants.children.find((c) => c.childId === person.id)!,
      parentCountry: life.country.id,
      generation: 1,
    })),
    ...life.descendants.grandchildren.map((person) => ({
      person,
      state: person,
      parentCountry: life.family.children.find((c) => c.id === person.parentId)!.country,
      generation: 2,
    })),
  ];
}
export function descendantSubject(life: Life, id: string) {
  return descendantSubjects(life).find(({ person }) => person.id === id);
}
export const descendantOptions = {
  reunion: ["welcomeChildBack", "needTimeWithChild"],
  university: ["fundUniversity", "scholarshipWork", "startChildWork"],
  wedding: ["generousWedding", "modestWedding"],
  migration: ["supportChildMove", "childStay"],
} as const;
export function descendantChoiceIds(state:ChildProgress|undefined,kind:DescendantChoice):readonly string[] {
  return kind === "university" && state?.universityFunding
    ? ["fundUniversity","shareUniversity","scholarshipWork"] : descendantOptions[kind];
}
export const descendantKeys = {
  reunion: "descendantReunion",
  university: "descendantUniversity",
  wedding: "descendantWedding",
  migration: "descendantMigration",
} as const;
export type DescendantChoice = keyof typeof descendantOptions;
export function parseDescendantDecision(id: unknown): {
  kind: DescendantChoice;
  childId: string;
} | null {
  if (typeof id !== "string") return null;
  const match = /^descendant-(university|wedding|migration|reunion)-(.+)$/.exec(id);
  return match ? { kind: match[1] as DescendantChoice, childId: match[2] } : null;
}
function destination(life: Life, child: Person): Country {
  const candidates = countries.filter((c) => c.id !== child.country && c.war < 2);
  // Offer selection consumes no RNG, so reopening and validating an offer is inert.
  let hash = life.seed;
  for (const c of child.id) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
  return candidates[hash % candidates.length];
}
export function descendantChoiceCost(
  life: Life,
  child: Person,
  kind: DescendantChoice,
  choice: string,
): number {
  const funding = descendantSubject(life,child.id)?.state.universityFunding;
  if (kind === "university" && funding) return round(choice === "fundUniversity" ? funding.packageCost : choice === "shareUniversity" ? funding.packageCost/2 : 0);
  const base = incomeBase(life, countryOf(child.country));
  return round(
    kind === "university" && choice === "fundUniversity"
      ? base * 0.18
      : kind === "wedding"
        ? base * (choice === "generousWedding" ? 0.08 : 0.02)
        : kind === "migration" && choice === "supportChildMove"
          ? base * 0.06
          : 0,
  );
}
export function descendantDecision(life: Life, child: Person, kind: DescendantChoice): Decision {
  return {
    id: `descendant-${kind}-${child.id}`,
    type: "choice",
    age: life.age,
    key: `decision.${descendantKeys[kind]}`,
    params: {
      name: child.name,
      ...(kind === "migration" ? { country: destination(life, child).name_en } : {}),
    },
    choices: descendantChoiceIds(descendantSubject(life,child.id)?.state,kind).map((id) => ({
      id,
      key: `choice.${id}`,
      params: { amount: descendantChoiceCost(life, child, kind, id) },
    })),
  };
}
/** Shared by offer selection, runtime settlement and save validation. */
export function canResolveDescendantChoice(child: Person, state: ChildProgress, kind: DescendantChoice, year: number): boolean {
  if (!child.alive || childImprisoned(child.alive, state.prison, year)) return false;
  if (kind === "reunion") return state.prison?.releasedYear != null && state.prison.releasedYear <= year && !state.prison.reunion;
  if (kind === "university") return !state.universityResolved && (state.admission
    ? child.age >= 18 && child.age < 23 && state.admission.path === "pending"
    : child.age === 19);
  if (kind === "wedding") return child.age >= 18 && child.age <= 65 && state.weddingAt !== null && child.age >= state.weddingAt && !state.weddingResolved && !state.spouse && (!state.unionPlan?.sameSexPartner || unionAvailability(child.country, year) === "marriage");
  return child.age >= 21 && child.age <= 60 && child.age >= state.migrationAt && !state.migrationResolved;
}
/** Refresh queued family offers after state changes, without executing a choice. */
export function refreshScheduledFamilyDecisions(life: Life): void {
  const timeline = life.timeline;
  if (!timeline?.scheduledDecisions || timeline.year !== life.year || timeline.age !== life.age) return;
  const retained: Decision[] = [];
  const removed = new Set<string>();
  for (const decision of timeline.scheduledDecisions) {
    const parsed = parseDescendantDecision(decision.id);
    if (!parsed) { retained.push(decision); continue; }
    const subject = descendantSubject(life, parsed.childId);
    if (!life.alive || !subject || life.decisions.includes(decision.id) || life.pendingDecision?.id === decision.id ||
        !canResolveDescendantChoice(subject.person, subject.state, parsed.kind, life.year)) {
      removed.add(decision.id);
      continue;
    }
    retained.push(descendantDecision(life, subject.person, parsed.kind));
  }
  timeline.scheduledDecisions = retained;
  timeline.queue = timeline.queue.filter(slot => slot.kind !== 'decision' || !removed.has(slot.id));
}

export function nextDescendantDecision(life: Life): Decision | null {
  if (!life.alive || life.pendingDecision) return null;
  for (const { person: child, state } of descendantSubjects(life)) {
    if (!child.alive) continue;
    if (!state) continue;
    for (const kind of ["reunion", "university", "wedding", "migration"] as const)
      if (canResolveDescendantChoice(child, state, kind, life.year) && !life.decisions.includes(`descendant-${kind}-${child.id}`))
        return descendantDecision(life, child, kind);
  }
  return null;
}
export interface DescendantHooks {
  event: (life: Life, key: string, kind: "family", icon: string, params?: EventParams) => void;
  name: (
    state: {
      rng: number;
    },
    country: Country,
    sex: Sex,
  ) => string;
  mortality: (country: Country, sex: Sex, age: number, era: Life["era"]) => number;
}
function descendantId(life: Life, base: string): string {
  const used = new Set([...familyMembers(life), ...life.companions].map((person) => person.id));
  let id = base,
    suffix = 0;
  while (used.has(id)) id = `${base}-${++suffix}`;
  return id;
}
function startWork(life: Life, child: Person, state: ChildProgress, hooks: DescendantHooks) {
  const country = countryOf(child.country),
    educated = state.education === "graduate";
  const jobs: Job[] = educated && !state.prison
    ? ["teacher", "nurse", "engineer"]
    : ["farmer", "service", "mechanic", "hairdresser"];
  child.job = jobs[Math.floor(random(life.descendants) * jobs.length)];
  state.employment = "employed";
  state.income = round(
    incomeBase(life, country) * (educated ? 0.7 : 0.3) * (1 + state.level * 0.1),
  );
  hooks.event(life, "event.descendantJob", "family", "↗", {
    name: child.name,
    job: jobStory(child.job),
  });
}
function transfer(life: Life, state: ChildProgress, amount: number) {
  amount = round(amount);
  state.contribution = round(state.contribution + amount);
  life.descendants.annualTransfers = round(life.descendants.annualTransfers + amount);
  life.descendants.totalTransfers = round(life.descendants.totalTransfers + amount);
}
function recordChildHome(life:Life,state:ChildProgress,outcome:'stay'|'leave',reason:ChildHomeDecision['reason']) {
  if(state.homePlan){
    if(outcome==='stay')state.homePlan.staying=true;else state.homePlan.left=true;
    state.homePlan.decision??={year:life.year,outcome,reason};
  }
  if(outcome==='leave'&&state.residence==='home'){
    state.residence='independent';life.stats.happiness+=1;
  }
}
function settleChildWeddingHome(life:Life,child:Person,state:ChildProgress) {
  const others=life.family.children.filter(c=>c.id!==child.id&&c.alive);
  const outcome=childWeddingHome({country:life.country.id,region:life.country.region,sex:child.sex,
    independent:state.residence==='independent',staying:state.homePlan?.staying??false,
    parentImprisoned:life.justice.prisonUntil!==null,childImprisoned:childImprisoned(child.alive,state.prison,life.year),
    lastChild:!others.some(c=>{const s=life.descendants.children.find(s=>s.childId===c.id);return s?.residence==='home'&&!s.homePlan?.left;}),
    otherStaying:life.descendants.children.some(s=>s.childId!==child.id&&(s.homePlan?.staying||s.residence==='home'&&s.marriedYear!==null))},()=>random(life.descendants));
  state.weddingHome={year:state.marriedYear!,outcome,resolvedYear:outcome==='pending'?null:life.year};
  if(outcome==='leave'||outcome==='stay')recordChildHome(life,state,outcome,'wedding');
  else if(outcome==='independent'&&state.homePlan)state.homePlan.left=true;
  return outcome;
}
export function resolveDescendantDecision(
  life: Life,
  choiceId: string,
  hooks: DescendantHooks,
): boolean {
  const parsed = parseDescendantDecision(life.pendingDecision?.id);
  if (!parsed || !life.alive || life.pendingDecision?.age !== life.age || life.decisions.includes(life.pendingDecision.id)) return false;
  const subject = descendantSubject(life, parsed.childId);
  const child = subject?.person,
    state = subject?.state;
  if (!child || !state || !canResolveDescendantChoice(child, state, parsed.kind, life.year) || !descendantChoiceIds(state,parsed.kind).includes(choiceId))
    return false;
  if (parsed.kind === "reunion") {
    const welcome = choiceId === "welcomeChildBack";
    state.prison!.reunion = {choice: welcome ? "welcome" : "time", year: life.year, reconciledYear: null};
    if (!welcome) life.descendants.pendingReconciliation = {childId: child.id, year: life.year};
    state.bond = (state.bond ?? 0) + (welcome ? 8 : -2);
    life.stats.happiness = Math.max(0, Math.min(100, life.stats.happiness + (welcome ? 4 : -2)));
    if (welcome) life.stats.social = Math.min(100, life.stats.social + 3);
    hooks.event(life, welcome ? "event.descendantWelcome" : "event.descendantNeedTime", "family", "♡", {name: child.name});
    return true;
  }
  if (parsed.kind === "university" && state.universityFunding) {
    const receipt=state.universityFunding;
    if(receipt.result)return false;
    const result=resolveChildUniversityFunding(choiceId === "fundUniversity" ? "full" : choiceId === "shareUniversity" ? "half" : "self",receipt.packageCost,life.stats.savings,()=>random(life.descendants));
    receipt.result=result;
    const paid=Math.min(life.stats.savings,result.cost);
    life.stats.savings=round(life.stats.savings-paid);life.stats.debt=round(life.stats.debt+result.cost-paid);
    life.stats.happiness=Math.max(0,Math.min(100,life.stats.happiness+result.happiness));
    life.stats.social=Math.max(0,Math.min(100,life.stats.social+result.social));
    state.bond=(state.bond??0)+result.bond;state.universityResolved=true;state.income=0;
    if(result.outcome === "withdrawn") {
      state.admission!.path="work";state.education="secondary";state.employment="none";child.job="none";
      state.studyUntil=null;state.studyFunding=null;
    } else {
      state.admission!.path="university";state.education="university";state.employment="student";child.job="student";
      state.studyUntil=child.birthYear+childUniversityEndAge(child.birthYear,state.prison);
      state.studyFunding=result.outcome === "funded" ? "parent" : result.outcome === "shared" ? "shared" : "self";
    }
    hooks.event(life,`event.childFunding.${result.outcome}`,"family",result.outcome === "withdrawn" ? "◦" : "🎓",{name:child.name,amount:round(result.cost)});
    return true;
  }
  const cost = descendantChoiceCost(life, child, parsed.kind, choiceId),
    paid = Math.min(life.stats.savings, cost);
  life.stats.savings = round(life.stats.savings - paid);
  life.stats.debt = round(life.stats.debt + cost - paid);
  if (parsed.kind === "university") {
    state.universityResolved = true;
    if (choiceId === "startChildWork") {
      if (state.admission) state.admission.path = "work";
      state.education = "secondary";
      startWork(life, child, state, hooks);
    } else {
      if (subject.generation === 1 && !state.admission) state.weddingAt = universityMarriageAge(state.weddingAt, child.age, state.marriedYear !== null, () => random(life.descendants));
      if (state.admission) state.admission.path = "university";
      state.education = "university";
      state.employment = "student";
      child.job = "student";
      state.income = 0;
      state.studyUntil = state.admission ? child.birthYear + childUniversityEndAge(child.birthYear, state.prison) : life.year + 4;
      state.studyFunding = choiceId === "fundUniversity" ? "parent" : "self";
      hooks.event(life, "event.descendantUniversity", "family", "🎓", {
        name: child.name,
        amount: cost,
      });
    }
  } else if (parsed.kind === "wedding") {
    state.weddingResolved = true;
    if (state.spouse) return false;
    const country = countryOf(child.country),
      sex = state.unionPlan?.sameSexPartner ? child.sex : child.sex === "M" ? "F" : "M",
      age = Math.max(18, Math.min(65, child.age + Math.floor(random(life.descendants) * 5) - 2));
    state.spouse = {
      id: descendantId(
        life,
        `descendant-spouse-${descendantSubjects(life).findIndex((s) => s.person.id === child.id)}`,
      ),
      name: hooks.name(life.descendants, country, sex),
      sex,
      country: child.country,
      age,
      birthYear: life.year - age,
      alive: true,
      deathAge: null,
      job: "service",
    };
    state.marriedYear = life.year;
    if(subject.generation===1)settleChildWeddingHome(life,child,state);
    else state.residence =
      random(life.descendants) < 0.4 && child.country === subject.parentCountry
        ? "home"
        : "independent";
    hooks.event(life, "event.descendantWedding", "family", "♡", {
      name: child.name,
      spouse: state.spouse.name,
      amount: cost,
    });
    if(state.weddingHome?.outcome!=='pending')hooks.event(life, "event.descendantHome", "family", "⌂", {
      name: child.name,
      residence:
        state.residence === "home"
          ? subject!.generation === 2
            ? "with their parent"
            : "with you"
          : "independently",
    });
  } else {
    state.migrationResolved = true;
    if (choiceId === "supportChildMove") {
      const target = destination(life, child),
        old = countryOf(child.country);
      child.country = target.id;
      state.residence = "independent";
      if(state.homePlan)state.homePlan.left=true;
      state.migratedYear = life.year;
      state.income = round((state.income * target.ppp) / old.ppp);
      if (state.spouse?.alive) state.spouse.country = target.id;
      for (const grandchild of life.descendants.grandchildren) {
        if (grandchild.parentId !== child.id || !grandchild.alive || grandchild.origin?.household === "otherParent") continue;
        if (grandchild.age < 18 && grandchild.residence === "home") grandchild.country = target.id;
        else if (grandchild.residence === "home") grandchild.residence = "independent";
      }
      for (const later of life.descendants.greatGrandchildren ?? [])
        if (later.grandchildId === child.id && later.alive && later.age < 18) later.country = target.id;
      hooks.event(life, "event.descendantMigration", "family", "↗", {
        name: child.name,
        country: target.name_en,
        amount: cost,
      });
    } else hooks.event(life, "event.descendantStay", "family", "⌂", { name: child.name });
  }
  return true;
}
/** Called once after existing children have aged and before this year's budget is paid. */
export function yearlyDescendants(life: Life, hooks: DescendantHooks) {
  const all = life.descendants;
  if (all.lastYear === life.year) return;
  all.lastYear = life.year;
  all.annualTransfers = 0;
  const emit = (key: string, params: EventParams) => hooks.event(life, key, "family", "🌱", params);
  const births: { baby: Grandchild; parent: string }[] = [];
  const agePerson = (person: Person) => {
    if (!person.alive) return;
    if (
      random(all) < hooks.mortality(countryOf(person.country), person.sex, person.age, life.era)
    ) {
      person.alive = false;
      person.deathAge = person.age;
      emit("event.familyDeath", { name: person.name });
    } else person.age++;
  };
  // Age only the already-existing generation; births below remain age zero this year.
  for (const grandchild of all.grandchildren) if (grandchild.alive) grandchild.age++;
  for (const child of life.family.children) addChildProgress(life, child);
  // A year-addressed stream prevents adding this lifecycle from rerolling unrelated family plans.
  const custodyRandom = {rng: (life.seed ^ Math.imul(life.year, 0x9e3779b1) ^ 0x41c64e6d) >>> 0};
  const householdPercentile = householdIncomePercentile(life.country, life.stats.annualIncome,
    life.relationship.status === "married" && life.family.partner?.alive ? life.relationship.partnerIncome : 0);
  const sentencedChildren = all.children.filter(c => c.prison).length;
  for (const child of life.family.children) {
    const state = all.children.find(c => c.childId === child.id)!;
    const chance = childPrisonChance({playerAge: life.age, playerImprisoned: life.justice.prisonUntil !== null,
      householdPercentile, playerPrisonHistory: life.events.some(e => e.key === "event.prison"),
      country: life.country.id, childAge: child.age, sex: child.sex, alive: child.alive,
      priorSentence: !!state.prison, placement: false, abroad: child.country !== life.country.id,
      weddingThisYear: state.marriedYear === life.year, sentencedChildren});
    if (chance === 0 || random(custodyRandom) >= chance) continue;
    const years = drawChildSentence(() => random(custodyRandom));
    state.prison = {startYear: life.year, endYear: life.year + years, releasedYear: null};
    if (child.age === 19 && !state.universityResolved) {
      state.universityResolved = true;
      if (state.admission) state.admission = {attemptedAge:19,path:"work"};
      if(state.universityFunding&&!state.universityFunding.result)delete state.universityFunding;
    }
    state.bond = (state.bond ?? 0) - 4;
    life.stats.happiness -= 8;
    life.stats.social -= 2;
    emit("event.descendantSentenced", {name: child.name, years});
    break;
  }
  const homeRandom={rng:(life.seed^Math.imul(life.year,0x9e3779b1)^0x724b53a1)>>>0};
  // A snapshot excludes newborns; both generations share education, work and household rules.
  for (const { person: child, state, parentCountry, generation } of descendantSubjects(life)) {
    state.contribution = 0;
    if (state.spouse) agePerson(state.spouse);
    if (!child.alive) continue;
    if(generation===1&&child.age>=15){
      state.homePlan??={version:1,observedYear:life.year,country:life.country.id,
        leaveAge:childLeaveAge(life.country,child.sex,()=>random(homeRandom)),
        staying:state.residence==='home'&&(state.weddingHome?.outcome==='stay'||state.marriedYear!==null&&state.weddingHome?.outcome!=='pending'),
        left:state.residence==='independent'};
      if(state.residence==='independent')state.homePlan.left=true;
    }
    // Source ddKidYear keeps higher-support adults who have not already left with family.
    // An independent household is not moved back; explicit custody-away remains unmodeled.
    if(generation===1&&child.age>=18&&(state.birthDevelopment?.developmental?.supportLevel??0)>=2&&state.residence==='home'&&state.homePlan&&!state.homePlan.left)
      state.homePlan.staying=true;
    // Forward-only migration belongs to annual gameplay, never save decoding.
    // Preserve known spouse pairing while leaving unobserved identity/history unknown.
    if (generation === 1 && !state.unionPlan) {
      const country = countryOf(child.country);
      state.unionPlan = initializeChildUnionPlan({age: child.age, year: life.year,
        sex: child.sex, country, weddingAge: state.weddingAt, spouseSex: state.spouse?.sex ?? null,
        legacy: true, marriageBaseline: childMarriageBaseline(country, child.sex, life.era === "past" ? life.year : undefined),
      }, () => random(all));
    }
    if (generation === 1 && state.unionPlan?.disclosure && advanceChildDisclosure(state.unionPlan.disclosure, {
      age: child.age, year: life.year, alive: child.alive,
    })) emit(state.unionPlan.orientation === "bisexual" ? "event.descendantDisclosureBi" : "event.descendantDisclosureSame", {name: child.name});
    if (generation === 1 && state.unionPlan) updateChildFertilityTarget(state.unionPlan, {
      age: child.age, existingChildren: all.grandchildren.filter(g => g.parentId === child.id).length,
      country: life.country, year: life.year,
    }, () => random(all));
    if (state.prison && state.prison.releasedYear === null && state.prison.endYear === life.year) {
      state.prison.releasedYear = life.year;
      if (["teacher", "nurse"].includes(child.job)) startWork(life, child, state, hooks);
      emit("event.descendantReleased", { name: child.name });
    }
    // Release must be observed before a deferred wedding household can settle.
    if(generation===1&&state.weddingHome?.outcome==='pending'){
      const outcome=settleChildWeddingHome(life,child,state);
      if(outcome!=='pending')emit('event.descendantHome',{name:child.name,residence:state.residence==='home'?'with you':'independently'});
    }
    if (childImprisoned(child.alive, state.prison, life.year) && state.education === "university") {
      const duration = state.prison!.endYear - state.prison!.startYear;
      if (duration > 2) {
        state.education = "droppedOut";
        state.studyUntil = null;
        state.studyFunding = null;
        state.employment = "unemployed";
        state.income = 0;
        child.job = "none";
        emit("event.descendantCustodyStudy", { name: child.name });
      } else {
        state.studyUntil = Math.max(state.studyUntil ?? 0, state.prison!.endYear, child.birthYear + childUniversityEndAge(child.birthYear, state.prison));
      }
    }
    if (childImprisoned(child.alive, state.prison, life.year) && child.age >= 19 && state.education === "school") {
      state.education = "secondary";
      state.universityResolved = true;
      if (state.admission) state.admission = {attemptedAge:19,path:"work"};
      if(state.universityFunding&&!state.universityFunding.result)delete state.universityFunding;
      state.employment = "none";
      state.income = 0;
      child.job = "none";
    }
    // Keep identity/fertility history, but suspend work and family formation during custody.
    if (childImprisoned(child.alive, state.prison, life.year)) continue;
    if (generation === 1 && state.unionPlan && advanceChildCohabitation(state.unionPlan, {
      age: child.age, year: life.year, alive: child.alive, married: state.marriedYear !== null,
    })) {
      if(state.residence==='home'&&!state.homePlan?.staying&&!state.homePlan?.left){
        recordChildHome(life,state,'leave','cohabitation');
        emit('event.descendantHome',{name:child.name,residence:'independently'});
      }
      emit("event.descendantCohabitation", { name: child.name });
    }
    if (child.age === 6 && !(state.birthDevelopment?.developmental && state.birthDevelopment.developmental.supportLevel >= 2)) {
      state.education = "school";
      state.employment = "student";
      child.job = "student";
      emit("event.descendantSchool", { name: child.name });
    }
    // Start new observations at18. Never reinterpret a legacy age19+ path on load.
    if (generation === 1 && !state.universityResolved && (child.age === 18 || state.admission?.path === null && child.age === 19)) {
      const country = countryOf(child.country), era = educationEraInputs(country, life.era, life.year);
      const parentSupport = life.belongings.housing === "family" && life.family.parents.some(p => p.alive)
        ? life.stats.incomeQuintile : null;
      const quintile = Math.max(1, Math.min(5, childHomeQuintile(householdPercentile, life.country.region, parentSupport)));
      const access = educationAccess({...country, ...era.statistics}, {sex:child.sex, quintile, urban:life.residence === "urban", ...era.access});
      // Tutoring/private-school/placement facts remain unknown; saved birth and assessment facts are available.
      const development=childDevelopmentAdmission(state.birthDevelopment,state.learningObservations);
      const probability = childAdmissionProbability({transitions:access.transitions, parentDegree:life.stats.education >= 4,
        tutoringYears:0, privateMultiplier:1, placementMultiplier:1, aspirationMultiplier:1, disabilityMultiplier:development.multiplier, closed:false});
      const previous = state.admission;
      state.admission = advanceChildAdmission(previous, {age:child.age, alive:child.alive, imprisoned:false,
        companion:false, outsideCare:false, severeDisability:development.severe, closed:false, probability}, () => random(all));
      if (state.admission !== previous && state.admission?.path) {
        const admitted = state.admission.path !== "work";
        if (admitted) state.weddingAt = universityMarriageAge(state.weddingAt, child.age, state.marriedYear !== null, () => random(all));
        if (state.admission.path === "pending") state.universityFunding={version:1,year:life.year,packageCost:childUniversityCost({...country,...era.statistics},false)};
        if (state.admission.path === "university") {
          state.universityResolved = true; state.education = "university";
          state.employment = "student"; child.job = "student"; state.income = 0;
          state.studyUntil = child.birthYear + childUniversityEndAge(child.birthYear, state.prison);
          state.studyFunding = "self";
          emit("event.descendantUniversity", {name:child.name,amount:0});
        } else if (state.admission.path === "work") {
          state.universityResolved = true; state.education = "secondary";
          state.employment = "none"; child.job = "none"; state.income = 0;
          emit("event.descendantSchoolEnd", {name:child.name});
        }
      }
    }
    if (child.age === 19 && (state.education === "school" || state.education === "secondary" && !state.universityResolved)) {
      state.education = "secondary";
      state.employment = "none";
      child.job = "none";
      emit("event.descendantSchoolEnd", { name: child.name });
    }
    if (state.education === "university" && state.studyUntil !== null) {
      if (!state.admission && state.studyFunding === "self" && life.year < state.studyUntil && random(all) < 0.16) {
        state.education = "droppedOut";
        state.studyUntil = null;
        state.employment = "unemployed";
        child.job = "none";
        emit("event.descendantDropout", { name: child.name });
      } else if (life.year >= state.studyUntil) {
        state.education = "graduate";
        state.studyUntil = null;
        state.employment = "unemployed";
        child.job = "none";
        emit("event.descendantGraduate", { name: child.name });
      }
    }
    const higherSupport=generation===1&&(state.birthDevelopment?.developmental?.supportLevel??0)>=2;
    if(higherSupport&&!state.supportedWork&&child.age>=20&&state.education!=="university"&&state.employment!=="retired"&&["none","student"].includes(child.job)&&state.firstPayStatus==="pending"){
      const country=countryOf(child.country),era=educationEraInputs(country,life.era,life.year);
      const urban=childWorkResidence({abroad:child.country!==life.country.id,parentUrban:life.residence==='urban',countryUrban:country.urb,university:false},()=>random(all));
      const kind=childSupportedWork({level:state.birthDevelopment!.developmental!.supportLevel,ppp:era.statistics.ppp,region:country.region,urban},()=>random(all))!;
      const richAccess=era.statistics.ppp>=15000&&['hi','eca'].includes(country.region);
      state.supportedWork={age:child.age,year:life.year,kind,urban,richAccess};
      state.employment=kind==='dayActivities'?'none':'employed';
      child.job=kind==='dayActivities'?'dayActivities':kind==='familyFarm'?'farmer':kind==='familyShop'?'service':'shelteredWork';
      // Source records occupation, not a numeric child wage. Do not invent ordinary wages or first-pay transfers.
      state.income=0;
      if(life.justice.prisonUntil===null)emit(`event.childSupportedWork.${kind==='dayActivities'&&!richAccess?'homeCare':kind}`,{name:child.name});
    }
    if (!state.supportedWork && state.employment === "employed" && state.income === 0)
      state.income = round(incomeBase(life, countryOf(child.country)) * 0.3);
    const retirementAge=generation===1?childRetirementAge(child.country,child.sex,child.job,life.year):65;
    if (child.age >= retirementAge && state.employment !== "retired") {
      if(generation===1)state.retirement={age:child.age,year:life.year,country:child.country,job:child.job};
      state.employment = "retired";
      state.income = round(state.income * 0.25);
      child.job = "retired";
      emit("event.descendantRetired", { name: child.name });
    } else if (!state.supportedWork && child.age >= 20 && child.age < retirementAge && state.employment !== "retired" && state.education !== "university") {
      if (["none", "unemployed", "student"].includes(state.employment) && random(all) < 0.7)
        startWork(life, child, state, hooks);
      else if (state.employment === "employed") {
        if (random(all) < 0.035) {
          state.employment = "unemployed";
          state.income = 0;
          child.job = "none";
          emit("event.descendantJobLoss", { name: child.name });
        } else if (random(all) < 0.12) {
          state.level = Math.min(10, state.level + 1);
          state.income = round(Math.min(1e10, state.income * 1.12));
          emit("event.descendantPromotion", { name: child.name, job: jobStory(child.job) });
        }
      }
    }
    if (!state.supportedWork && state.employment === "employed") {
      if (state.firstPayStatus === "pending") {
        state.firstPayYear = life.year;
        state.firstPayStatus = "received";
        const amount = round(state.income * 0.01);
        if (generation === 1) {
          transfer(life, state, amount);
          emit("event.descendantFirstPay", { name: child.name, amount });
        } else emit("event.descendantFirstEarnings", { name: child.name });
      }

    }
    if(generation===1&&state.homePlan){
      const decision=childDeparture({country:life.country.id,region:life.country.region,age:child.age,
        plannedAge:state.homePlan.leaveAge,annual:true,home:state.residence==='home',left:state.homePlan.left,staying:state.homePlan.staying,
        married:state.marriedYear!==null,parentImprisoned:life.justice.prisonUntil!==null,childImprisoned:false,withdrawn:false,
        rural:life.residence==='rural',university:state.education==='university'||state.education==='graduate',
        lastChild:!life.family.children.some(c=>{const s=all.children.find(s=>s.childId===c.id);return c.id!==child.id&&c.alive&&s?.residence==='home'&&!s.homePlan?.left;})},()=>random(homeRandom));
      if(decision){
        recordChildHome(life,state,decision.outcome,decision.reason);
        emit(decision.outcome==='stay'?'event.descendantHomeStay':decision.reason==='city'?'event.descendantCityHome':decision.reason==='university'?'event.descendantUniversityHome':'event.descendantHome',
          decision.outcome==='leave'&&decision.reason==='own'?{name:child.name,residence:'independently'}:{name:child.name});
      }
    }else if (generation===2 && state.residence === "home" && !state.spouse && child.age >= 25 && random(all) < 0.25) {
      state.residence = "independent";
      emit("event.descendantHome", { name: child.name, residence: "independently" });
    }
    if (
      child.country !== parentCountry &&
      child.age >= 18 &&
      (state.lastVisitYear === null
        ? state.migratedYear !== null && life.year >= state.migratedYear + 2
        : life.year >= state.lastVisitYear + 3)
    ) {
      state.lastVisitYear = life.year;
      emit("event.descendantVisit", {
        name: child.name,
        country: countryOf(child.country).name_en,
      });
    }
    const spouse = state.spouse,
      children = all.grandchildren.filter((g) => g.parentId === child.id);
    let origin: GrandchildOrigin | null = null;
    if (generation === 1 && (state.marriedYear === null || spouse?.alive) && state.unionPlan && all.grandchildren.length < MAX_GRANDCHILDREN) {
      updateChildFertilityTarget(state.unionPlan, {age: child.age, existingChildren: children.length, country: life.country, year: life.year}, () => random(all));
      origin = childBirthOutcome({age: child.age, sex: child.sex, alive: child.alive,
        university: state.education === "university" || state.education === "graduate",
        existingChildren: children.length, target: Math.min(MAX_CHILD_GRANDCHILDREN, state.unionPlan.fertilityTarget ?? 0),
        married: state.marriedYear !== null, cohabiting: state.unionPlan.cohabitationYear !== null, sameSexPartner: state.unionPlan.sameSexPartner === true,
        // Contact and separated-stepfamily lifecycles remain unimplemented.
        imprisoned: childImprisoned(child.alive, state.prison, life.year), cutOff: false, separatedStepfamily: false,
        playerCountry: life.country, residenceCountry: countryOf(child.country), year: life.year, past: life.era === "past",
      }, () => random(all));
      if (origin?.union === "married") origin.rulesVersion = 2;
    }
    if (!state.unionPlan && !origin &&
      generation === 1 &&
      spouse?.alive &&
      (spouse.sex !== child.sex || canFormSameSexFamily(countryOf(child.country), life.year, child.sex)) &&
      state.marriedYear !== null &&
      life.year > state.marriedYear &&
      child.age >= 20 &&
      child.age <= 48 &&
      spouse.age >= 20 &&
      spouse.age <= 48 &&
      children.length < MAX_CHILD_GRANDCHILDREN &&
      all.grandchildren.length < MAX_GRANDCHILDREN &&
      (!children.length || life.year - children.at(-1)!.birthYear >= 2) &&
      random(all) < Math.min(0.5, countryOf(child.country).tfr / 7)
    ) {
      origin = {method: spouse.sex === child.sex ? sameSexParentMethod(countryOf(child.country), life.year, child.sex, () => random(all))! : "natural", union: "married", country: child.country, household: "parent"};
    }
    if (origin) {
      const method = origin.method;
      const sex: Sex = random(all) < 0.5 ? "M" : "F";
      const id = descendantId(life, `grandchild-${all.children.indexOf(state)}-${children.length}`);
      const grandchild: Grandchild = {
        id,
        parentId: child.id,
        origin,
        name: hooks.name(all, countryOf(child.country), sex),
        sex,
        country: child.country,
        age: 0,
        birthYear: life.year,
        alive: true,
        deathAge: null,
        job: "none" as const,
        ...createProgress(life, { id, age: 0, country: child.country, job: "none", sex }),
      };
      const earlyLoss = random(all) < Math.min(0.15, Math.max(0.01, life.country.u5 / 1000 * 0.75 + 0.01));
      if (earlyLoss && method !== "adoption") {
        grandchild.earlyLoss = true;
        grandchild.alive = false;
        grandchild.fertilityTarget = 0;
      }
      all.grandchildren.push(grandchild);
      births.push({ baby: grandchild, parent: child.name });
    }
  }
  const reconciliation = all.pendingReconciliation;
  if (reconciliation && life.year >= reconciliation.year + 2 && random(custodyRandom) < 0.4) {
    delete all.pendingReconciliation;
    const child = life.family.children.find(c => c.id === reconciliation.childId);
    const state = all.children.find(c => c.childId === reconciliation.childId);
    if (child?.alive && state?.prison?.reunion?.choice === "time") {
      state.prison.reunion.reconciledYear = life.year;
      state.bond = (state.bond ?? 0) + 6;
      life.stats.happiness += 3;
      life.stats.social += 2;
      emit("event.descendantReconciled", {name: child.name});
    }
  }
  // Reference settles one annual birth batch, followed by one loss per affected baby.
  if (births.length) {
    const first = births[0];
    if (births.length === 1) emit(first.baby.origin?.union === "solo" ? "event.descendantSoloBirth" : first.baby.origin?.union === "cohabiting" ? "event.descendantCohabitingBirth" : "event.descendantBirth", { name: first.parent, baby: first.baby.name });
    else emit("event.descendantBirthBatch", { count: births.length, total: all.grandchildren.filter(g => g.alive).length + births.filter(b => b.baby.earlyLoss).length });
    life.stats.happiness += 6;
    life.stats.social += 4;
    for (const { baby, parent } of births) if (baby.earlyLoss) {
      emit("event.descendantEarlyLoss", { name: baby.name, parent });
      life.stats.happiness -= 4;
      life.stats.social -= 1;
    }
  }
  const parentCountry={...life.country,...educationEraInputs(life.country,life.era,life.year).statistics};
  const support=childSupport({age:life.age,retired:life.stats.employment==='retired',force:false,
    // Special separation and money-request history are not represented yet.
    separatedFromNorthKorea:false,year:life.year,country:life.country.id,region:life.country.region,
    medianIncome:incomeAtPercentile(parentCountry,.5),householdPercentile,
    savings:life.stats.savings,social:life.stats.social},life.family.children.map(child=>{
      const state=all.children.find(s=>s.childId===child.id)!;
      const abroad=child.country!==life.country.id;
      const job=state.retirement?.job??child.job;
      return {id:child.id,alive:child.alive,age:child.age,
        // Source withMe/away are special family flags, not generic home/independent residence.
        withParent:false,separatedStepfamily:false,exFamily:false,away:false,
        blockedJob:['student','unemployed'].includes(state.employment),
        imprisoned:childImprisoned(child.alive,state.prison,life.year),lastRequestYear:null,
        medianIncome:incomeAtPercentile(abroad?countryOf(child.country):parentCountry,.5),abroad,
        degreeJob:['teacher','nurse','engineer'].includes(job),agriculture:job==='farmer',
        gives:state.universityFunding?.result?.outcome==='funded',previousRequests:0};
    }));
  for(const {id,amount} of support){
    const child=life.family.children.find(c=>c.id===id)!;
    const state=all.children.find(s=>s.childId===id)!;
    transfer(life,state,amount);
    if(child.age%3===0||state.firstPayYear===life.year)
      emit('event.descendantContribution',{name:child.name,amount:round(amount)});
  }
  const boardRandom={rng:(life.seed^Math.imul(life.year,0x9e3779b1)^0x6b43a125)>>>0};
  const board=childBoard({age:life.age,retired:life.stats.employment==='retired',region:life.country.region,
    year:life.year,medianIncome:incomeAtPercentile(parentCountry,.5)},life.family.children.map(child=>{
      const state=all.children.find(s=>s.childId===child.id)!;
      return {id:child.id,alive:child.alive,age:child.age,home:state.residence==='home',
        abroad:child.country!==life.country.id,away:false,placed:false,withdrawn:false,
        working:state.employment==='employed'&&!childImprisoned(child.alive,state.prison,life.year),
        university:state.education==='university',receipt:state.board};
    }),()=>random(boardRandom));
  for(const {id,receipt} of board.observations){
    all.children.find(s=>s.childId===id)!.board=receipt;
    if(receipt.willing)emit('event.descendantBoard',{name:life.family.children.find(c=>c.id===id)!.name});
  }
  for(const {id,amount} of board.payments)transfer(life,all.children.find(s=>s.childId===id)!,amount);
  laterGenerationsYear(life, hooks);
  const living = all.grandchildren.filter((g) => g.alive);
  if (living.length && life.age % 3 === 0)
    emit("event.descendantStories", {
      names: living
        .slice(0, 3)
        .map((g) => `${g.name} (${g.age})`)
        .join(", ")
        .slice(0, 200),
    });
}
export function householdPartners(life: Life): Person[] {
  return [life.family.partner, life.family.secondPartner].filter((p): p is Person => p != null);
}
export function familyMembers(life: Life): Person[] {
  return [
    ...life.family.parents,
    ...life.family.siblings,
    ...life.family.children,
    ...householdPartners(life),
    ...life.descendants.grandchildren,
    ...(life.descendants.greatGrandchildren ?? []).map(p => ({...p, job: "none" as const})),
    ...(life.descendants.greatGreatGrandchildren ?? []).map(p => ({...p, job: "none" as const})),
    ...descendantSubjects(life).flatMap(({ state }) => (state.spouse ? [state.spouse] : [])),
  ];
}
export function migrateDependents(life: Life, origin: string, destination: string) {
  for (const child of life.family.children) {
    const state = life.descendants.children.find((c) => c.childId === child.id);
    if (child.alive && child.age < 18 && child.country === origin && state?.residence === "home")
      child.country = destination;
    else if (state?.residence === "home") state.residence = "independent";
  }
  for (const partner of householdPartners(life)) if (partner.alive) partner.country = destination;
}
