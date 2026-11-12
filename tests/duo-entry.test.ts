import test from 'node:test';
import assert from 'node:assert/strict';
import {duoEntryChoice,validDuoSecret} from '../src/lib/duo-entry';
test('fresh invitations keep a separate admission path even with another seat in shared storage',()=>{
 assert.deepEqual(duoEntryChoice({fragment:'a'.repeat(64),pending:false,tabCredential:null,localCredential:'host'}),{pending:true,credential:null,malformed:false});
});
test('malformed fragments do not become pending admissions or adopt another tab seat',()=>{
 for(const fragment of ['null','undefined','','short'])assert.deepEqual(duoEntryChoice({fragment,pending:true,tabCredential:null,localCredential:'host'}),{pending:false,credential:null,malformed:true});
 assert.equal(validDuoSecret('a'.repeat(64)),true);assert.equal(validDuoSecret(null),false);
});
test('the same tab can securely recover its own seat while a retained admission remains retryable',()=>{
 assert.equal(duoEntryChoice({fragment:'null',pending:false,tabCredential:'guest',localCredential:'host'}).credential,'guest');
 assert.equal(duoEntryChoice({fragment:null,pending:true,tabCredential:'guest',localCredential:'host'}).credential,null);
 assert.equal(duoEntryChoice({fragment:null,pending:false,tabCredential:'guest',localCredential:'host'}).credential,'guest');
});

test('reopening a successfully accepted link restores only the proven same-tab character',()=>{
 const fragment='b'.repeat(64);
 assert.equal(duoEntryChoice({fragment,pending:false,tabCredential:'guest',localCredential:'host',acceptedInvite:fragment}).credential,'guest');
 assert.equal(duoEntryChoice({fragment,pending:false,tabCredential:null,localCredential:'host',acceptedInvite:fragment}).credential,null);
 assert.equal(duoEntryChoice({fragment,pending:false,tabCredential:'host',localCredential:'host',acceptedInvite:'c'.repeat(64)}).credential,null);
});
test('an incomplete-link marker survives fragment removal without allowing a shared-storage seat on reload',()=>{
 assert.equal(duoEntryChoice({fragment:null,pending:false,tabCredential:null,localCredential:'host',incomplete:true}).credential,null);
 assert.equal(duoEntryChoice({fragment:null,pending:false,tabCredential:'guest',localCredential:'host',incomplete:true}).credential,'guest');
});
