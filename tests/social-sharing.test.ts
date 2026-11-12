import test from 'node:test';import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import {shareIntents,shareLinkAction,copyImageAction,birthInvitationUrl} from '../src/lib/social-sharing';
import {shareQrMatrix} from '../src/lib/share-qr';
test('social composers preserve Unicode and a single encoded invitation URL',()=>{
 const text='你好 & a life? #1',url='https://1in8bn.com/zh-hans/?born=JPN';
 const links=shareIntents(text,url);
 for(const key of ['facebook','telegram','reddit','line','vk'] as const)assert.ok(new URL(links[key]).protocol==='https:');
 assert.equal(new URL(links.facebook).searchParams.get('u'),url);
 assert.equal(new URL(links.telegram).searchParams.get('text'),text);assert.equal(new URL(links.telegram).searchParams.get('url'),url);
 assert.equal(new URL(links.line).searchParams.get('url'),url);assert.equal(new URL(links.reddit).searchParams.get('title'),text);
 assert.equal(new URL(links.whatsapp).searchParams.get('text'),`${text}\n${url}`);
});
test('link sharing works without file-sharing support and distinguishes cancellation',async()=>{
 let received:any;
 assert.equal(await shareLinkAction({share:async data=>{received=data;}},{title:'Life',text:'Try it',url:'https://1in8bn.com/'}),'shared');
 assert.equal(received.url,'https://1in8bn.com/');assert.equal(received.files,undefined);
 assert.equal(await shareLinkAction({}, {title:'',text:'',url:''}),'unsupported');
 assert.equal(await shareLinkAction({share:async()=>{throw new DOMException('cancel','AbortError');}},{title:'',text:'',url:''}),'cancelled');
});
test('copying PNG reports unavailable and denied clipboard without false success',async()=>{
 const blob=new Blob(['png'],{type:'image/png'});let item:any;
 assert.equal(await copyImageAction({},blob),false);
 class Item{constructor(public data:Record<string,Blob>) {}}
 assert.equal(await copyImageAction({clipboard:{write:async values=>{item=values[0];}}},blob,Item as any),true);assert.equal(item.data['image/png'],blob);
 assert.equal(await copyImageAction({clipboard:{write:async()=>{throw Error('denied');}}},blob,Item as any),false);
});
test('locally generated card QR decodes to the exact invitation, without private save fields',()=>{
 const url=birthInvitationUrl('zh-hans','JPN'),matrix=shareQrMatrix(url),scale=8,quiet=4,width=(matrix.length+quiet*2)*scale;
 const pixels=new Uint8ClampedArray(width*width*4);pixels.fill(255);
 matrix.forEach((row,y)=>row.forEach((dark,x)=>{if(dark)for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const i=(((y+quiet)*scale+dy)*width+(x+quiet)*scale+dx)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;}}));
 const result=jsQR(pixels,width,width);assert.equal(result?.data,url);
 assert.deepEqual([...new URL(result!.data).searchParams.keys()],['born']);
});

test('a living adult shares their current age rather than a newborn description',async()=>{
 const {createLife,DEFAULT_SETTINGS}=await import('../src/game/engine');const {translator}=await import('../src/lib/i18n');const {shareText}=await import('../src/lib/life-media');
 const life=createLife(DEFAULT_SETTINGS,124);life.age=32;life.year=life.birthYear+32;
 const text=shareText(life,'en',translator('en'));assert.ok(text.includes('32'));assert.ok(text.includes(String(life.year)));
});

test('the actual platform panel exposes all composers, copy actions and a scan invitation',async()=>{
 const {createElement}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{ShareDestinations}=await import('../src/components/ShareDestinations');
 const html=renderToStaticMarkup(createElement(ShareDestinations,{locale:'en',title:'Life',text:'My life',url:'https://1in8bn.com/?born=JPN'}));
 for(const domain of ['x.com','threads.net','facebook.com','wa.me','t.me','reddit.com','line.me','vk.com'])assert.ok(html.includes(domain),domain);
 assert.ok(html.includes('Copy invitation link'));assert.ok(html.includes('Copy post'));assert.ok(html.includes('Instagram'));assert.ok(html.includes('WeChat'));assert.ok(html.includes('role="img"'));assert.ok(html.includes('nothing is posted automatically'));
});
test('the QR raster used on exported cards remains decodable at its actual small size',async()=>{
 const {drawShareQr}=await import('../src/lib/share-qr');const url=birthInvitationUrl('en','JPN'),width=200,pixels=new Uint8ClampedArray(width*width*4);pixels.fill(255);
 const ctx={fillStyle:'#ffffff',save(){},restore(){},fillRect(x:number,y:number,w:number,h:number){const color=this.fillStyle==='#ffffff'?255:0;for(let row=Math.ceil(y);row<y+h;row++)for(let col=Math.ceil(x);col<x+w;col++){const i=(row*width+col)*4;pixels[i]=pixels[i+1]=pixels[i+2]=color;}}};
 drawShareQr(ctx as unknown as CanvasRenderingContext2D,url,24,20,140);assert.equal(jsQR(pixels,width,width)?.data,url);
});

