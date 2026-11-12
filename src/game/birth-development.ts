/** Source-game birth calibration (0.8.36), not clinical prevalence or a diagnostic model. */
export interface BirthDevelopment {
 version:1;
 developmental:null|{kind:'autism'|'intellectual';intellectualDisability:boolean;supportLevel:1|2|3;learningDifficulty:boolean;noticedAt:number};
 attentionLearning:null|{adhd:boolean;dyslexia:boolean;persistentAdhd:boolean;noticedAt:number|null};
}
export function intellectualDevelopmentProbability(ppp:number):number {
 const position=Math.max(0,Math.min(1,(Math.log(ppp)-Math.log(2500))/(Math.log(45000)-Math.log(2500))));
 return 1.77*Math.exp(Math.log(.0234)+(Math.log(.0033)-Math.log(.0234))*position);
}
export function drawBirthDevelopment(sex:'M'|'F',ppp:number,draw:()=>number):BirthDevelopment {
 const result:BirthDevelopment={version:1,developmental:null,attentionLearning:null};
 const integer=(low:number,high:number)=>low+Math.floor(draw()*(high-low+1));
 const autism=draw()<(sex==='M'?.0106:.0051);
 const intellectual=autism?draw()<.396:draw()<intellectualDevelopmentProbability(ppp);
 if(autism||intellectual){
  const severity=draw();
  const supportLevel=autism&&!intellectual||severity<.85?1:severity<.95?2:3;
  const learningDifficulty=autism?(intellectual||draw()<.4):true;
  let noticedAt=supportLevel===3?integer(1,2):supportLevel===2?integer(2,4):autism?integer(3,5):integer(6,8);
  if(autism&&!intellectual&&!learningDifficulty){
   const thresholds=sex==='M'?[.1,.6,.85]:[.05,.4,.7],band=draw();
   noticedAt=band<thresholds[0]?integer(3,5):band<thresholds[1]?integer(6,11):band<thresholds[2]?integer(12,17):integer(18,45);
  }
  result.developmental={kind:autism?'autism':'intellectual',intellectualDisability:intellectual,supportLevel,learningDifficulty,noticedAt};
  return result;
 }
 const adhd=draw()<(sex==='M'?.07:.035),dyslexia=draw()<(sex==='M'?.0922:.0466);
 if(adhd||dyslexia)result.attentionLearning={adhd,dyslexia,persistentAdhd:adhd&&draw()<.5,noticedAt:adhd?(sex==='F'?integer(7,12):integer(6,9)):null};
 return result;
}

/** Validation only: never infer or reroll traits for an older save. */
export function validateBirthDevelopment(value:unknown,sex:'M'|'F'):void {
 const fail=()=>{throw Error('Invalid or unsupported life save.');};
 const object=(v:any)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail();};
 const bool=(v:any)=>{if(typeof v!=='boolean')fail();};
 const integer=(v:any,min:number,max:number)=>{if(!Number.isInteger(v)||v<min||v>max)fail();};
 object(value);const data=value as BirthDevelopment;if(data.version!==1)fail();
 if(data.developmental!==null){
  const d=data.developmental;object(d);if(!['autism','intellectual'].includes(d.kind))fail();
  bool(d.intellectualDisability);bool(d.learningDifficulty);integer(d.supportLevel,1,3);
  if(d.kind==='intellectual'&&!d.intellectualDisability||d.intellectualDisability&&!d.learningDifficulty||!d.intellectualDisability&&d.supportLevel!==1)fail();
  const range=d.supportLevel===3?[1,2]:d.supportLevel===2?[2,4]:d.kind==='intellectual'?[6,8]:d.intellectualDisability||d.learningDifficulty?[3,5]:[3,45];
  integer(d.noticedAt,range[0],range[1]);
  if(data.attentionLearning!==null)fail();
 }
 if(data.attentionLearning!==null){
  const n=data.attentionLearning;object(n);bool(n.adhd);bool(n.dyslexia);bool(n.persistentAdhd);
  if(!n.adhd&&!n.dyslexia||!n.adhd&&(n.persistentAdhd||n.noticedAt!==null))fail();
  if(n.adhd)integer(n.noticedAt,sex==='F'?7:6,sex==='F'?12:9);
 }
}
