import type{Life}from'./types';
import{hobbyCreditLimit,hobbySpendingFinance,type HobbySpendingFinance}from'./hobby-spending';
export interface HobbyPurchasePlan {kind:'cash'|'credit'|'unknown'|'unavailable';availableCash:number;borrowed:number;investmentDraw:number}
/** Source money is signed; investments are liquid, whereas a home only supports the credit limit. */
export function hobbyPurchaseFromFinance(f:HobbySpendingFinance,shopIncome:number,price:number):HobbyPurchasePlan{
 const money=f.savings-f.debt,availableCash=Math.max(0,money)+f.investments;
 const result=(kind:HobbyPurchasePlan['kind']):HobbyPurchasePlan=>({kind,availableCash,borrowed:kind==='credit'?Math.max(0,price-availableCash):0,investmentDraw:kind==='cash'||kind==='credit'?Math.min(f.investments,Math.max(0,price-Math.max(0,money))):0});
 if(!Number.isFinite(price)||price<0)return result('unavailable');
 // A purchase must remain fully charged after the engine normalizes saveable balances.
 const draw=Math.min(f.investments,Math.max(0,price-Math.max(0,money)));
 if(money+draw-price < -1e12)return result('unavailable');
 if(availableCash+1e-8>=price)return result('cash');
 if(price>Math.max(0,shopIncome)*.2+1e-8)return result('unavailable');
 const outcomes=(f.formal===null?[false,true]:[f.formal]).map(formal=>money+f.investments-price+1e-8>=-hobbyCreditLimit(f,formal)*.9);
 return result(outcomes.every(Boolean)?'credit':outcomes.some(Boolean)?'unknown':'unavailable');
}
export function hobbyPurchasePlan(life:Life,price:number):HobbyPurchasePlan{
 const spouse=life.family.married&&life.relationship.status==='married'&&life.family.partner?.alive?Math.max(0,life.relationship.partnerIncome):0;
 return hobbyPurchaseFromFinance(hobbySpendingFinance(life),Math.max(0,life.stats.annualIncome)+spouse,price);
}
export const hobbyPurchaseAllowed=(plan:HobbyPurchasePlan)=>plan.kind==='cash'||plan.kind==='credit';
/** Caller first validates the game action; refused plans leave its clone untouched. */
export function payHobbyPurchase(life:Life,price:number):boolean{
 const plan=hobbyPurchasePlan(life,price);if(!hobbyPurchaseAllowed(plan))return false;
 const money=life.stats.savings-life.stats.debt+plan.investmentDraw-price;
 life.stats.investments-=plan.investmentDraw;life.stats.savings=Math.max(0,money);life.stats.debt=Math.max(0,-money);return true;
}
