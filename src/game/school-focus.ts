import {knowledgePercentile} from './focus-knowledge';
import type {Life,Focus} from './types';
import {stageFocusOptions,reconcileFocus,chooseStageFocus,type StageFocus} from './focus-model';
import {schoolFocusStage} from './school-model';
const legacy:Record<StageFocus,Focus>={study:'knowledge',play:'relationships',help:'relationships',sport:'health',hobby:'creativity',work:'career',balance:'balanced',family:'relationships',health:'health',learn:'knowledge',faith:'relationships',rest:'health',mind:'knowledge',parttime:'career',careerPrep:'knowledge'};
export function newFocusOptions(life:Life):StageFocus[]{
 const a=life.academics,age=life.age;
 const handoff=a?.lowerSecondary?.status==='pending'&&a.lowerSecondary.age===age||a?.upperSecondary?.status==='pending'&&a.upperSecondary.age===age||a?.college?.status==='pending'&&a.college.age===age||a?.lastGraduation?.age===age&&(a.lastGraduation.stage==='university'&&!life.decisions.includes(`academicAfterUniversity-${age}`)||a.lastGraduation.stage==='graduate'&&a.phdInvitation?.offered&&!life.decisions.includes(`academicPhd-${age}`));
 const between=!!a&&!a.circumstances?.developmentalProtection&&!a.enrollment&&!!handoff;
 return stageFocusOptions({age:life.age,service:false,school:schoolFocusStage(a?.enrollment??null),betweenSchool:between,retaking:life.universityAdmissions?.scheduledAge!=null&&!a?.enrollment&&life.stats.job==='student',retired:life.stats.employment==='retired',working:life.stats.employment==='employed',elderWorking:life.stats.employment==='employed',faithHidden:false});
}
export function refreshNewFocus(life:Life):void{
 if(life.academics?.origin!=='birth'||!life.stageFocus)return;
 life.stageFocus.selection=reconcileFocus(life.stageFocus.selection,newFocusOptions(life),false);
 const current=life.stageFocus.selection.current;if(current)life.focus=legacy[current];
}
export function selectNewFocus(input:Life,focus:StageFocus):Life{
 if(!input.alive||!input.stageFocus||input.academics?.origin!=='birth')return input;
 const selection=chooseStageFocus(input.stageFocus.selection,focus,newFocusOptions(input));
 if(selection===input.stageFocus.selection)return input;
 return {...input,stageFocus:{version:1,selection},focus:legacy[focus]};
}

/** Birth composition only. Existing imported histories never enter this initializer. */
export function initializeNewGameFocus(life:Life):void{
 if(life.age!==0||life.academics?.origin!=='birth'||!life.learning||life.stageFocus)return;
 life.stageFocus={version:1,selection:{current:null,picked:null,returnTo:null,automaticFallback:null}};
 life.stats.knowledge=knowledgePercentile(0,life.learning.talents.study,life.learning.effort);
 for(const record of life.history){record.knowledge=life.stats.knowledge;if(record.annual)record.annual.academic={qualification:0,doctorate:false};}
}
