import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require=createRequire(import.meta.url);
const {buildSync}=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const source=buildSync({stdin:{contents:"export {DuoLandingSections} from './src/components/DuoLanding'; export {PoweredByAgora} from './src/components/DuoAgora';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},define:{'import.meta.env.PROD':'false'}}).outputFiles[0].text;
const loaded={exports:{} as {DuoLandingSections:React.ComponentType<any>;PoweredByAgora:React.ComponentType<any>}};
new Function('require','module','exports',source)(require,loaded,loaded.exports);
const {DuoLandingSections,PoweredByAgora}=loaded.exports;

test('the Agora credit links out in a new tab without tracking parameters',()=>{
  const html=renderToStaticMarkup(createElement(PoweredByAgora,{variant:'inline'}));
  assert.match(html,/Powered by<\/span>/);assert.match(html,/src="\/brand\/agora-logo.png"/);assert.match(html,/alt="Agora"/);
  assert.match(html,/target="_blank"/);assert.match(html,/rel="noopener"/);
  assert.match(html,/href="https:\/\/www.agora.io\/en\/"/);assert.match(html,/opens in a new tab/);
  const feature=renderToStaticMarkup(createElement(PoweredByAgora,{variant:'feature'}));
  assert.match(feature,/duo-agora-feature/);assert.match(feature,/Voice chat powered by/);assert.doesNotMatch(feature,/utm_/);
});

test('the landing explains rooms, privacy and voice and credits Agora in the voice section',()=>{
  const html=renderToStaticMarkup(createElement(DuoLandingSections,{onStart(){}}));
  for(const heading of ['Two lives on one screen.','From one link to two lifetimes.','Close, with room for privacy.','Talk while you live it.','Before you invite someone.','Ready when your person is.'])assert.ok(html.includes(heading),heading);
  assert.match(html,/href="https:\/\/www.agora.io\/en\/"/);
  assert.ok(html.includes('Money and balances'));assert.ok(html.includes('does not record or transcribe calls'));
  assert.equal((html.match(/<details>/g)??[]).length,5);
});
