import test from 'node:test';import assert from 'node:assert/strict';
import {studyLanguageMatches} from '../src/game/study-language';
test('secondary graduates use learned English and French in overseas applications',()=>{
 assert.equal(studyLanguageMatches('IND','USA',3,false),true);
 assert.equal(studyLanguageMatches('IND','USA',2,false),false);
 assert.equal(studyLanguageMatches('MAR','FRA',3,false),true);
 assert.equal(studyLanguageMatches('MAR','FRA',2,false),false);
});
test('graduate English programs bypass preparation without inventing undergraduate fluency',()=>{
 assert.equal(studyLanguageMatches('JPN','DEU',3,false),false);
 assert.equal(studyLanguageMatches('JPN','DEU',4,true),true);
 assert.equal(studyLanguageMatches('JPN','USA',4,true),true);
 assert.equal(studyLanguageMatches('JPN','RUS',4,true),false);
});
test('known languages bridge destination language sets and unsupported pairs remain unmatched',()=>{
 assert.equal(studyLanguageMatches('JPN','FRA',3,false,['fr']),true);
 assert.equal(studyLanguageMatches('JPN','FRA',3,false,['ru']),false);
 assert.equal(studyLanguageMatches('BRA','PRT',3,false),true);
 assert.equal(studyLanguageMatches('NGA','GBR',2,false),true);
});
