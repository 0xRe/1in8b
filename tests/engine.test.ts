import {encodeSave,decodeSave} from '../src/game/storage';
import assert from 'node:assert/strict';
import test from 'node:test';
import { addReflection, advanceYear, createLife, DEFAULT_SETTINGS, invest, lifeTable, makeChoice, setFocus, spend } from '../src/game/engine';
import { countryName, countryProbability, getCountries } from '../src/game/countries';
import type { Life } from '../src/game/types';
import * as game from '../src/game/engine';

function resolve(life: Life): Life {
  if (!life.pendingDecision) return life;
  return life.pendingDecision.type === 'reflection' ? addReflection(life, 'I will remember this year.') : makeChoice(life, life.pendingDecision.choices[0].id);
}

test('birth starts at age zero with a finite identity and four simultaneous companions', () => {
  const life = createLife(DEFAULT_SETTINGS, 42);
  assert.equal(life.age, 0);
  assert.equal(life.alive, true);
  assert.equal(life.events[0].key, 'event.birth');
  assert.equal(life.companions.length, 4);
  assert.ok(life.name.length > 2);
  assert.ok(life.family.parents.every(p => p.age >= 18));
  assert.ok(life.companions.every(c => c.age === 0));
});

test('same seed and actions replay exactly and operations do not mutate the previous year', () => {
  const play = () => {
    let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN' }, 614);
    for (let i = 0; i < 40 && life.alive; i++) life = advanceYear(resolve(life));
    return life;
  };
  assert.deepEqual(play(), play());
  const birth = createLife(DEFAULT_SETTINGS, 42);
  const snapshot = JSON.stringify(birth);
  advanceYear(birth);
  assert.equal(JSON.stringify(birth), snapshot);
});

test('172 countries retain population/birth totals and weighting changes selection odds', () => {
  const countries = getCountries();
  assert.equal(countries.length, 172);
  assert.equal(new Set(countries.map(c => c.id)).size, 172);
  assert.ok(countries.reduce((sum, c) => sum + c.pop, 0) > 7_500_000);
  assert.ok(countries.reduce((sum, c) => sum + c.births, 0) > 100_000_000);
  const india = countries.find(c => c.id === 'IND')!;
  assert.ok(countryProbability(india, 'births') > 0.1);
  assert.ok(countryProbability(india, 'equal') < 0.01);
  assert.notEqual(countryProbability(india, 'births'), countryProbability(india, 'population'));
  assert.equal(countryName(countries.find(c => c.id === 'DEU')!, 'fr'), 'Allemagne');
  const observed = { births: 0, equal: 0 };
  for (let seed = 1; seed <= 1500; seed++) for (const mode of ['births', 'equal'] as const) {
    if (createLife({ ...DEFAULT_SETTINGS, weightMode: mode }, seed).country.id === 'IND') observed[mode]++;
  }
  assert.ok(observed.births > observed.equal * 8, JSON.stringify(observed));
});

test('life tables match national life expectancy, infant mortality, and terminal survival', () => {
  for (const id of ['JPN', 'AFG', 'USA', 'NGA']) {
    const country = getCountries().find(c => c.id === id)!;
    const female = lifeTable(country, 'F');
    const male = lifeTable(country, 'M');
    assert.ok(female.expectancy > male.expectancy);
    assert.ok(Math.abs(female.expectancy - (country.le + country.gap * 0.49)) < 0.02);
    assert.ok(Math.abs(male.expectancy - (country.le - country.gap * 0.51)) < 0.02);
    assert.ok(Math.abs(female.q[0] - country.im / 1000 * 0.92) < 0.00001);
    assert.equal(female.q[110], 1);
    assert.equal(female.survival[111], 0);
    assert.ok(female.q.every(q => Number.isFinite(q) && q >= 0 && q <= 1));
    assert.ok(female.survival.every((s, i, a) => i === 0 || s <= a[i - 1]));
  }
});

