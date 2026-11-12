import {drawPhysicalBirth,physicalBirthDraw} from './physical-state';
import {educationEraInputs} from './education-era';
import {initializeNewGameFocus} from './school-focus';
import {createLife,DEFAULT_SETTINGS} from './engine';
import type {Settings,Life} from './types';
import {createLearningState,drawTalents} from './learning-state';
import {normalQuantile} from './normal-quantile';
/** Separate birth stream: school context must not reroll identity or the life-event stream. */
function birthDraw(seed:number){let state=(seed^0x65647531)>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return (state+.5)/4294967296;};}
/** New-life composition only. Never call for imported lives or resume/reload. */
export function createNewGame(settings:Settings=DEFAULT_SETTINGS,seed?:number):Life {
 const life=createLife(settings,seed),draw=birthDraw(life.seed);
 const bodyCountry={...life.country,...educationEraInputs(life.country,life.era,life.birthYear).statistics};
 life.physicalState=drawPhysicalBirth({...bodyCountry,year:life.birthYear},physicalBirthDraw(life.seed));
 const talents=drawTalents(draw),development=life.birthDevelopment?.developmental;
 if(development&&(development.kind==='intellectual'||development.intellectualDisability)){
  talents.study=Math.round((-2.4-1.2*(development.supportLevel-1)+.25*normalQuantile(Math.max(.0001,Math.min(.9999,draw()))))*100)/100;
 }
 life.learning=createLearningState(0,talents,life.stats.knowledge);
 // The current birth generator creates resident households, with no refugee,
 // irregular-entry, political or ethnic-status scenario. These explicit defaults
 // describe that generator, never an inference applied to an existing save.
 const rich=life.stats.incomeQuintile===5&&draw()<.05;
 const wealthBoost=rich?(draw()<.1?10:5):undefined;
 life.academics={origin:'birth',version:1,qualification:0,doctorate:false,medicine:false,studyCountry:life.country.id,enrollment:null,
  circumstances:{homeSchool:false,learningCentre:false,topMarkAge:null,developmentalProtection:(development?.supportLevel??0)>=2,accessModifiers:wealthBoost?{wealthBoost}:{}},
  studyAccess:{ethnicity:'none',naturalized:false,eastGerman:false,recentlyFled:false},
  academyAccess:{disability:null,papersValid:true,criminalRecord:false,idol:false},
  commissionFacts:{workShare:0,reducedHours:false,reducedWork:false,migrationPenalty:0,familyCanHelp:life.family.parents.some(p=>p.alive),rohingyaCamp:false,partyToJoin:null},
  primaryFacts:{rich,refugee:false,irregular:false,learningCentreOnly:false,absentParentIds:[]},
  upperFacts:{refugee:false,irregular:false,refugeeCamp:false,unregisteredBirth:false,militaryAcademy:false,studyAbroad:false,bullyingCount:0,hobbies:[]},
  collegeFacts:{adhd:!!life.birthDevelopment?.attentionLearning?.adhd,dyslexia:!!life.birthDevelopment?.attentionLearning?.dyslexia,dyslexiaDiagnosed:false,unsupportedAutism:development?.kind==='autism'&&!development.intellectualDisability,politicallyMarkedParent:false,rohingyaCamp:false,rohingyaRakhine:false},
 };
 initializeNewGameFocus(life);return life;
}
