import {COMPETITOR_PARITY_CATALOGS} from './catalogs/competitor-parity';
// Every other locale's catalog. In the browser build this module is swapped for a lazy loader
// (see vite.config.ts), so a visitor downloads English and their own language only.
import { LOCALE_CATALOGS, loadLocaleCatalog } from './catalogs/locales';
import { moneyPresentation, MONEY_REGIONS, type MoneyRegion } from "./money-display";
import { eventParameter } from './event-parameters';
import expansionEn from './catalogs/expansion-en.json';
import { ENGINE_MESSAGES } from '../game/messages';
export const LOCALES = [
  {code:'en',html:'en',label:'English'}, {code:'ko',html:'ko',label:'한국어'}, {code:'ja',html:'ja',label:'日本語'},
  {code:'zh',html:'zh-Hant',label:'繁體中文'}, {code:'zh-hans',html:'zh-Hans',label:'简体中文'}, {code:'vi',html:'vi',label:'Tiếng Việt'},
  {code:'fr',html:'fr',label:'Français'}, {code:'th',html:'th',label:'ไทย'}, {code:'es',html:'es',label:'Español'}, {code:'de',html:'de',label:'Deutsch'},
  {code:'tr',html:'tr',label:'Türkçe'}, {code:'ru',html:'ru',label:'Русский'},
  {code:'pt',html:'pt-BR',label:'Português'}, {code:'id',html:'id',label:'Bahasa Indonesia'},
] as const;
export type Locale = typeof LOCALES[number]['code'];
export const EN: Record<string,string> = {
  ...ENGINE_MESSAGES,
  ...COMPETITOR_PARITY_CATALOGS.en,
  "family.formation.adoption": "Joined the family through adoption",
  "family.formation.donor": "Born with donor assistance",
  "family.formation.surrogacy": "Born through surrogacy",
  "family.cohabitationStarted": "Began living with a partner in {year}",
  "family.motherHome": "Living with their mother",
  "family.earlyLoss": "Died in early childhood · exact age unknown",
  "family.greatGrandchildrenAlive": "Living great-grandchildren",
  "family.greatGreatGrandchildrenAlive": "Living great-great-grandchildren",
  "family.greatGrandchildren": "Great-grandchildren",
  "family.greatGreatGrandchildren": "Great-great-grandchildren",
  "bio.extraGreatGreat": ", {count} {count|one=great-great-grandchild|other=great-great-grandchildren}",
  ...expansionEn,
  "feel.youChose":"You chose", "bio.descendantsSummary":"Raised {children} {children|one=child|other=children}{extra}.", "bio.extraGrand":", {count} {count|one=grandchild|other=grandchildren}", "bio.extraGreat":", {count} {count|one=great-grandchild|other=great-grandchildren}", "record.goodbyeFull":"Your spouse {partner}, {children} {children|one=child|other=children}, {grandchildren} {grandchildren|one=grandchild|other=grandchildren}, your brothers and sisters and old friends", "record.goodbyeNoSpouse":"{children} {children|one=child|other=children}, {grandchildren} {grandchildren|one=grandchild|other=grandchildren}, your brothers and sisters and old friends", "record.companionBio":"Born a {gender} in {country}. Finished {edu}. Last job: {job}. Raised {children} {children|one=child|other=children}. Died of {cause} at age {age}.", "job.hairdresser":"Hairdresser", "feel.moreControls":"More controls", "record.goodbyeKids":"Your spouse {partner}, {children} {children|one=child|other=children}, your brothers and sisters and old friends", "record.goodbyeKidsNoSpouse":"{children} {children|one=child|other=children}, your brothers and sisters and old friends", "record.goodbyeSpouseOnly":"Your spouse {partner}, your brothers and sisters and old friends", "feel.chapterLabel":"Chapter {n}", "feel.chapter.early":"The first years", "feel.chapter.school":"School days", "feel.chapter.teen":"Growing up", "feel.chapter.adult":"A life of your own", "feel.chapter.building":"Building something", "feel.chapter.middle":"The middle years", "feel.chapter.later":"Later life",
  "feel.atlasTitle":"Where your lives began", "feel.atlasCount":"{n} of 172 countries · {lives} {lives|one=life|other=lives} · {years} {years|one=year|other=years} lived", "feel.newCountry":"A first for you: you have never been born here before.",
  "feel.journalTitle":"The choices that shaped this life",
  "decision.remarriage":"{name} has come into your life. Would you like to share your life with someone again?",
  "feel.journalAll":"Show all {n} choices",
  "feel.bio.born":"Born a {gender} in {country}.", "feel.bio.edu":"Finished {edu}.", "feel.bio.job":"Last job: {job}.", "bio.workedAs":"Last job: {job}.", "feel.bio.children":"Raised {children} children.", "feel.bio.child":"Raised one child.", "feel.bio.died":"Died of {cause} at age {age}.",
  "record.keptOnCard":"Kept on your card and in past lives", "record.ifYouLike":"If you'd like", "record.shortestLifeFirst":"Shortest life first", "record.themeRoad":"Safe roads",
  'seo.title':"1 in 8 Billion – Free Life Simulator Game | 1in8bn", 'seo.description':"Play free in your browser: be born in one of 172 countries by real birth odds, make life choices year by year and keep your life story. No download.",
  title:'1 in 8 Billion', subtitle:'Who would you be, if you were born again?',
  intro:'A life you did not choose. A world you can discover. Be born somewhere among 172 countries, and live an entire life, one year at a time.',
  free:'Free to play · 172 countries · Ages 15+', version:'Independent edition', born:'Be born', resume:'Continue this life',
  births:'Born in the world today', deaths:'Lives ended in the world today', estimates:'Estimates from annual demographic rates',
  world:'A whole world. One life.', worldNote:'Your birthplace is drawn from real demographic weights. Every dot is somewhere a life could begin.',
  settings:'Before you are born', era:'Which world?', past:'The past',today:'Today',future:'The future',random:'Any world',
  eraHelp:'The era changes the conditions of your life. Your country and family are drawn at birth.',
  weight:'How should chance choose?',birthsWeight:'Babies born now',populationWeight:'The 8 billion alive now',equalWeight:'Equal country chances',
  duration:'A lifetime, at your pace',minutes:'{n} minutes',realCountry:'Where were you actually born?',optional:'Optional',searchCountry:'Search countries…',none:'Not selected',
  gentle:'Gentler mode',gentleHelp:'Reduce early mortality and distressing events.',classroom:'Classroom mode',classroomHelp:'Gentler play with personal publishing disabled.',
  warning:'Lives may include illness, loss, poverty and death. Take a break whenever you need one. This is a simulation, not a prediction.',
  how:'Every life begins with chance',how1:'A place in the world',how1Text:'Birthplace, family, income and health are shaped by national statistics and chance.',
  how2:'Small choices, changing years',how2Text:'Learn, work, build relationships and decide what matters. Your choices influence the odds without guaranteeing an outcome.',
  how3:'A life worth remembering',how3Text:'Keep a record of the life you lived. Save your certificate, story and album for free.',
  pastLives:'House of past lives',emptyLives:'Your completed lives will be kept here, on this device.',emptyMemorials:'No lives have been shared here yet.',
  visit:'Visit',remember:'Light a candle',candle:'{n} candle',candles:'{n} candles',publish:'Share this life',
  download:'Download',export:'Export my lives',import:'Import my lives',transfer:'Move my lives',saved:'Saved on this device',storageError:'This browser could not save your life. Export a backup before closing.',
  importError:'This save file is invalid or incompatible.',imported:'Your lives have been imported.',close:'Close',cancel:'Cancel',continue:'Continue',back:'Back',
  light:'Light',dark:'Dark',theme:'Appearance',language:'Language',music:'Music',musicOn:'Music on',musicOff:'Music off',
  birthRegistration:'Birth registration',certificate:'Birth certificate',bornIn:'Born in {country}',bornOn:'Born in {year}',begin:'Begin this life',shareBirth:'Save birth card',
  sex:'Sex',male:'Male',female:'Female',country:'Country',place:'Place',urban:'City',rural:'Countryside',familyBackground:'Family income quintile',parents:'Parents',siblings:'Siblings',religion:'Religion',
  lifeExpectancy:'Life expectancy',underFive:'Under-5 mortality',gdp:'GDP per person (PPP)',birthOdds:'Your chance of being born here',oneIn:'1 in {n}',
  companions:'Born in the same second',sameAge:'At this same age',age:'Age',years:'{n} years',year:'Year',pause:'Pause',play:'Play',nextDecision:'Next decision',nextYear:'Next year',auto:'Auto mode',pauses:'Reflection pauses',exit:'Exit',
  'bio.academicQualification':'Education: {qualification}.',
  'qualification.0':'No completed qualification','qualification.1':'Primary school qualification','qualification.2':'Lower secondary qualification','qualification.3':'Upper secondary or vocational qualification','qualification.4':'Bachelor’s degree','qualification.5':'Master’s degree','qualification.doctorate':'Doctorate',
  identity:'Identity record',birth:'Birth',livesIn:'Lives in',education:'Education',education0:'Not in school yet',education1:'Primary school',education2:'Secondary school',education3:'Vocational education',education4:'University',
  status:'Status',health:'Health',happiness:'Happiness',knowledge:'Knowledge',social:'Relationships',statusHelp:'What do these mean?',
  statusHelpText:'Health affects survival. Happiness records wellbeing. Knowledge opens educational and career opportunities. Relationships influence family and social life. Higher values change the odds; they never guarantee an outcome.',
  netWorth:'Net worth (US PPP)',annualIncome:'Yearly income (US PPP)',dependent:'Still living with your parents',focus:'This year’s focus',babyFocus:'Early childhood is a time to grow. From age six, choose where to put your energy.',
  record:'Life record',newestFirst:'Newest first · star a memory',family:'Family and life',mother:'Mother',father:'Father',partner:'Partner',children:'Children',noPartner:'No partner',noChildren:'No children',
  lifeMap:'Life map',square:'1 square = 1 year',mapHint:'More vivid colors mark happier years. The outlined year marks life expectancy.',survival:'Survival curve',survivalHint:'Share of this birth cohort still alive',alive:'Alive',died:'Died',
  finances:'Money and possibilities',allocation:'Investment strategy',spend:'Spend on your life',amount:'Amount',spendHealth:'Healthcare',spendEducation:'Education',spendExperiences:'Experiences',spendGiving:'Giving',spendFamily:'Family',
  spendHelp:'Spend from your available savings. Investments can gain or lose value.',savings:'Savings',investments:'Investments',notEnough:'Not enough savings for this purchase.',
  decision:'A big decision',reflection:'A pause',writeReflection:'Write a thought to carry with you…',saveReflection:'Write it down and carry on',skipReflection:'Keep it to yourself and carry on',
  autoHelp:'Let the simulation make future decisions for you.',setAside:'Set aside',returnDecision:'Return to the decision',
  ending:'A life, lived.',livedYears:'{name} lived for {age} years.',cause:'Cause of death',again:'Be born again',reviewLife:'Look back at this life',
  keepsakes:'Keep this life',keepsakesFree:'Every keepsake is free.',story:'Life story',album:'Memory album',film:'Life film',print:'Print / save PDF',saveCard:'Save card',
  trajectory:'The shape of a life',comparison:'Four lives alongside yours',replay:'Replay this life',noReflections:'No written reflections in this life.',reflections:'Your reflections',
  statistics:'Country statistics',population:'Population',birthsYear:'Births per year',urbanPopulation:'Urban population',agriculture:'Working in agriculture',schoolYears:'Expected years of schooling',tertiary:'Tertiary enrollment',internet:'Internet use',fertility:'Fertility rate',
  maternal:'Maternal deaths per 100,000 births',hiv:'HIV prevalence',homicide:'Homicides per 100,000',road:'Road deaths per 100,000',smoking:'Tobacco use, men / women',healthSpending:'Out-of-pocket health spending',childMarriage:'Married before 18, women',satisfaction:'Life satisfaction / 10',gini:'Income Gini coefficient',
  dataNote:'Country data from the MIT-licensed Born Somewhere dataset. Statistical estimates simplify real societies and do not describe any one person.',install:'Install this game',
  independent:'An independent life simulation on 1in8bn.com. Not affiliated with the original 1in8b.life.',
  privacyText:'Game progress and reflections are stored in your browser. Export a backup to move devices. A memorial is public only after you choose to publish it. We store the shared life summary and messages in this site’s dedicated database. We do not use advertising trackers. You can remove a memorial with the same browser that published it. An anonymous browser session is counted for two minutes to show active players.',
  loading:'Loading…',error:'Something went wrong. Please try again.',confirmNew:'Your current life is saved. Start another life?',confirmImport:'Import replaces the lives stored on this device. Export a backup first.',confirmed:'Done',
  sceneHome:'A home in {country}',sceneSchool:'The school years',sceneWork:'A working life',sceneFamily:'A life with family',sceneRetired:'The quieter years',
};
// Locale catalogs are loaded independently of saved game state. Locales not loaded yet fall back to English.
export const catalogs = LOCALE_CATALOGS as Record<Locale,Record<string,string>>;
catalogs.en = EN;
/** Resolves once the locale's catalog is available; immediate on the server and for English. */
export const ensureLocale = (locale: Locale) => loadLocaleCatalog(locale);
export function translator(locale:Locale, currency:MoneyRegion='USD') {
  const presentation = moneyPresentation(locale, currency);
  const region = MONEY_REGIONS[presentation.moneyRegion];
  const labels: Record<string,string> = locale === 'en' ? {
    currency: 'Amounts in',
    netWorth: `Net worth (${region.adjective} prices)`, annualIncome: `Yearly income (${region.adjective} prices)`,
    gdp: `GDP per person (${region.adjective} prices)`, 'feature.ppp': `Amounts in ${presentation.moneyLabel}.`,
    'feature.treatmentPaid': 'Total paid for treatment: {amount}',
  } : {};
  const translate = (key:string,params:Record<string,string|number>={}) => {
    let template = labels[key] ?? catalogs[locale]?.[key] ?? EN[key] ?? key;
    const monetary = (field:string) => field === 'amount' || (key === 'event.secondWife' && field === 'cost') || (key === 'event.debtRelief' && ['forgiven','remaining'].includes(field));
    // Catalogs mark dollars as ${amount} or {amount} $; numeric amounts use the locale's currency format instead.
    template = template.replace(/\$?\{(\w+)\}(?:[ \u00a0]\$)?/g, (token, field) => monetary(field) && typeof params[field] === 'number' ? `{${field}}` : token);
    // Plural forms such as {n|one=год|few=года|many=лет|other=года} follow Intl.PluralRules.
    template = template.replace(/\{(\w+)\|([^{}]+)\}/g, (_,field,options:string) => {
      const forms = Object.fromEntries(options.split('|').map(option => option.split('=') as [string,string]));
      const count = Number(params[field]);
      return (Number.isFinite(count) ? forms[new Intl.PluralRules(locale).select(count)] : undefined) ?? forms.other ?? '';
    });
    return template.replace(/\{(\w+)\}/g, (_,field) => {
      const value = params[field] ?? `{${field}}`;
      if (monetary(field) && typeof value === 'number') return presentation.money(value);
      return String(eventParameter(locale,key,field,value,catalogs[locale] ?? EN,EN));
    });
  };
  return Object.assign(translate, presentation);
}
export function validLocale(code:string):code is Locale { return LOCALES.some(l=>l.code===code); }
