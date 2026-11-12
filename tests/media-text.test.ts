import test from 'node:test';
import assert from 'node:assert/strict';
import {textLines} from '../src/lib/life-media';
function render(text:string,width:number,limit:number){const lines:{text:string,y:number}[]=[];const ctx={measureText:(value:string)=>({width:Array.from(value).length}),fillText:(text:string,_x:number,y:number)=>lines.push({text,y})};const end=textLines(ctx as unknown as CanvasRenderingContext2D,text,0,10,width,20,limit);return {lines,end};}
test('a truncated single-line image caption retains its text before the ellipsis',()=>{
 assert.deepEqual(render('abcdefgh',5,1),{lines:[{text:'abcd…',y:10}],end:30});
});
test('a wrapped caption uses its final line instead of replacing it with an ellipsis',()=>{
 assert.deepEqual(render('abcdefghijklmn',5,2),{lines:[{text:'abcde',y:10},{text:'fghi…',y:30}],end:50});
});
test('exact-fit and Unicode captions preserve all visible characters',()=>{
 assert.deepEqual(render('abcde',5,1).lines,[{text:'abcde',y:10}]);
 assert.deepEqual(render('你好🌱世界故事',5,1).lines,[{text:'你好🌱世…',y:10}]);
});
test('spaced scripts wrap between words and honour line breaks',()=>{
 assert.deepEqual(render('grain of this life',10,4).lines.map(l=>l.text),['grain of','this life']);
 assert.deepEqual(render('Cause: age\nWho next?',12,4).lines.map(l=>l.text),['Cause: age','Who next?']);
 assert.deepEqual(render('a extraordinarily',6,4).lines.map(l=>l.text),['a','extrao','rdinar','ily']);
});
