import type {OccupationExperience} from './occupation-experience';
import type {OccupationTerms,OccupationQuoteBatch,AcceptedOccupationQuote} from './occupation-quote';
import type {OccupationalJob} from './job-identities';
import type {GuardianshipState} from './grandchild-guardianship-runtime';
import type {ChildHomePlan} from './child-home';
import type {ChildWeddingHomeReceipt} from './child-wedding-home';
import type {ChildBoardReceipt} from './child-board';
import type {ChildRetirementRecord} from './child-retirement';
import type {ChildFundingResult} from './child-university-funding';
import type {ChildAdmissionState} from './child-admission';
import type {LearningState} from './learning-state';
import type { UniversityAdmissionsState } from './university-retakes';
import type { AcademicState } from './school-model';
import type { FocusSelection, StageFocus } from './focus-model';
import type { YearTimeline } from './year-timeline';
import type { FeedState } from './annual-feed';
import type { ChildSentence } from './child-prison';
export type Sex = 'M' | 'F';
export type WeightMode = 'births' | 'population' | 'equal';
export type Era = 'past' | 'today' | 'future';
export interface Country {
  id: string; flag: string; name_en: string; name_zh: string; name_ko: string;
  region: string; region_en: string; region_zh: string;
  pop: number; births: number; le: number; gap: number; u5: number; im: number;
  ppp: number; gi: number; tfr: number; mmr: number; urb: number; agr: number;
  hiv: number; hom: number; road: number; mal: number; net: number; ter: number;
  eys: number; sm: number; sf: number; oop: number; cm: number; wh: number | null;
  cs: (number | string)[] | null; war: number; rel: string; lang: string;
}
export interface Settings {
  weightMode: WeightMode;
  era: Era | 'random';
  duration: 30 | 60 | 90;
  gentler: boolean;
  classroom: boolean;
  autoChoices: boolean;
  autoLean?: 'balanced' | 'cautious' | 'adventurous' | 'family';
  /** Optional requested birth country; realCountry is a comparison only. */
  country?: string;
  realCountry?: string;
  dailyThemeDay?: string;
}
export type Focus = 'balanced' | 'health' | 'knowledge' | 'career' | 'relationships' | 'creativity';
export type Allocation = 'cash' | 'bonds' | 'balanced' | 'stocks' | 'business';
export type Employment = 'none' | 'student' | 'employed' | 'unemployed' | 'retired';
export type Job = OccupationalJob | 'cleaner'|'warehouse'|'cook'|'shop'|'factory'|'vendor'| 'dayActivities' | 'shelteredWork' | 'soldier' | 'childwork' | 'none' | 'student' | 'farmer' | 'artisan' | 'service' | 'teacher' | 'nurse' | 'engineer' | 'entrepreneur' | 'retired' | 'mechanic' | 'hairdresser';
export type Religion = 'christianity' | 'islam' | 'hinduism' | 'buddhism' | 'judaism' | 'folk' | 'other' | 'none';
import type {NamedSportId} from './named-sports';
export type HobbyId = NamedSportId | 'reading' | 'music' | 'sport' | 'art' | 'craft' | 'nature' | 'dance' | 'screen' | 'sns' | 'games' | 'faith' | 'fishing' | 'cooking' | 'garden' | 'hiking' | 'travel' | 'board' | 'writing' | 'drama' | 'photo' | 'gym' | 'karaoke';
export interface Hobby { id: HobbyId; skill: number; trainedAt: number; progress?:{since:number;level:number;lastSettledAge?:number;sidelinesAge?:number;milestonesSuppressedAge?:number;returnedToSportAge?:number;milestones?:{familiarAge?:number;accomplishedAge?:number}} }
export interface Budget { income: number; tax: number; food: number; housing: number; transport: number; health: number; leisure: number; education: number; dependents: number; totalExpenses: number; annualSavings: number }
export interface JobOffer { id: string; job: Job; income: number;terms?:OccupationTerms }
export type SpendingCategory = 'health'|'education'|'experiences'|'giving'|'family';
export type PetKind = 'dog'|'cat'|'parrot'|'rabbit'|'fish';
export interface Pet { id:string;kind:PetKind;name:string;age:number;alive:boolean }
export interface DailyTheme { id:'safeRoads'|'learning'|'kindness'|'freshAir';day:string }
export interface Stats {
  health: number; happiness: number; knowledge: number; social: number;
  /** 0 preschool, 1 primary, 2 secondary, 3 vocational, 4 university. */
  education: number;
  netAssets: number; savings: number; investments: number; annualIncome: number; debt: number;
  employment: Employment; job: Job; incomeQuintile: number;
  birthPlaceType: 'urban' | 'rural'; religion: Religion;
}
export type EventKind = 'birth' | 'milestone' | 'everyday' | 'career' | 'family' | 'health' | 'finance' | 'decision' | 'death' | 'reflection';
export type EventParams = Record<string, string | number>;
export interface GameEvent { id: string; age: number; year: number; key: string; params: EventParams; kind: EventKind; icon: string }
export interface Choice { id: string; key: string; params: EventParams }
export interface Decision { id: string; type: 'choice' | 'reflection'; age: number; key: string; params: EventParams; choices: Choice[] }
export interface Person {
  /** Citizenship observed when generating the person; residence changes do not rewrite it. */
  citizenship?:string;
  /** Observed relationship increments only; absent old bond is not backfilled. */
  bond?:number;
  id: string; name: string; sex: Sex; country: string; age: number; birthYear: number;
  alive: boolean; deathAge: number | null; job: Job;
}
export type DescendantEducation = 'unknown' | 'preschool' | 'school' | 'specialSchool' | 'outOfSchool' | 'secondary' | 'university' | 'graduate' | 'droppedOut';
/** Missing means not yet observed; importing a legacy save must not invent these facts. */
export interface ChildUnionPlan {
  version: 1; observedYear: number;
  orientation: 'unknown' | 'oppositeSex' | 'sameSex' | 'bisexual';
  sameSexPartner: boolean | null;
  cohabitationAge: number | null; cohabitationYear: number | null;
  fertilityTarget: number | null;
  disclosure?: { age: number | null; year: number | null };
}
export interface ChildProgress {
  careWorryYear?:number;
  carePlan?:import("./child-care-plan").ChildCarePlan;
  supportedWork?:{age:number;year:number;kind:import("./child-supported-work").ChildSupportedWork;urban:boolean;richAccess:boolean};
  travelPracticeAge?:number;
  schoolSupport?:import("./child-school-support").ChildSchoolSupport;
  developmentObservation?:import("./child-development-observation").ChildDevelopmentObservation;
  learningObservations?:import("./child-learning-observation").ChildLearningObservations;
  birthDevelopment?:import("./birth-development").BirthDevelopment;
  homePlan?: ChildHomePlan;
  weddingHome?: ChildWeddingHomeReceipt;
  /** Missing means willingness has never been observed. */
  board?: ChildBoardReceipt;
  retirement?: ChildRetirementRecord;
  /** Absent in legacy saves; decoding must never synthesize an admission draw. */
  admission?: ChildAdmissionState;
  universityFunding?: {version:1;year:number;packageCost:number;result?:ChildFundingResult};
  prison?: ChildSentence;
  bond?: number;
  unionPlan?: ChildUnionPlan;
  childId: string; education: DescendantEducation; employment: Employment; income: number; level: number;
  studyUntil: number | null; studyFunding: 'parent' | 'shared' | 'self' | null; universityResolved: boolean;
  spouse: Person | null; marriedYear: number | null; weddingAt: number | null; weddingResolved: boolean;
  residence: 'home' | 'independent'; migrationAt: number; migrationResolved: boolean;
  originCountry: string; migratedYear: number | null; lastVisitYear: number | null;
  firstPayYear: number | null; firstPayStatus: 'pending' | 'received' | 'unknown'; contribution: number;
}
export interface GrandchildOrigin {
  rulesVersion?: 2;
  method: 'natural' | 'adoption' | 'donor' | 'surrogacy';
  union: 'married' | 'cohabiting' | 'solo';
  country: string; household: 'parent' | 'otherParent';
}
export interface Grandchild extends Person, ChildProgress { origin?: GrandchildOrigin; parentId: string; fertilityTarget?: number; earlyLoss?: boolean }
export interface GreatGrandchild {
  id: string; grandchildId: string; name: string; sex: Sex; country: string; fertilityTarget?: number;
  age: number; birthYear: number; alive: boolean; deathAge: number | null;
}
export interface GreatGreatGrandchild extends Omit<GreatGrandchild, "grandchildId" | "fertilityTarget"> { greatGrandchildId: string }
export interface Descendants {
  guardianship?: GuardianshipState;
  pendingReconciliation?: {childId: string; year: number};
  rng: number; observedSince: number; lastYear: number; children: ChildProgress[]; grandchildren: Grandchild[];
  greatGrandchildren?: GreatGrandchild[];
  greatGreatGrandchildren?: GreatGreatGrandchild[];
  laterRng?: number; laterObservedSince?: number;
  annualTransfers: number; totalTransfers: number;
}
export interface Companion {
  id: string; name: string; country: Country; sex: Sex; age: number;
  alive: boolean; deathAge: number | null; cause: string | null;
  health: number; happiness: number; education: number; job: Job; lastJob: Job | null; children: number; netAssets: number;
}
/** Observed year-end state; null on legacy rows means the detail was never recorded. */
export interface AnnualRecord {
  /** Observed player income; absent on legacy records, distinct from household income. */
  personalIncome?: number;
  academic?: Pick<AcademicState, 'qualification' | 'doctorate'>;
  completed?: boolean;
  stageFocusWeights?: Partial<Record<StageFocus, number>> | null;
  focusWeights?: Partial<Record<Focus, number>> | null;
  country: string; job: Job; employment: Employment; education: number; focus: Focus; allocation: Allocation;
  income: number; totalExpenses: number; annualSavings: number; savings: number; investments: number; debt: number;
  partner: boolean; children: number; childrenAlive: number; relativesAlive: number;
  grandchildren: number | null; grandchildrenAlive: number | null;
  greatGrandchildren?: number | null; greatGrandchildrenAlive?: number | null;
  greatGreatGrandchildren?: number | null; greatGreatGrandchildrenAlive?: number | null;
}
export interface CareerRecord { age: number; job: Job;offer?:AcceptedOccupationQuote }
export interface Trajectory { annual: AnnualRecord | null; age: number; health: number; happiness: number; knowledge: number; social: number; netAssets: number }
export type HealthDiagnosis = 'infection' | 'injury' | 'cardiac' | 'premature' | 'chronic';
export type CareLevel = 'clinic' | 'hospital' | 'icu' | 'neonatal' | 'followup';
export type HealthTreatment = 'intensiveCare' | 'localCare' | 'supportiveCare' | 'attendFollowup' | 'skipFollowup';
export interface HealthEpisode {
  id: string; patientId: string; patientName: string; patientAge: number; country: string;
  diagnosis: HealthDiagnosis; level: CareLevel; startedAge: number;
  status: 'awaiting' | 'recovering' | 'recovered' | 'deceased';
  treatment: HealthTreatment | null; cost: number; untreatedRisk: number; access: number;
  closedAge: number | null; recoveryUntil: number | null;
}
export interface ChronicCondition {
  id: string; diagnosis: 'cardiac' | 'respiratory' | 'longTerm'; diagnosedAge: number;
  managed: boolean; nextReviewAge: number;
}
export interface Healthcare {
  episodes: HealthEpisode[]; activeEpisodeId: string | null; chronic: ChronicCondition[];
  lastCheckedAge: number; childChecks: { id: string; age: number }[]; totalOutOfPocket: number;
}
export interface Life {
  developmentObservations?:import("./development-observation").DevelopmentObservations;
  /** Latent birth observations; absence in old saves remains unknown. */
  birthDevelopment?:import("./birth-development").BirthDevelopment;
  physicalState?:import('./physical-state').PhysicalState;
  /** Latent learning inputs; absent legacy saves are never rerolled on decode. */
  learning?: LearningState;
  /** Explicit retake scheduling; legacy saves do not acquire invented application history. */
  universityAdmissions?: UniversityAdmissionsState;
  /** New school taxonomy; absent in legacy saves and not inferred from legacy education codes. */
  academics?: AcademicState;
  /** Versioned selection for stage-focus integration; legacy focus/history retain their meaning. */
  stageFocus?: { version: 1; selection: FocusSelection };
  playback?: { paused: boolean; speed: number };
  feed?: FeedState;
  timeline?: YearTimeline & {year: number; age: number; scheduledDecisions?: Decision[]; financePending?: boolean; focusTime?: Partial<Record<Focus, number>>; stageFocusTime?: Partial<Record<StageFocus, number>>};
  version: 1; id: string; seed: number; rng: number; settings: Settings; era: Era;
  country: Country; name: string; sex: Sex; age: number; year: number; birthYear: number;
  certificate: string; alive: boolean; deathAge: number | null; cause: string | null;
  stats: Stats; family: { parents: Person[]; siblings: Person[]; partner: Person | null; secondPartner?: Person | null; children: Person[]; married: boolean; marriageAge: number | null };
  companions: Companion[]; events: GameEvent[]; history: Trajectory[];
  pendingDecision: Decision | null; focus: Focus; allocation: Allocation;
  reflections: Record<string, string>; conditions: string[];
  decisions: string[];
  tribute?: string;
  mechanicsVersion: 7;
  descendants: Descendants;
  career: CareerRecord[];
  occupationExperience?: OccupationExperience;
  healthcare: Healthcare;
  temperament: { kind: 'undecided' | 'curious' | 'sociable' | 'careful' | 'energetic' | 'persistent'; settled: boolean };
  talents: HobbyId[]; hobbies: Hobby[];
  hobbyState?:{version:1;lessonHobby?:HobbyId;automaticLessons?:{since:number;pausedForFunds:boolean;lastPaidAge?:number;lastNoticeAge?:number};lifeStories?:{sharedPartner?:{id:string;name:string;hobby:HobbyId;age:number;label?:import('./physical-hobbies').AdaptedHobbyId};activities?:HobbyId[];contestAge?:number};pausedSince?:number;craftSalesSince?:number;offer?:{age:number;options:HobbyId[];replacement:HobbyId|null};declinedAge?:number;lastActionAge?:number;queuedAge?:number};
  schooling: { enrolled: boolean; droppedOut: boolean; years: number; childLabor: boolean; childWorkPaid?: boolean; university?: { startedAge: number; completedYears: number; lastProgressAge: number } };
  budget: Budget;
  belongings: { phone: boolean; transport: 'none' | 'bicycle' | 'car'; housing: 'family' | 'rent' | 'owned'; housingValue: number };
  residence: 'urban' | 'rural'; jobOffers: JobOffer[];jobOfferBatch?:OccupationQuoteBatch;
  training: { kind: 'mechanic' | 'hairdresser' | 'nightSchool' | null; endsAt: number | null; previousIncome: number; previousJob: Job };
  justice: { prisonUntil: number | null };
  relationship: { status: 'single' | 'dating' | 'cohabiting' | 'married'; childPlan: 'open' | 'waiting' | 'childfree'; nextChildDecisionAge: number; partnerIncome: number };
  care: { until: number | null; who: 'self' | 'partner' | null; previousIncome: number; previousJob: Job; previousPartnerIncome: number; daycareUntil: number | null; handledChildren: string[] };
  opportunities: { lastRiskAge: number; lastDebtAge: number; nextNightSchoolAge: number; nextRelationshipAge: number; moneylenderUntil: number | null };
  lifestyle: { diet:'balanced'|'healthy'|'convenient';insurance:'basic'|'full';gifts:'generous'|'modest'|'attendance' };
  annualSpending: Record<SpendingCategory,number>;
  pets: Pet[];dailyTheme: DailyTheme;
  migration: { birthCountry:Country;offerCountry:Country|null;lastMoveAge:number|null;familyCountry:string|null;moves:{age:number;country:string;together:boolean}[] };
}
