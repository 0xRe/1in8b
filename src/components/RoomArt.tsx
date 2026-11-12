import type { Item, Room } from '../lib/room-data';
export const CLOTHING: Record<string,string>={everyday:'#527b75',navy:'#334c6c',red:'#ad4b49',yellow:'#d4b650',white:'#eee9df',pink:'#ca9da8',green:'#738b5b',black:'#363b3d'};
const wood='#927358',dark='#514b43',cream='#e5dac5',green='#708d68';
export function ExtraObjectArt({item}:{item:Item}) {
  switch(item){
    case 'armchair': return <g><path d="M-21-30h42v35h-42z" fill="#ad8779"/><path d="M-27-18h9v30h-9zM18-18h9v30h-9zM-18 0h36v10h-36z" fill="#c29c89"/></g>;
    case 'stool': return <g fill={wood}><path d="M-18-10h36v7h-36zM-14-3h5v21h-5zM9-3h5v21h-5z"/></g>;
    case 'bench': return <g fill={wood}><path d="M-35-27h70v8h-70zM-35-15h70v8h-70zM-39-5h78v8h-78zM-30 3h5v15h-5zM25 3h5v15h-5z"/></g>;
    case 'diningTable': case 'coffeeTable': return <g fill={wood}><path d={item==='diningTable'?'M-43-28h86v9h-86zM-36-19h6v34h-6zM30-19h6v34h-6z':'M-34-9h68v7h-68zM-27-2h5v17h-5zM22-2h5v17h-5z'}/><rect x="-12" y={item==='diningTable'?-31:-12} width="24" height="3" fill={cream}/></g>;
    case 'wardrobe': case 'dresser': case 'cabinet': return <g><rect x="-28" y={item==='wardrobe'?-65:-35} width="56" height={item==='wardrobe'?80:50} fill={wood}/>{item==='wardrobe'?<path d="M0-62v73M-5-30v8M5-30v8" stroke={cream}/>:Array.from({length:3},(_,i)=><g key={i}><rect x="-24" y={-31+i*14} width="48" height="12" fill="#ad9275"/><rect x="-4" y={-26+i*14} width="8" height="2" fill={dark}/></g>)}</g>;
    case 'fridge': return <g><rect x="-23" y="-65" width="46" height="80" fill="#c9d5ce"/><path d="M-23-35h46M-16-56v13M-16-26v22" stroke={dark} strokeWidth="3"/></g>;
    case 'stove': return <g><rect x="-29" y="-32" width="58" height="46" fill="#b9c3bf"/><rect x="-24" y="-18" width="48" height="26" fill={dark}/><path d="M-24-28h18M6-28h18" stroke={dark} strokeWidth="4"/><rect x="-18" y="-12" width="36" height="15" fill="#8b9fa1"/></g>;
    case 'sink': return <g><path d="M-30-22h60v36h-60z" fill={wood}/><path d="M-33-29h66v9h-66z" fill={cream}/><path d="M-17-27h34v6h-34zM-2-41h12v13" fill="#9caeae" stroke="#9caeae" strokeWidth="4"/></g>;
    case 'computer': return <g><path d="M-27-46h54v34h-54zM-3-12h6v14h-6zM-19 2h38v4h-38z" fill={dark}/><path d="M-23-42h46v26h-46z" fill="#809fa4"/><path d="M-29 8h58v6h-58z" fill="#b4bcb5"/><path d="M-17-35h12v3h-12zM-17-28h28v3h-28z" fill={cream}/></g>;
    case 'radio': return <g><rect x="-27" y="-25" width="54" height="35" fill={wood}/><rect x="-22" y="-20" width="24" height="25" fill={dark}/><path d="M7-18h14v6H7zM10 0h7v5h-7z" fill={cream}/><path d="M12-25l14-20" stroke={dark} strokeWidth="2"/></g>;
    case 'recordPlayer': return <g><rect x="-30" y="-16" width="60" height="27" fill={wood}/><ellipse cy="-12" rx="23" ry="10" fill={dark}/><ellipse cy="-12" rx="5" ry="3" fill="#b88972"/><path d="M25-21v10l-14 5" stroke={cream} strokeWidth="3" fill="none"/></g>;
    case 'guitar': case 'violin': return <g transform={item==='violin'?'scale(.75)':''}><path d="M-4-58h8v38h-8z" fill={wood}/><path d="M-8-26h16l8 10-4 9 8 8v15h-40V1l8-8-4-9z" fill={item==='violin'?'#9a633e':'#c89e62'}/><rect x="-4" y="-8" width="8" height="8" fill={dark}/><path d="M0-52v59" stroke={cream}/></g>;
    case 'drums': return <g><ellipse cy="-7" rx="23" ry="24" fill="#a76d60"/><ellipse cy="-7" rx="19" ry="20" fill={cream}/><path d="M-32-35v47M30-35v47M-40-34h24M18-34h24" stroke={wood} strokeWidth="3"/><rect x="-39" y="-32" width="21" height="14" fill="#a76d60"/></g>;
    case 'easel': case 'canvas': return <g>{item==='easel'&&<path d="M0-64l-25 80M0-64l25 80" stroke={wood} strokeWidth="5"/>}<rect x="-25" y="-49" width="50" height="43" fill={wood}/><rect x="-21" y="-45" width="42" height="35" fill={cream}/><path d="M-18-13l13-17 10 9 13-19v27z" fill="#7a9a8c"/><rect x="-12" y="-39" width="7" height="7" fill="#d7b26a"/></g>;
    case 'flowers': return <g><path d="M-9-10h18l-3 24H-6z" fill="#87a4aa"/><path d="M0-9v-30M0-12l-15-13M0-17l15-18" stroke={green} strokeWidth="3"/>{[-15,0,15].map((x,i)=><g key={x}><rect x={x-7} y={-31-i%2*12} width="14" height="12" fill={['#c58b98','#dcb76d','#b7a1c1'][i]}/><rect x={x-2} y={-27-i%2*12} width="4" height="4" fill={cream}/></g>)}</g>;
    case 'plantTall': case 'bonsai': return <g><path d="M-18 0h36l-5 16h-26z" fill="#b68166"/><path d={item==='plantTall'?'M-3-64h6V1h-6z':'M-3-35h6V1h-6zM0-20l17-13'} stroke={wood} strokeWidth="4" fill={wood}/>{(item==='plantTall'?[-58,-40,-20]:[-35,-23]).map((y,i)=><rect key={y} x={i%2?-24:-5} y={y} width="30" height="17" fill={green}/>)}</g>;
    case 'aquarium': return <g><path d="M-34-40h68v48h-68z" fill={wood}/><rect x="-30" y="-36" width="60" height="37" fill="#83b6bb"/><path d="M-27-6l5-15 6 15M17-3l5-21 4 21" stroke={green} strokeWidth="3" fill="none"/><path d="M-8-24h12v6H-8zM4-24l6-4v14l-6-4" fill="#dca668"/><path d="M-30 2h60v4h-60z" fill="#cbbb90"/></g>;
    case 'catBed': case 'dogBed': return <g><ellipse cy="5" rx="30" ry="13" fill="#b38983"/><ellipse cy="3" rx="24" ry="9" fill={cream}/><path d="M-15-8h27v13h-27zM-20-15h15v14h-15z" fill="#998275"/>{item==='catBed'?<path d="M-20-15v-8l6 8M-12-15l7-8v8" fill="#998275"/>:<path d="M-23-15h6v15h-6z" fill={dark}/>}<rect x="-17" y="-11" width="3" height="3" fill={dark}/></g>;
    case 'bicycle': return <g stroke={dark} fill="none" strokeWidth="3"><circle cx="-24" r="17"/><circle cx="24" r="17"/><path d="M-24 0l15-26L4 0h-28L-5-18h24L4 0M24 0l-10-34h9M-16-27h16" stroke="#6e8b85"/></g>;
    case 'telescope': return <g><path d="M0-20v38M0-20l-22 38M0-20l22 38" stroke={wood} strokeWidth="3"/><path d="M-25-24l47-28 9 14-47 28z" fill="#9caeaf"/><path d="M20-53l8-5 12 21-8 5z" fill={dark}/></g>;
    case 'globe': return <g><circle cy="-23" r="24" fill="#85adb4"/><path d="M-18-39l14 3 7 12-12 9-6-8zM8-13l13-7-5 14-9 6z" fill={green}/><path d="M-25-45q-17 42 24 48M0 3v11M-17 14h34" stroke={wood} strokeWidth="4" fill="none"/></g>;
    case 'calendar': return <g><rect x="-24" y="-37" width="48" height="45" fill={cream}/><rect x="-24" y="-37" width="48" height="10" fill="#b57872"/>{Array.from({length:12},(_,i)=><rect key={i} x={-17+i%4*10} y={-20+Math.floor(i/4)*8} width="4" height="3" fill={dark}/>)}</g>;
    case 'mirror': return <g><rect x="-22" y="-51" width="44" height="63" fill={wood}/><rect x="-17" y="-46" width="34" height="53" fill="#b3c8cc"/><path d="M-12-20l20-20M-8-4l20-20" stroke="#d8e4df" strokeWidth="4"/></g>;
    case 'fireplace': return <g><path d="M-34-44h68v59h-68z" fill="#a2816c"/><path d="M-39-48h78v8h-78z" fill={cream}/><path d="M-25-28h50v43h-50z" fill={dark}/><path d="M-20 10l7-24 10 14 9-19 14 29z" fill="#c77f50"/><path d="M-9 11L0-6l9 17z" fill="#e8bf6c"/></g>;
    default:return null;
  }
}
export function Wallpaper({room}:{room:Room}) {
 const w=room.wall;
 return <><rect width="16" height="16" fill={w==='blue'?'#d4e2e2':w==='starry'?'#35465e':w==='woodPanels'?'#b29375':w==='brick'?'#b99784':'#ece5d6'}/>{w==='stripes'?<path d="M2 0v16" stroke="#d4cab6" strokeWidth="3"/>:w==='dots'?<rect x="7" y="7" width="2" height="2" fill="#c5b99d"/>:w==='gingham'?<path d="M4 0v16M0 4h16" stroke="#c7a99c" opacity=".5" strokeWidth="6"/>:w==='whiteTiles'?<path d="M0 0h16v16" fill="none" stroke="#ccc7bc"/>:w==='flowers'?<><path d="M8 8v6" stroke={green}/><path d="M5 4h6v6H5zM3 6h10v2H3z" fill="#c5959f"/><rect x="7" y="6" width="2" height="2" fill="#d9bd7d"/></>:w==='woodPanels'?<path d="M0 0v16M5 4v8M12 0v5" stroke="#8f735d"/>:w==='brick'?<path d="M0 0h16M0 8h16M8 0v8M0 8v8" stroke="#d7c5ad"/>:w==='hanji'?<path d="M2 3h4M10 5v3M5 12h5M13 13h2" stroke="#cfbea0" opacity=".5"/>:w==='starry'?<path d="M3 3h2v2H3zM12 11h2v2h-2z" fill="#e6d3a2"/>:null}</>;
}
export const isNightView=(view:string)=>['night','cityNight','moon','fireflies','snowNight'].includes(view);
const rnd=(i:number)=>{let h=Math.imul(i+1,2654435761);h=Math.imul(h^(h>>>15),2246822519);h=Math.imul(h^(h>>>13),3266489917);return ((h^(h>>>16))>>>0)/4294967296;};
const SKY:Record<string,string[]>={day:['#8dbfd8','#a3cee0','#badbe5','#d3e7e8'],sunset:['#6f6694','#bd7e9b','#e3a283','#f3cf97'],rain:['#77899a','#8697a3','#94a5ad','#a3b3b8'],snow:['#aec2d0','#bfd0da','#cfdce3','#dfe8eb'],night:['#1c2645','#243256','#2e4066','#3a5076']};
function Pine({x,b,h,c,snow=false}:{x:number;b:number;h:number;c:string;snow?:boolean}){const w=h*.36;return <g><rect x={x-1} y={b-3} width="2" height="4" fill="#5b4433"/><path d={`M${x} ${b-h}L${x+w*.6} ${b-h*.55}H${x+w*.3}L${x+w} ${b-2}H${x-w}L${x-w*.3} ${b-h*.55}H${x-w*.6}z`} fill={c}/>{snow&&<path d={`M${x} ${b-h}L${x+w*.35} ${b-h*.75}H${x-w*.35}zM${x-w*.55} ${b-h*.5}h${w*1.1}v2h${-w*1.1}z`} fill="#f4f7f6"/>}</g>;}
function Crown({x,b,r,c,hi}:{x:number;b:number;r:number;c:string;hi:string}){return <g><rect x={x-1.5} y={b-r} width="3" height={r} fill="#6b4f3a"/><ellipse cx={x} cy={b-r*1.35} rx={r} ry={r*.85} fill={c}/><ellipse cx={x-r*.3} cy={b-r*1.6} rx={r*.45} ry={r*.35} fill={hi}/></g>;}
export function WindowView({view}:{view:string}) {
 const night=isNightView(view), snow=['snow','snowNight'].includes(view), city=['city','cityNight'].includes(view);
 const sky=SKY[night?'night':view==='sunset'?'sunset':view==='rain'?'rain':view==='snow'?'snow':'day'];
 const far=night?(snow?'#9fb0c4':'#34495d'):snow?'#cfdce2':view==='autumn'?'#bda27c':view==='sunset'?'#8f7590':view==='rain'?'#8b9d99':'#94b6a2';
 const near=night?(snow?'#c7d3e0':'#283c4b'):snow?'#eef3f3':view==='autumn'?'#ae874f':view==='sunset'?'#5f5470':view==='rain'?'#6c8377':view==='summer'?'#69a35d':'#6f9b70';
 const cloud=(x:number,y:number,k=1)=><path key={`${x}${y}`} d={`M${x} ${y}h${18*k}v-3h${-3*k}v-3h${-5*k}v-2h${-5*k}v2h${-3*k}v3h${-2*k}z`} fill={view==='sunset'?'#f6d5c0':view==='rain'?'#c3ccd0':'#fbfdfc'} opacity={view==='rain'?.75:.9}/>;
 return <>
  {sky.map((c,i)=><rect key={c} x="35" y={45+i*17} width="115" height={i===3?40:17} fill={c}/>)}
  {night&&Array.from({length:26},(_,i)=><rect key={i} x={37+Math.floor(rnd(i)*111)} y={47+Math.floor(rnd(i+40)*58)} width={i%5?1:2} height={i%5?1:2} fill="#f2ecd2" opacity={.5+rnd(i+80)*.5}/>)}
  {(view==='moon'||view==='night'||view==='cityNight'||view==='snowNight')&&<g><circle cx="124" cy="64" r={view==='moon'?14:8} fill="#f3ecd0" opacity=".18"/><circle cx="124" cy="64" r={view==='moon'?10:5} fill="#f1e8c6"/>{view==='moon'&&<path d="M119 59h3v3h-3zM126 66h4v3h-4zM121 69h2v2h-2z" fill="#d8cca2"/>}</g>}
  {!night&&!['rain','snow'].includes(view)&&<g><circle cx={view==='sunset'?96:124} cy={view==='sunset'?106:62} r={view==='sunset'?16:11} fill="#fff4c8" opacity=".35"/><circle cx={view==='sunset'?96:124} cy={view==='sunset'?106:62} r={view==='sunset'?10:6} fill={view==='sunset'?'#f7c47a':'#fbe7a1'}/></g>}
  {!night&&[cloud(44,66),cloud(84,57,1.3),view==='rain'&&cloud(112,70,1.4),view==='rain'&&cloud(60,80,1.2)]}
  {view==='sea'?<g>
   <rect x="35" y="110" width="115" height="47" fill="#5f97ab"/><rect x="35" y="110" width="115" height="4" fill="#86b6c4"/>
   {Array.from({length:9},(_,i)=><rect key={i} x={38+Math.floor(rnd(i+3)*100)} y={117+Math.floor(rnd(i+11)*36)} width={6+(i%3)*4} height="1" fill="#cfe5e6" opacity=".8"/>)}
   <path d="M112 132h20l-3 4h-14z" fill="#6b4c3a"/><path d="M121 112v19h-9zM123 115v16h7z" fill="#f6f2e6"/>
   <path d="M60 78l3 2 3-2M70 74l2 2 2-2" stroke="#4a5b66" fill="none"/>
  </g>:city?<g>
   <path d="M35 108h115v49H35z" fill={night?'#2f4152':'#a6bcc0'}/>
   {[[33,14,52],[49,12,38],[63,18,60],[83,13,44],[98,16,66],[116,12,40],[130,20,54]].map(([x,w,h],i)=><g key={i}>
    <rect x={x} y={157-h} width={w} height={h} fill={night?(i%2?'#3c4f61':'#33465a'):(i%2?'#8ca7ad':'#7d989f')}/>
    <rect x={x+w-3} y={157-h} width="3" height={h} fill="#000" opacity=".14"/>
    {Array.from({length:Math.floor(h/8)*Math.floor((w-4)/5)},(_,j)=>{const cols=Math.floor((w-4)/5);return <rect key={j} x={x+3+(j%cols)*5} y={157-h+4+Math.floor(j/cols)*8} width="2" height="3" fill={night?(rnd(i*31+j)>.45?'#f0cf7c':'#283848'):'#d7e6e6'} opacity={night?1:.7}/>;})}
   </g>)}
  </g>:<g>
   <path d="M35 112l12-9 13 5 15-11 17 9 15-7 18 8 11-5 14 6v49H35z" fill={far}/>
   <path d="M35 126l18-8 21 5 22-10 23 8 18-7 13 4v39H35z" fill={near}/>
   {view==='countryside'&&<g><path d="M35 138l115-10M35 146l115-10M35 154l115-9" stroke="#8fb47e" strokeWidth="2"/><rect x="104" y="114" width="18" height="11" fill="#efe4cc"/><path d="M101 115l12-9 12 9z" fill="#b5564b"/><rect x="111" y="119" width="4" height="6" fill="#6b4f3a"/><rect x="106" y="117" width="3" height="3" fill="#8fb3c6"/><path d="M37 132h40M40 129v6M50 129v6M60 128v6M70 128v6" stroke="#8d6d52"/></g>}
   {(view==='forest'||view==='night'||snow)&&[44,58,72,90,106,122,140].map((x,i)=><Pine key={x} x={x} b={128+(i%3)*6} h={20+(i%2)*9} c={night&&!snow?'#1e3140':i%2?'#3f6a50':'#4e7a5b'} snow={snow}/>)}
   {(view==='summer'||view==='blossoms'||view==='autumn')&&[48,74,104,132].map((x,i)=><Crown key={x} x={x} b={134+(i%2)*8} r={9+(i%2)*2} c={view==='blossoms'?(i%2?'#e2a8b9':'#d796ab'):view==='autumn'?(i%2?'#d08a43':'#bf5f3d'):(i%2?'#5f9a52':'#4f8a48')} hi={view==='blossoms'?'#f3cfd8':view==='autumn'?'#e7b35c':'#86bb6c'}/>)}
   {(view==='blossoms'||view==='autumn')&&Array.from({length:12},(_,i)=><rect key={i} x={38+Math.floor(rnd(i+5)*108)} y={60+Math.floor(rnd(i+17)*90)} width="2" height="2" fill={view==='blossoms'?'#f2c3cf':'#d9874a'}/>)}
   {view==='snowNight'&&<g><rect x="104" y="128" width="16" height="10" fill="#6b5446"/><path d="M101 129l11-8 11 8z" fill="#eef2f4"/><rect x="108" y="131" width="4" height="3" fill="#f3c86e"/><circle cx="110" cy="132" r="7" fill="#f3c86e" opacity=".2"/></g>}
   {view==='fireflies'&&<g><path d="M38 157v-5M44 157v-7M58 157v-4M80 157v-6M96 157v-5M118 157v-7M136 157v-5" stroke="#3d5a48" strokeWidth="2"/>{Array.from({length:10},(_,i)=>{const x=40+Math.floor(rnd(i+2)*104),y=96+Math.floor(rnd(i+9)*56);return <g key={i}><circle cx={x+1} cy={y+1} r="4" fill="#e9ea9a" opacity=".22"/><rect x={x} y={y} width="2" height="2" fill="#f2f1a8"/></g>;})}</g>}
  </g>}
  {view==='rain'&&Array.from({length:30},(_,i)=><path key={i} d={`M${38+Math.floor(rnd(i)*110)} ${47+Math.floor(rnd(i+50)*104)}l-2 7`} stroke="#dde6ea" opacity=".7"/>)}
  {snow&&Array.from({length:24},(_,i)=><rect key={i} x={37+Math.floor(rnd(i+7)*110)} y={47+Math.floor(rnd(i+70)*106)} width="2" height="2" fill="#fbfcfc" opacity=".9"/>)}
  <path d="M44 157L92 45h14L58 157zM66 157L114 45h5L71 157z" fill="#fff" opacity=".09"/>
 </>;
}
/** A small shaded pixel figure for the memorial room, drawn from the top-left of the head (14 × 46). */
export function RoomPerson({shirt,skin,hair,long=false}:{shirt:string;skin:string;hair:string;long?:boolean}) {
 return <g>
  {long&&<path d="M-1 3h16v14h-3V8H2v9h-3z" fill={hair}/>}
  <path d="M2 1h10v1h1v1h1v9h-1v1h-1v1H2v-1H1v-1H0V3h1V2h1z" fill={skin}/>
  <path d="M10 2h2v1h1v1h1v8h-1v1h-1v1h-2z" fill="#3a2414" opacity=".14"/>
  <path d="M1 0h12v1h1v5h-2V4H8v1H3v1H2v2H0V1h1z" fill={hair}/>
  <path d="M3 1h4v1H3z" fill="#fff" opacity=".28"/>
  <path d="M4 7h2v2H4zM8 7h2v2H8z" fill="#2b2420"/>
  <path d="M4 7h1v1H4zM8 7h1v1H8z" fill="#fff" opacity=".85"/>
  <path d="M2 10h2v1H2zM10 10h2v1h-2z" fill="#e3837a" opacity=".55"/>
  <path d="M6 11h2v1H6z" fill="#9b5446"/>
  <path d="M5 14h4v2H5z" fill={skin}/><path d="M5 14h4v1H5z" fill="#3a2414" opacity=".2"/>
  <path d="M1 16h12v1h1v1h1v12H-1V18h1v-1h1z" fill={shirt}/>
  <path d="M10 16h3v1h1v1h1v12h-5z" fill="#140c06" opacity=".2"/>
  <path d="M1 17h3v13H1z" fill="#fff" opacity=".14"/>
  <path d="M5 16h4v1h-1v1H6v-1H5z" fill="#fff" opacity=".4"/>
  <path d="M-3 18h2v9h-2zM15 18h2v9h-2z" fill={shirt}/><path d="M15 18h2v9h-2z" fill="#140c06" opacity=".22"/>
  <path d="M-3 27h2v3h-2zM15 27h2v3h-2z" fill={skin}/>
  <path d="M1 30h5v12H1zM8 30h5v12H8z" fill="#454b57"/><path d="M4 30h2v12H4zM11 30h2v12h-2z" fill="#140c06" opacity=".22"/>
  <path d="M0 42h6v3H0zM8 42h6v3H8z" fill="#2c2622"/><path d="M1 42h3v1H1zM9 42h3v1H9z" fill="#fff" opacity=".18"/>
 </g>;
}
