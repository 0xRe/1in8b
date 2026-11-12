import test from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { readLocalSave, writeLocalSave, SaveConflict } from "../src/lib/persistence";
test("save queue preserves order and refuses a stale tab overwrite",async()=>{
  Object.assign(globalThis,{indexedDB,localStorage:{getItem:()=>null}});
  assert.equal(await readLocalSave(),null);
  await Promise.all([writeLocalSave("first"),writeLocalSave("second")]);
  assert.equal(await readLocalSave(),"second");
  await new Promise<void>((resolve,reject)=>{
    const request=indexedDB.open("1in8bn-local",1);
    request.onsuccess=()=>{const database=request.result,tx=database.transaction("saves","readwrite");tx.objectStore("saves").put("other-tab","current");tx.oncomplete=()=>{database.close();resolve()};tx.onerror=()=>reject(tx.error)};
  });
  await assert.rejects(writeLocalSave("stale-tab"),SaveConflict);
  assert.equal(await readLocalSave(),"other-tab");
  await writeLocalSave("after-reload");
  assert.equal(await readLocalSave(),"after-reload");
});

test('import stages metadata, rejects a mid-write quota failure and restores both stores',async()=>{
 const {createLife,DEFAULT_SETTINGS}=await import('../src/game/engine');
 const {encodeSave}=await import('../src/game/storage');
 const {importBackup}=await import('../src/lib/transfer');
 const life=createLife(DEFAULT_SETTINGS,345),room=`1in8bn-room-${life.id}`,film=`1in8bn-film-${life.id}`;
 const original=JSON.stringify({title:'Original room',words:'Private words'}),values=new Map([[room,original]]);
 let fail=true;
 Object.assign(globalThis,{indexedDB,localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{if(key===film&&fail)throw new DOMException('Quota exceeded','QuotaExceededError');values.set(key,value);},removeItem:(key:string)=>values.delete(key)}});
 await readLocalSave();await writeLocalSave('before-import');
 const backup=JSON.parse(encodeSave(life,[]));backup.rooms={[life.id]:{title:'Imported replacement'}};backup.films={[life.id]:{title:'Imported film'}};
 const staged=importBackup(JSON.stringify(backup));
 assert.equal(values.get(room),original,'decoding has no side effects');
 await assert.rejects(writeLocalSave(encodeSave(staged.life,staged.past),staged.metadata),{name:'QuotaExceededError'});
 assert.equal(values.get(room),original);assert.equal(values.has(film),false);
 assert.equal(await readLocalSave(),'before-import');
 fail=false;await writeLocalSave(encodeSave(staged.life,staged.past),staged.metadata);
 assert.equal(JSON.parse(values.get(room)!).title,'Imported replacement');assert.equal(JSON.parse(values.get(film)!).title,'Imported film');
 assert.equal(await readLocalSave(),encodeSave(life,[]));
});

test('queued import checks stale-tab state before touching room or film metadata',async()=>{
 const values=new Map([['room','Original room']]);let writes=0;
 Object.assign(globalThis,{indexedDB,localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{writes++;values.set(key,value);},removeItem:(key:string)=>values.delete(key)}});
 await readLocalSave();await writeLocalSave('current-tab');
 await new Promise<void>((resolve,reject)=>{const request=indexedDB.open('1in8bn-local',1);request.onsuccess=()=>{const d=request.result,tx=d.transaction('saves','readwrite');tx.objectStore('saves').put('newer-other-tab','current');tx.oncomplete=()=>{d.close();resolve();};tx.onerror=()=>reject(tx.error);};});
 await assert.rejects(writeLocalSave('imported-life',[['room','Imported room']]),SaveConflict);
 assert.equal(writes,0);assert.equal(values.get('room'),'Original room');assert.equal(await readLocalSave(),'newer-other-tab');
});

test('an IndexedDB save remains readable when browser localStorage access is denied', { timeout: 2000 }, async () => {
  const isolated = new (await import('fake-indexeddb')).IDBFactory();
  Object.assign(globalThis, { indexedDB: isolated });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('Storage access denied', 'SecurityError'); },
  });
  try {
    assert.equal(await readLocalSave(), null);
    await writeLocalSave('indexed-only');
    assert.equal(await readLocalSave(), 'indexed-only');
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: () => null } });
  }
});

test('archive metadata deletion commits with the save and preserves memorial ownership', async () => {
  const values = new Map([['1in8bn-room-deleted', 'private room'], ['1in8bn-film-deleted', 'private film'], ['1in8bn-owner-deleted', 'owner credential']]);
  Object.assign(globalThis, {indexedDB: new (await import('fake-indexeddb')).IDBFactory(), localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => values.delete(key),
  }});
  await readLocalSave(); await writeLocalSave('before-removal');
  await writeLocalSave('after-removal', [['1in8bn-room-deleted', null], ['1in8bn-film-deleted', null]]);
  assert.equal(values.has('1in8bn-room-deleted'), false);
  assert.equal(values.has('1in8bn-film-deleted'), false);
  assert.equal(values.get('1in8bn-owner-deleted'), 'owner credential');
  assert.equal(await readLocalSave(), 'after-removal');
});

test('a failed metadata removal rolls back earlier removals and the IndexedDB archive', async () => {
  const values = new Map([['room', 'private room'], ['film', 'private film']]);
  Object.assign(globalThis, {indexedDB: new (await import('fake-indexeddb')).IDBFactory(), localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => { if (key === 'film') throw new DOMException('Storage denied', 'SecurityError'); values.delete(key); },
  }});
  await readLocalSave(); await writeLocalSave('original-archive');
  await assert.rejects(writeLocalSave('deleted-archive', [['room', null], ['film', null]]), {name: 'SecurityError'});
  assert.equal(values.get('room'), 'private room'); assert.equal(values.get('film'), 'private film');
  assert.equal(await readLocalSave(), 'original-archive');
});

test('archive removal also discards the legacy fallback so a missing current save cannot resurrect deleted lives', async () => {
  const {createLife,advanceYear,DEFAULT_SETTINGS} = await import('../src/game/engine');
  const {encodeSave} = await import('../src/game/storage');
  const {planArchiveRemoval} = await import('../src/lib/archive-management');
  let life=createLife({...DEFAULT_SETTINGS,autoChoices:true},508);
  while(life.alive)life=advanceYear(life);
  const old=encodeSave(life,[life]),values=new Map([['1in8bn-save-v1',old]]),factory=new (await import('fake-indexeddb')).IDBFactory();
  Object.assign(globalThis,{indexedDB:factory,localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
  assert.equal(await readLocalSave(),old);
  const next=planArchiveRemoval(life,[life],[life.id]);
  await writeLocalSave(encodeSave(next.life,next.past),next.metadata);
  assert.equal(values.has('1in8bn-save-v1'),false);
  await new Promise<void>((resolve,reject)=>{const r=factory.open('1in8bn-local',1);r.onsuccess=()=>{const d=r.result,tx=d.transaction('saves','readwrite');tx.objectStore('saves').delete('current');tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>reject(tx.error)};});
  assert.equal(await readLocalSave(),null);
});
