import test from 'node:test';
import assert from 'node:assert/strict';
import {LOCALES} from '../src/lib/i18n';
import {localeUrl} from '../src/lib/site-url';
import {seoHead,structuredData,OG_IMAGE} from '../src/lib/seo';
import {readFileSync} from 'node:fs';
test('all localized pages have self canonical, reciprocal language links and complete social previews',()=>{
 for(const l of LOCALES){
  const h=seoHead(l.code);assert.equal(h.links.find(x=>x.rel==='canonical')?.href,localeUrl(l.code));
  assert.equal(h.links.filter(x=>'hrefLang' in x).length,LOCALES.length+1);
  for(const alt of LOCALES)assert.ok(h.links.some(x=>'hrefLang' in x&&x.hrefLang===alt.html&&x.href===localeUrl(alt.code)));
  assert.ok(h.meta.some(x=>'name' in x&&x.name==='twitter:card'&&x.content==='summary_large_image'));
  assert.ok(h.meta.some(x=>'property' in x&&x.property==='og:image'&&x.content===OG_IMAGE));
  const graph=structuredData(l.code)['@graph'];const ids=new Set(graph.map(x=>x['@id']));
  assert.equal(ids.size,4);assert.ok(ids.has(`${localeUrl(l.code)}#game`));
  assert.ok(!JSON.stringify(graph).includes('aggregateRating'));
 }
});
test('social preview is a real PNG with declared dimensions',()=>{
 const png=readFileSync(new URL('../public'+new URL(OG_IMAGE).pathname,import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
});
