import test from 'node:test';
import assert from 'node:assert/strict';
import { portraitPaths } from '../src/lib/portrait';

function pixels(seed: number, age: number, sex: string) {
  const grid = Array.from({length:48},()=>Array<string>(40));
  for (const path of portraitPaths({seed,age,sex}))
    for (const match of path.d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
      const [,x,y,width] = match.map(Number);
      for(let dx=0;dx<width;dx++)grid[y][x+dx]=path.color;
    }
  return grid;
}

test('infant heads remain connected to their clothing through a real neck across appearances',()=>{
  for(const seed of [...Array.from({length:96},(_,i)=>i),0x80000000,0xffffffff,12345])for(const age of [0,1,2])for(const sex of ['M','F']){
    const grid=pixels(seed,age,sex),background=new Set([grid[0][0],grid[3][20],grid[7][20]]);
    const seen=new Set<string>(),queue:[number,number][]=[[20,24]];
    for(let at=0;at<queue.length;at++){
      const [x,y]=queue[at],key=`${x},${y}`;
      if(x<0||x>=40||y<0||y>=48||seen.has(key)||background.has(grid[y][x]))continue;
      seen.add(key);queue.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);
    }
    assert.ok(seen.has('20,47'),`head floats above body: seed=${seed}, age=${age}, sex=${sex}`);
  }
});

test('portraits are deterministic, self-contained and change with age', () => {
  const adult = portraitPaths({ seed: 42, age: 30, sex: 'F' });
  assert.deepEqual(adult, portraitPaths({ seed: 42, age: 30, sex: 'F' }));
  assert.notDeepEqual(adult, portraitPaths({ seed: 42, age: 80, sex: 'F' }));
  assert.notDeepEqual(adult, portraitPaths({ seed: 42, age: 1, sex: 'F' }));
  for (const p of adult) { assert.match(p.color, /^#[0-9a-f]{6}$/); assert.match(p.d, /^(M\d+ \d+h\d+v1h-\d+z)+$/); }
  const covered = adult.reduce((sum, p) => sum + [...p.d.matchAll(/h(\d+)v1/g)].reduce((n, m) => n + Number(m[1]), 0), 0);
  assert.equal(covered, 40 * 48, 'every pixel of the 40×48 portrait is painted exactly once');
});