test('reflection gates stop advance until answered and branching choices actually change outcomes', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN' }, 124);
  while (life.alive && life.age < 5) life = advanceYear(resolve(life));
  assert.equal(life.age, 5);
  assert.equal(life.pendingDecision?.type, 'reflection');
  assert.deepEqual(advanceYear(life), life);
  life = addReflection(life, '<b>My first memory.</b>');
  assert.equal(life.pendingDecision, null);
  assert.equal(life.reflections['5'], '<b>My first memory.</b>');
  while (life.alive && life.age < 18) life = advanceYear(resolve(life));
  assert.equal(life.age, 18);
  assert.equal(life.pendingDecision?.id, 'education');
  const study = makeChoice(life, 'university');
  const work = makeChoice(life, 'work');
  assert.equal(study.stats.employment, 'student');
  assert.equal(work.stats.employment, 'employed');
  assert.notEqual(work.stats.annualIncome, study.stats.annualIncome);
  assert.deepEqual(makeChoice(life, 'not-a-choice'), life);
});

test('full lives remain bounded, eventually die, and leave death terminal', () => {
  for (let seed = 1; seed < 35; seed++) {
    let life = createLife(DEFAULT_SETTINGS, seed);
    for (let year = 0; year < 500 && life.alive; year++) {
      life = advanceYear(resolve(life));
      for (const stat of ['health', 'happiness', 'knowledge', 'social'] as const) assert.ok(life.stats[stat] >= 0 && life.stats[stat] <= 100);
      assert.ok(Number.isFinite(life.stats.netAssets));
      assert.ok(life.stats.savings >= 0 && life.stats.investments >= 0);
    }
    assert.equal(life.alive, false);
    assert.ok(life.age <= 110);
    assert.equal(life.deathAge, life.age);
    assert.deepEqual(advanceYear(life), life);
    assert.deepEqual(invest(life, 'stocks'), life);
    assert.deepEqual(spend(life, 'health', 10), life);
  }
});

test('focus, spending and investing enforce age and balance boundaries', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN' }, 124);
  const birth = JSON.stringify(life);
  assert.deepEqual(spend(life, 'health', -1), life);
  assert.deepEqual(invest(life, 'stocks'), life);
  assert.equal(JSON.stringify(life), birth);
  while (life.alive && life.age < 25) life = advanceYear(resolve(life));
  assert.equal(life.alive, true);
  life = { ...life, pendingDecision: null, stats: { ...life.stats, health: 70, savings: 1000, investments: 0, netAssets: 1000, debt: 0 } };
  const spent = spend(life, 'health', 100);
  assert.equal(spent.stats.savings, 900);
  assert.ok(spent.stats.health > 70);
  assert.deepEqual(spend(life, 'health', 1001), life);
  assert.deepEqual(spend(life, 'health', Infinity), life);
  assert.deepEqual(spend(life, 'invalid', 100), life);
  const invested = invest(life, 'stocks');
  assert.equal(invested.allocation, 'stocks');
  assert.equal(invested.stats.netAssets, 1000);
  assert.ok(invested.stats.investments > 0);
  const focused = setFocus(life, 'knowledge');
  assert.equal(focused.focus, 'knowledge');
  assert.deepEqual(setFocus(life, 'magic'), life);
});

test('all eras are deterministic and affect the simulated circumstances', () => {
  const past = createLife({ ...DEFAULT_SETTINGS, country: 'FRA', era: 'past' }, 800);
  const today = createLife({ ...DEFAULT_SETTINGS, country: 'FRA', era: 'today' }, 800);
  const future = createLife({ ...DEFAULT_SETTINGS, country: 'FRA', era: 'future' }, 800);
  assert.equal(past.birthYear, 1990);
  assert.equal(today.birthYear, 2026);
  assert.equal(future.birthYear, 2080);
  assert.ok(past.stats.netAssets < future.stats.netAssets);
});

test('sub-cent spending cannot create free health', () => {
  const life = createLife({...DEFAULT_SETTINGS, country:'JPN'}, 22);
  life.age=20;life.year=life.birthYear+20;life.stats.savings=100;life.stats.health=50;
  const next=spend(life,'health',0.001);
  assert.equal(next.stats.health,50);assert.equal(next.stats.savings,100);
});

