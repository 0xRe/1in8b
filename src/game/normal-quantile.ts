const polynomial=(coefficients:number[],x:number)=>coefficients.reduce((value,c)=>value*x+c,0);
/** Acklam's inverse-normal rational approximation; probabilities are interior. */
export function normalQuantile(p:number):number {
 const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239];
 const b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572,1];
 const c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783];
 const d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416,1];
 if(p<.02425||p>1-.02425){const q=Math.sqrt(-2*Math.log(p<.5?p:1-p));return (p<.5?1:-1)*polynomial(c,q)/polynomial(d,q);}
 const q=p-.5,r=q*q;return polynomial(a,r)*q/polynomial(b,r);
}
