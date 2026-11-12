/** Observed willingness to share household costs, distinct from older-parent support. */
export interface ChildBoardReceipt { year:number; willing:boolean }
export interface BoardChild {
 id:string;alive:boolean;age:number;home:boolean;abroad:boolean;away:boolean;placed:boolean;
 working:boolean;university:boolean;withdrawn:boolean;receipt?:ChildBoardReceipt;
}
export function childBoard(parent:{age:number;retired:boolean;region:string;medianIncome:number;year:number},children:readonly BoardChild[],random:()=>number) {
 const observations:{id:string;receipt:ChildBoardReceipt}[]=[];
 const payments:{id:string;amount:number}[]=[];
 if(parent.age>=60||parent.retired)return {observations,payments};
 for(const child of children){
  if(!child.alive||child.age<20||!child.home||child.abroad||child.away||child.placed||!child.working||child.university&&child.age<23||child.withdrawn)continue;
  let receipt=child.receipt;
  if(!receipt){receipt={year:parent.year,willing:random()<(parent.region==='hi'?.5:.7)};observations.push({id:child.id,receipt});}
  if(receipt.willing&&payments.length<2)payments.push({id:child.id,amount:parent.medianIncome*(parent.region==='hi'?.015:.025)});
 }
 return {observations,payments};
}