test('temperament choices persist, settle at five, and childhood develops talents and hobbies', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN' }, 124);
  while (life.age < 2) life = advanceYear(life);
  assert.equal(life.pendingDecision?.id, 'temperament');
  const curious = makeChoice(life, 'curious');
  const sociable = makeChoice(life, 'sociable');
  assert.equal(curious.temperament.kind, 'curious');
  assert.ok(curious.stats.knowledge > sociable.stats.knowledge);
  life = curious;
  while (life.age < 7) life = advanceYear(resolve(life));
  assert.equal(life.temperament.settled, true);
  assert.ok(life.talents.length >= 1);
  assert.equal(life.pendingDecision?.id, 'hobby');
  life = makeChoice(life, 'reading');
  life = game.chooseHobby(game.chooseHobby(life, 'music'), 'sport');
  assert.equal(life.hobbies.length, 3);
  assert.deepEqual(game.chooseHobby(life, 'art'), life);
  const before = life.hobbies[0].skill;
  const trained = game.trainHobby(life, 'reading');
  assert.ok(trained.hobbies[0].skill > before);
  assert.deepEqual(game.trainHobby(trained, 'reading'), trained);
  let ready = trained;
  for (let step = 0; step < 20 && ready.age === trained.age && ready.alive; step++) ready = advanceYear(resolve(ready));
  assert.equal(ready.age, trained.age + 1);
  assert.ok(ready.hobbies[0].skill > trained.hobbies[0].skill);
});

test('school exclusion offers return or family work, and jobs have distinct real offers', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN' }, 124);
  while (life.age < 7) life = advanceYear(resolve(life));
  life = resolve(life);
  while (life.pendingDecision) life = resolve(life);
  life.schooling.enrolled = false; life.schooling.droppedOut = true;
  life.stats.employment = 'none';
  const schoolAge = life.age;
  for (let step = 0; step < 20 && life.age === schoolAge && life.alive; step++) life = advanceYear(resolve(life));
  assert.equal(life.age, schoolAge + 1);
  assert.equal(life.pendingDecision?.id, 'school');
  const helping = makeChoice(life, 'helpFamily');
  assert.equal(helping.schooling.childLabor, true);
  assert.equal(helping.stats.job, 'childwork');
  assert.equal(helping.stats.annualIncome > 0, helping.schooling.childWorkPaid);
  // Source admission is certain only with maximal household means and social support.
  const supported = structuredClone(life);
  supported.stats.incomeQuintile = 5; supported.stats.social = 100;
  const returned = makeChoice(supported, 'returnSchool');
  assert.equal(returned.schooling.enrolled, true);
  life = helping;
  while (life.age < 15) life = advanceYear(resolve(life));
  life = resolve(life);
  life.pendingDecision = null;
  life = game.requestJobOffers(life);
  assert.equal(life.jobOffers.length, 3);
  assert.equal(life.pendingDecision?.choices.length, 4);
  const employed = makeChoice(life, 'offer0');
  assert.equal(employed.stats.annualIncome, life.jobOffers[0].income);
  assert.equal(employed.stats.employment, 'employed');
});

test('adult budgets balance, relocation changes opportunities, and belongings require real savings', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN' }, 124);
  while (life.age < 24) life = advanceYear(resolve(life));
  life = resolve(life);
  const b = life.budget;
  assert.ok(Math.abs(b.totalExpenses - (b.tax+b.food+b.housing+b.transport+b.health+b.leisure+b.education+b.dependents)) < 0.02);
  assert.ok(Math.abs(b.annualSavings - (b.income-b.totalExpenses)) < 0.02);
  life.residence = 'rural'; life.belongings.housing = 'family';
  const moved = game.relocate(life);
  assert.equal(moved.residence, 'urban');
  assert.equal(moved.belongings.housing, 'rent');
  assert.equal(moved.pendingDecision?.id, `job-${life.age}`);
  let rich = { ...life, stats: { ...life.stats, savings: 1_000_000, netAssets: 1_000_000 + life.stats.investments - life.stats.debt } };
  const home = game.buyBelonging(rich, 'housing');
  assert.equal(home.belongings.housing, 'owned');
  assert.ok(home.stats.savings < rich.stats.savings);
  assert.ok(Math.abs(home.stats.netAssets-rich.stats.netAssets)<0.02);
  assert.deepEqual(game.buyBelonging(home, 'housing'), home);
  const poor = { ...life, stats: { ...life.stats, savings: 0 } };
  assert.deepEqual(game.buyBelonging(poor, 'car'), poor);
});