test('inline life results expose eight branded composers without opening a dialog',async()=>{
 const {createElement}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{LifeShareStrip}=await import('../src/components/LifeShareStrip');
 const {createLife,DEFAULT_SETTINGS}=await import('../src/game/engine'),{translator}=await import('../src/lib/i18n');
 for(const ended of [false,true]){
  const life=createLife(DEFAULT_SETTINGS,124);if(ended){life.age=91;life.year=life.birthYear+91;life.alive=false;}
  const html=renderToStaticMarkup(createElement(LifeShareStrip,{life,locale:'zh-hans',t:translator('zh-hans'),onOpenCard(){}}));
  assert.equal((html.match(/class="social-platform social-platform--/g)??[]).length,8);
  assert.equal((html.match(/class="social-mark social-mark--[^\"]+" aria-hidden="true"><svg/g)??[]).length,8);
  for(const platform of ['x','threads','facebook','whatsapp','telegram','reddit','line','vk'])assert.ok(html.includes(`social-platform--${platform}`),platform);
  assert.ok(html.includes('分享这段人生'));assert.ok(html.includes('1in8bn.com'));assert.ok(html.includes('制作分享图片'));
  assert.ok(!html.includes('<details'));assert.ok(!html.includes('role="dialog"'));
  assert.ok(html.includes('%2Fzh-hans%2F'));assert.ok(html.includes(ended?'-91-':'-0-'));
 }
});


test('classroom results do not add public social composer links',async()=>{
 const {createElement}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{LifeShareStrip}=await import('../src/components/LifeShareStrip');
 const {createLife,DEFAULT_SETTINGS}=await import('../src/game/engine'),{translator}=await import('../src/lib/i18n');
 const life=createLife({...DEFAULT_SETTINGS,classroom:true},124);
 assert.equal(renderToStaticMarkup(createElement(LifeShareStrip,{life,locale:'en',t:translator('en')})),'');
});

test('inline results offer a caption copy separately from the invitation link',async()=>{
 const {createElement}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{ShareDestinations}=await import('../src/components/ShareDestinations');
 const html=renderToStaticMarkup(createElement(ShareDestinations,{variant:'inline',locale:'en',title:'Life',text:'A family moment',url:'https://1in8bn.com/?born=JPN',storyMode:'moment'}));
 assert.ok(html.includes('Copy post'));assert.ok(html.includes('Copy invitation link'));assert.ok(!html.includes('<details'));
});

test("fallback from image sharing to link sharing succeeds when file share is unsupported", async () => {
  let linkShared = false;
  const mockBrowser = {
    share: async (data: any) => {
      if (data.files) throw new Error("File sharing not supported");
      linkShared = true;
    }
  };
  const { shareImageAction, shareLinkAction } = await import("../src/lib/social-sharing");
  const file = new File(["test"], "test.png", { type: "image/png" });
  const imgRes = await shareImageAction(mockBrowser as any, file, { title: "Life", text: "Text", url: "https://1in8bn.com" });
  assert.equal(imgRes, "unsupported");
  
  const linkRes = await shareLinkAction(mockBrowser as any, { title: "Life", text: "Text", url: "https://1in8bn.com" });
  assert.equal(linkRes, "shared");
  assert.equal(linkShared, true);
});

test("prepareQuickShare provides link-ready QuickShare with file=null when file share is unsupported", async () => {
  const { prepareQuickShare } = await import("../src/lib/quick-share");
  const { createLife, DEFAULT_SETTINGS } = await import("../src/game/engine");
  const { translator } = await import("../src/lib/i18n");

  const life = createLife(DEFAULT_SETTINGS, 42);
  life.alive = false;
  life.age = 80;

  const mockBrowser = {
    share: async () => {},
    canShare: (_data: any) => false // does not support files
  };

  const ready = await prepareQuickShare(life, "en", translator("en"), mockBrowser as any);
  assert.ok(ready !== null, "QuickShare should not be null when share() is available");
  assert.equal(ready!.file, null, "File should be null when canShare({ files }) is false");
  assert.ok(ready!.url.includes("1in8bn.com"));
  assert.ok(ready!.text.includes(life.name));
});

test("BirthInvitation recovers deterministic birth country when born query parameter is omitted", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { BirthInvitation } = await import("../src/components/BirthInvitation");
  const { encodeLifeCode } = await import("../src/lib/life-share");

  // life code for age 88
  const code = encodeLifeCode({ seed: 124, age: 88, birthYear: 2026, sex: "M", kind: "park", sceneAge: 40, grain: null });
  // Omit '?born=' completely
  const search = `?life=${code}&n=TestUser`;
  const html = renderToStaticMarkup(createElement(BirthInvitation, { locale: "en", onBegin: () => {}, disabled: false, search }));
  
  assert.ok(!html.includes("in —"), "Should not show empty country em-dash 'in —'");
  assert.ok(html.includes("88"), "Should display life age 88");
});

test("sharePreview derives country from life seed when born parameter is omitted", async () => {
  const { sharePreview } = await import("../src/lib/share-preview");
  const { encodeLifeCode } = await import("../src/lib/life-share");
  const { createLife, DEFAULT_SETTINGS } = await import("../src/game/engine");
  const { countryName } = await import("../src/game/countries");

  const seed = 124;
  const life = createLife(DEFAULT_SETTINGS, seed);
  const country = life.migration.birthCountry;
  const expectedCountryName = countryName(country, "en");

  const code = encodeLifeCode({ seed, age: 92, birthYear: 2026, sex: "M", kind: "park", sceneAge: 40, grain: null });
  // URL completely lacks born parameter
  const preview = sharePreview(new URL(`https://1in8bn.com/?life=${code}&n=Alex`));
  
  assert.ok(preview !== null);
  assert.ok(preview!.title.includes(expectedCountryName), `Title "${preview!.title}" should include "${expectedCountryName}"`);
  assert.ok(!preview!.title.includes("1in8bn"), "Title should not fall back to 1in8bn as country name");
  assert.ok(preview!.description.includes(expectedCountryName), "Description should include country name");
});
