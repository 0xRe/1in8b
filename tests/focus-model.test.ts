import test from 'node:test';
import assert from 'node:assert/strict';
import {stageFocusOptions, type FocusContext} from '../src/game/focus-model';
const base:FocusContext={age:30,service:false,school:null,betweenSchool:false,retaking:false,retired:false,working:false,elderWorking:false,faithHidden:false};
const cases:[string,Partial<FocusContext>,string[]][]=[
 ['infant',{age:5,service:true,school:'basic'},[]],
 ['service',{service:true,school:'university'},['balance','sport','family']],
 ['basic school',{age:6,school:'basic'},['study','play','help','sport','hobby']],
 ['school transition',{betweenSchool:true},['study','play','help','sport','hobby']],
 ['university',{school:'university'},['study','play','parttime','careerPrep','sport','hobby']],
 ['graduate',{school:'graduate'},['study','play','parttime','careerPrep','sport','hobby']],
 ['elder PhD',{age:70,retired:true,school:'phd'},['study','play','parttime','careerPrep','sport','hobby']],
 ['retake',{retaking:true},['study','play','parttime','sport','hobby']],
 ['child work',{age:14,working:true},['help','play','sport','hobby']],
 ['working adult',{age:15,working:true},['work','balance','family','health','learn','hobby']],
 ['other adult',{},['family','health','learn','hobby','rest']],
 ['working elder',{age:65,elderWorking:true},['work','family','health','mind','hobby','faith']],
 ['early retirement',{age:50,retired:true},['family','health','mind','hobby','faith','rest']],
 ['faith hidden',{age:70,faithHidden:true},['family','health','mind','hobby','rest']],
];
for(const [name,patch,expected] of cases)test(`focus eligibility: ${name}`,()=>assert.deepEqual(stageFocusOptions({...base,...patch}),expected));
test('mutating one returned choice list cannot change later options',()=>{
 const options=stageFocusOptions(base);options.length=0;
 assert.deepEqual(stageFocusOptions(base),['family','health','learn','hobby','rest']);
});