test('budget deficits become real debt and an automatic rural career transition cannot get stuck', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN', autoChoices: true }, 124);
  while (life.age < 24 && life.alive) life = advanceYear(life);
  life = { ...life, pendingDecision: null, stats: { ...life.stats, savings: 0, investments: 0, annualIncome: 0, employment: 'student', debt: 0 } };
  life.schooling.enrolled = true;
  life.relationship.partnerIncome=0;life.relationship.childPlan='childfree';life.family.children=[];life.care.who=null;life.care.until=null;
  life = advanceYear(life);
  for(let i=0;i<30&&life.alive&&life.timeline&&!life.timeline.complete;i++)life=advanceYear(life);
  assert.ok(life.stats.debt > 0);
  assert.ok(life.stats.netAssets < 0);
  const before = life.stats.debt;
  life.stats.employment = 'employed'; life.stats.annualIncome = 1_000_000; life.schooling.enrolled = false;
  const repaymentAge=life.age;
  for(let i=0;i<30&&(life.age===repaymentAge||life.timeline&&!life.timeline.complete);i++)life=advanceYear(life);
  assert.ok(life.stats.debt < before);
  let rural = createLife({ ...DEFAULT_SETTINGS, country: 'JPN', autoChoices: true }, 421);
  rural.residence = 'rural';
  for (let step = 0; step < 230 && rural.alive; step++) {
    rural = advanceYear(rural);
    assert.equal(rural.pendingDecision, null);
  }
  assert.equal(rural.alive, false);
});

function adult(age: number): Life {
  let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},124);
  for(let i=0;i<200&&life.alive&&life.age<age;i++)life=advanceYear(resolve(life));
  life=resolve(life);
  for(let i=0;i<30&&life.timeline&&!life.timeline.complete;i++)life=resolve(advanceYear(life));
  return life;
}
test('apprenticeships trade current income for a qualification after real training years', () => {
  let life=adult(19);life.pendingDecision=null;life.schooling.enrolled=false;life.stats.education=2;life.stats.employment='employed';life.stats.annualIncome=10000;
  life=advanceYear(life);
  assert.equal(life.pendingDecision?.key,'decision.apprenticeship');
  life=makeChoice(life,'mechanic');
  assert.equal(life.training.kind,'mechanic');
  assert.equal(life.stats.annualIncome,4500);
  const end=life.training.endsAt!;
  while(life.age<end)life=advanceYear(resolve(life));
  assert.equal(life.training.kind,null);
  assert.equal(life.stats.job,'mechanic');
  assert.equal(life.stats.education,3);
});

test('relationship choices, permanent childfree plans, and caregiving have lasting effects', () => {
  let life=adult(29);
  assert.ok(life.family.partner);
  life.pendingDecision=null;life.relationship.status='dating';life.opportunities.nextRelationshipAge=life.age;
  life.family.children=[];life.care.handledChildren=[];life.relationship.childPlan='open';
  life.care.who=null;life.care.until=null;life.stats.employment='employed';life.stats.annualIncome=10000;
  life=advanceYear(life);
  assert.equal(life.pendingDecision?.key,'decision.marriage');
  life=makeChoice(life,'cohabit');
  assert.equal(life.relationship.status,'cohabiting');
  assert.equal(life.family.married,false);
  life.relationship.nextChildDecisionAge=life.age;
  life=advanceYear(life);
  assert.equal(life.pendingDecision?.key,'decision.children');
  const childfree=makeChoice(life,'childfree');
  assert.equal(childfree.relationship.childPlan,'childfree');
  life=makeChoice(life,'haveChild');
  assert.equal(life.family.children.length,1);
  life=advanceYear(life);
  for(let i=0;i<12&&life.age<32&&life.pendingDecision?.key!=='decision.care';i++)life=advanceYear(resolve(life));
  assert.equal(life.pendingDecision?.key,'decision.care');
  const income=life.stats.annualIncome;
  life=makeChoice(life,'selfCare');
  assert.equal(life.stats.annualIncome,0);
  assert.equal(life.care.previousIncome,income);
  assert.equal(life.care.who,'self');
});

test('hardship choices can lead to prison and release or debt relief', () => {
  let base=adult(35);base.pendingDecision=null;base.stats.debt=base.country.ppp;base.stats.netAssets=base.stats.savings+base.stats.investments-base.stats.debt;
  base.settings.gentler=false;base.opportunities.lastRiskAge=-10;
  const offered=advanceYear(base);
  assert.equal(offered.pendingDecision?.key,'decision.risky');
  assert.equal(makeChoice(offered,'refuseRisk').justice.prisonUntil,null);
  let prisoner:Life|undefined;
  for(let rng=0;rng<100;rng++){const candidate=makeChoice({...offered,rng},'acceptRisk');if(candidate.justice.prisonUntil!==null){prisoner=candidate;break;}}
  assert.ok(prisoner);
  const release=prisoner.justice.prisonUntil!;
  while(prisoner.age<release&&prisoner.alive)prisoner=advanceYear(resolve(prisoner));
  assert.equal(prisoner.justice.prisonUntil,null);
  assert.ok(prisoner.events.some(e=>e.key==='event.release'));
});

