export function chartSeries(values:(number|null)[],includeZero=true){
 const finite=values.filter((v):v is number=>v!==null&&Number.isFinite(v));
 const low=Math.min(...finite,...(includeZero||!finite.length?[0]:[])),high=Math.max(...finite,...(includeZero||!finite.length?[0]:[]));
 const min=high===low?low-1:low,max=high===low?high+1:high,span=max-min;
 const x=(i:number)=>65+i*455/Math.max(1,values.length-1),y=(v:number)=>180-(v-min)*145/span;
 let path='',drawing=false;values.forEach((v,i)=>{if(v===null||!Number.isFinite(v)){drawing=false;return;}path+=`${drawing?'L':'M'}${x(i).toFixed(2)},${y(v).toFixed(2)} `;drawing=true;});
 return {min,max,path,x,y};
}