test('night school earns education over time, debt help reduces obligations, and carers can return to work', () => {
  let life=adult(25);life.pendingDecision=null;life.stats.education=0;life.schooling.enrolled=false;life.training.kind=null;life.training.endsAt=null;
  life.care.who=null;life.care.until=null;life.family.children=[];life.relationship.childPlan='childfree';life.stats.employment='employed';life.stats.annualIncome=20000;life.opportunities.nextNightSchoolAge=life.age;
  life=advanceYear(life);assert.equal(life.pendingDecision?.key,'decision.nightSchool');
  life=makeChoice(life,'nightSchool');const end=life.training.endsAt!;
  while(life.age<end)life=advanceYear(resolve(life));
  assert.equal(life.stats.education,1);assert.equal(life.training.kind,null);
  life=resolve(life);life.stats.debt=life.country.ppp;life.opportunities.lastDebtAge=-10;
  life=advanceYear(life);assert.equal(life.pendingDecision?.key,'decision.debt');
  const helped=makeChoice(life,'familyHelp');assert.ok(helped.stats.debt<life.stats.debt);
  const borrowed=makeChoice(life,'moneylender');assert.ok(borrowed.stats.debt>life.stats.debt);assert.ok(borrowed.stats.savings>life.stats.savings);
  life=helped;life.care.who='self';life.care.until=life.age;life.care.previousIncome=20000;life.care.previousJob='service';life.stats.annualIncome=0;life.stats.employment='none';
  life=advanceYear(life);assert.equal(life.pendingDecision?.key,'decision.returnWork');
  life=makeChoice(life,'returnWork');assert.equal(life.care.who,null);assert.equal(life.pendingDecision?.key,'decision.job');
});

test('lifestyle policies change real costs and annual spending keeps a three-year cash reserve', () => {
  let base=adult(35);base.pendingDecision=null;
  assert.equal(base.lifestyle.diet,'balanced');
  const healthy=game.setLifestyle(base,'diet','healthy');
  assert.ok(healthy.budget.food>base.budget.food);
  assert.deepEqual(game.setLifestyle(base,'diet','magic'),base);
  base.stats.savings=1_000_000;base.stats.investments=0;base.stats.debt=0;base.stats.health=40;base.stats.annualIncome=100000;base.stats.employment='employed';base.allocation='cash';
  const progress=(input:Life)=>{let life=input;for(let i=0;i<20&&life.age===input.age&&life.alive;i++)life=advanceYear(resolve(life));return life;};
  const plain=progress(base),spent=progress(game.setAnnualSpending(base,'health',100));
  assert.equal(Math.round((plain.stats.savings-spent.stats.savings)*100),10000);
  assert.ok(spent.stats.health>plain.stats.health);
  const unaffordable=progress(game.setAnnualSpending(base,'health',500000));
  assert.equal(unaffordable.stats.savings,plain.stats.savings);
});

test('manual activities reopen family planning, support named pets and offer a real move abroad', () => {
  let life=adult(35);life.pendingDecision=null;life.relationship.childPlan='childfree';life.family.children=[];
  life=game.requestActivity(life,'familyPlanning');assert.equal(life.pendingDecision?.key,'decision.children');
  life=makeChoice(life,'haveChild');assert.equal(life.relationship.childPlan,'open');assert.equal(life.family.children.length,1);
  life.stats.savings=1_000_000;life.care.who=null;life.care.until=null;life.training.kind=null;life.training.endsAt=null;life.schooling.enrolled=false;
  const pet=game.adoptPet(life,'cat','<Milo>');assert.equal(pet.pets[0].name,'<Milo>');
  assert.ok(pet.stats.savings<life.stats.savings);
  life=game.requestActivity(life,'migration');assert.ok(life.migration.offerCountry);assert.equal(life.pendingDecision?.key,'decision.migration');
  const origin=life.country.id;life=makeChoice(life,'migrateTogether');
  assert.notEqual(life.country.id,origin);assert.equal(life.migration.birthCountry.id,origin);assert.equal(life.migration.moves.length,1);
});

test('daily themes are deterministic by date and saved settings preserve the birth theme on replay', () => {
  assert.equal(game.getDailyTheme('2026-10-20').id,'safeRoads');
  assert.deepEqual(game.getDailyTheme('2026-10-21'),game.getDailyTheme('2026-10-21'));
  const life=createLife({...DEFAULT_SETTINGS,dailyThemeDay:'2026-10-20'},423);
  assert.equal(life.dailyTheme.id,'safeRoads');
  assert.deepEqual(createLife(life.settings,life.seed),life);
});

test('release resumes the actual apprenticeship role without granting its qualification early',()=>{
 for(const role of ['mechanic','hairdresser'] as const){
  let life=adult(19);life.pendingDecision=null;delete life.timeline;
  life.schooling.enrolled=false;life.stats.education=2;
  life.training={kind:role,endsAt:life.age+4,previousIncome:10000,previousJob:'service'};
  life.justice.prisonUntil=life.age+1;life.stats.employment='none';life.stats.job='none';life.stats.annualIncome=0;
  const releaseAge=life.age+1;
  for(let i=0;i<100&&life.age<releaseAge;i++)life=advanceYear(resolve(life));
  assert.equal(life.justice.prisonUntil,null);
  assert.equal(life.training.kind,role);
  assert.equal(life.stats.employment,'employed');
  assert.equal(life.stats.job,role);
  assert.equal(life.stats.education,2);
  assert.ok(life.stats.annualIncome>0);
 }
});

test('urban relocation clears the previous job while retaining qualified job offers and a restorable seeking state',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN'},124);
 while(life.age<24)life=advanceYear(resolve(life));
 life=resolve(life);life.residence='rural';life.schooling.enrolled=false;
 life.stats.job='mechanic';life.stats.employment='employed';life.stats.annualIncome=50000;
 life.training.kind=null;life.care.who=null;
 const moved=game.relocate(life);
 assert.equal(moved.stats.employment,'unemployed');assert.equal(moved.stats.job,'none');
 assert.equal(moved.stats.annualIncome,0);assert.equal(moved.jobOffers[0].job,'mechanic');
 assert.equal(moved.pendingDecision?.id,`job-${life.age}`);
 assert.equal(life.stats.job,'mechanic');
 const restored=decodeSave(encodeSave(moved,[])).life!;
 assert.equal(restored.stats.job,'none');assert.equal(restored.jobOffers[0].job,'mechanic');
 const waiting=makeChoice(restored,'wait');
 const reloaded=decodeSave(encodeSave(waiting,[])).life!;
 reloaded.decisions=reloaded.decisions.filter(id=>id!==`job-${reloaded.age}`);
 assert.equal(game.requestJobOffers(reloaded).jobOffers[0].job,'mechanic');
 const accepted=makeChoice(restored,'offer0');
 assert.equal(accepted.stats.job,'mechanic');assert.equal(accepted.stats.employment,'employed');
 assert.equal(accepted.stats.annualIncome,moved.jobOffers[0].income);
});

test('stale job offers cannot bypass current search eligibility or change advertised pay',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN'},124);
 while(life.age<24)life=advanceYear(resolve(life));
 life=resolve(life);life.pendingDecision=null;life.schooling.enrolled=false;life.training.kind=null;life.care.who=null;
 life.decisions=life.decisions.filter(id=>id!==`job-${life.age}`);
 const offered=game.requestJobOffers(life);assert.ok(offered.pendingDecision);
 const changes:((l:Life)=>void)[]=[
  l=>{l.justice.prisonUntil=l.age+2;},l=>{l.schooling.enrolled=true;},
  l=>{l.care.who='self';},l=>{l.training.kind='mechanic';l.training.endsAt=l.age+3;},
  l=>{l.age++;},l=>{l.decisions.push(l.pendingDecision!.id);},
  l=>{l.jobOffers[0].income++;},
 ];
 for(const change of changes){
  const stale=structuredClone(offered);change(stale);const before=structuredClone(stale);
  const result=makeChoice(stale,'offer0');
  assert.equal(result.pendingDecision,null);before.pendingDecision=null;
  assert.deepEqual(result,before);
 }
});
